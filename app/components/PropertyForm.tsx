"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/lib/types";
import { NEIGHBORHOODS, PROPERTY_TYPES, STATUSES } from "@/lib/constants";

type Props = { initial?: Property };

export default function PropertyForm({ initial }: Props) {
  const router = useRouter();
  const editing = !!initial;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng }
      : null
  );
  const [linkUrl, setLinkUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);

  // Live elapsed-seconds counter while the listing is being fetched
  useEffect(() => {
    if (!extracting) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [extracting]);

  const [form, setForm] = useState({
    address: initial?.address ?? "",
    neighborhood: initial?.neighborhood ?? "Fishtown",
    propertyType: initial?.propertyType ?? "Land",
    status: initial?.status ?? "Watching",
    price: initial?.price != null ? String(initial.price) : "",
    sizeText: initial?.sizeText ?? "",
    zoning: initial?.zoning ?? "",
    mls: initial?.mls ?? "",
    listingUrl: initial?.listingUrl ?? "",
    brokerName: initial?.brokerName ?? "",
    brokerContact: initial?.brokerContact ?? "",
    addedBy: initial?.addedBy ?? "",
    notes: initial?.notes ?? "",
  });

  function set(key: keyof typeof form, value: string) {
    // Editing the address invalidates any auto-extracted coordinates
    if (key === "address") setCoords(null);
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleExtract(u?: string) {
    const target = (u ?? linkUrl).trim();
    if (!/^https?:\/\//i.test(target)) {
      setExtractMsg("Paste a full listing URL (starts with https://).");
      return;
    }
    setExtracting(true);
    setExtractMsg(null);
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(target)}`);
      const j = await res.json();
      if (!res.ok) {
        setExtractMsg(j.error || "Couldn't read that link.");
        return;
      }
      setForm((f) => ({
        ...f,
        address: j.address ?? f.address,
        listingUrl: j.listingUrl ?? target,
        propertyType: j.propertyType ?? f.propertyType,
        neighborhood: j.neighborhood ?? f.neighborhood,
        price: j.price != null ? String(j.price) : f.price,
        sizeText: j.sizeText ?? f.sizeText,
        zoning: j.zoning ?? f.zoning,
        mls: j.mls ?? f.mls,
        brokerName: j.brokerName ?? f.brokerName,
        notes: j.notes ?? f.notes,
      }));
      if (j.lat != null && j.lng != null) setCoords({ lat: j.lat, lng: j.lng });
      setExtractMsg(
        j.enriched
          ? `✓ ${j.source ?? "Listing"}: pulled full details${
              j.geocoded ? " and dropped the pin" : ""
            }. Review and save.`
          : `✓ ${j.source ?? "Listing"}: pulled the address${
              j.geocoded ? " and dropped the pin" : ""
            }. Add the price & details below.`
      );
    } catch {
      setExtractMsg("Couldn't reach the extractor. Try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.address.trim()) {
      setError("Address is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/properties/${initial!.id}` : "/api/properties",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            price: form.price === "" ? null : Number(form.price),
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
          }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      const saved = await res.json();
      router.push(`/properties/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this property? This cannot be undone.")) return;
    setSaving(true);
    await fetch(`/api/properties/${initial!.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!editing && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            const u =
              e.dataTransfer.getData("text/uri-list") ||
              e.dataTransfer.getData("text/plain");
            if (u) {
              setLinkUrl(u.trim());
              handleExtract(u.trim());
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-4"
        >
          <div className="mb-1 text-sm font-semibold text-neutral-900">
            ⚡ Add from a Zillow / LoopNet / Redfin link
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              value={linkUrl}
              placeholder="Paste or drag a listing link here…"
              onChange={(e) => setLinkUrl(e.target.value)}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text");
                if (/^https?:\/\//i.test(t.trim()))
                  setTimeout(() => handleExtract(t.trim()), 0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleExtract();
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleExtract()}
              disabled={extracting}
              className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
            >
              {extracting ? `Reading… ${elapsed}s` : "Fetch"}
            </button>
          </div>
          {extracting && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
              Searching listings across the web — usually 20–60s. Hang tight.
            </p>
          )}
          {!extracting && extractMsg && (
            <p
              className={`mt-2 text-xs ${
                extractMsg.startsWith("✓")
                  ? "text-green-700"
                  : "text-amber-700"
              }`}
            >
              {extractMsg}
            </p>
          )}
          <p className="mt-1 text-[11px] text-neutral-400">
            Pulls price, size, beds/baths, MLS, broker &amp; type from any
            listing (Zillow, LoopNet, Crexi, Redfin) and drops the pin. Takes a
            few seconds — review before saving.
          </p>
        </div>
      )}

      <Field label="Address" required>
        <input
          className="input"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="1140 Frankford Ave, Philadelphia, PA 19125"
        />
        <p className="mt-1 text-xs text-neutral-400">
          We&apos;ll auto-place this on the map from the address.
        </p>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Type">
          <select
            className="input"
            value={form.propertyType}
            onChange={(e) => set("propertyType", e.target.value)}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Neighborhood">
          <select
            className="input"
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
          >
            {NEIGHBORHOODS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Price ($)">
          <input
            className="input"
            type="number"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="89900"
          />
        </Field>
        <Field label="Size">
          <input
            className="input"
            value={form.sizeText}
            onChange={(e) => set("sizeText", e.target.value)}
            placeholder="6,753 SF or 0.12 acres"
          />
        </Field>
        <Field label="Zoning">
          <input
            className="input"
            value={form.zoning}
            onChange={(e) => set("zoning", e.target.value)}
            placeholder="CMX-2.5"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="MLS #">
          <input
            className="input"
            value={form.mls}
            onChange={(e) => set("mls", e.target.value)}
            placeholder="PAPH2597028"
          />
        </Field>
        <Field label="Listing URL (Zillow / LoopNet)">
          <input
            className="input"
            value={form.listingUrl}
            onChange={(e) => set("listingUrl", e.target.value)}
            placeholder="https://www.loopnet.com/..."
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Broker / agent">
          <input
            className="input"
            value={form.brokerName}
            onChange={(e) => set("brokerName", e.target.value)}
            placeholder="Jared Gruber"
          />
        </Field>
        <Field label="Broker contact">
          <input
            className="input"
            value={form.brokerContact}
            onChange={(e) => set("brokerContact", e.target.value)}
            placeholder="phone / email"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          className="input min-h-[100px]"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Why this deal, condition, comps, next steps…"
        />
      </Field>

      <Field label="Added by">
        <input
          className="input"
          value={form.addedBy}
          onChange={(e) => set("addedBy", e.target.value)}
          placeholder="Your name (so partners know who added it)"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Add property"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Cancel
        </button>
        {editing && (
          <button
            type="button"
            onClick={remove}
            className="ml-auto text-sm font-medium text-red-600 hover:underline"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
