"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Property } from "@/lib/types";
import {
  NEIGHBORHOODS,
  PROPERTY_TYPES,
  STATUSES,
  TYPE_COLORS,
  STATUS_COLORS,
  NEIGHBORHOOD_THESIS,
  formatPrice,
} from "@/lib/constants";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
      Loading map…
    </div>
  ),
});

type View = "map" | "list";

export default function HomeClient({ properties }: { properties: Property[] }) {
  const [view, setView] = useState<View>("map");
  const [nbhd, setNbhd] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  // Focus a specific property's pin on the map. `n` bumps on each request so
  // clicking the same row again re-triggers the pan/zoom.
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);

  // Deep-link support: /?focus=<id> (e.g. from a property detail page)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("focus");
    if (id) {
      setView("map");
      setFocus({ id, n: 1 });
    }
  }, []);

  function showOnMap(id: string) {
    setView("map");
    setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
  }

  const filtered = useMemo(
    () =>
      properties.filter(
        (p) =>
          (!nbhd || p.neighborhood === nbhd) &&
          (!type || p.propertyType === type) &&
          (!status || p.status === status)
      ),
    [properties, nbhd, type, status]
  );

  const totalValue = filtered.reduce((s, p) => s + (p.price ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Properties" value={String(filtered.length)} />
        <Stat label="Total ask" value={formatPrice(totalValue)} />
        <Stat
          label="On map"
          value={String(filtered.filter((p) => p.lat != null).length)}
        />
        <Stat
          label="Watching"
          value={String(
            filtered.filter((p) => p.status === "Watching").length
          )}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-neutral-300">
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1.5 text-sm font-medium ${
              view === "map"
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm font-medium ${
              view === "list"
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            List
          </button>
        </div>

        <Select value={nbhd} onChange={setNbhd} placeholder="All neighborhoods">
          {NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={setType} placeholder="All types">
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={setStatus} placeholder="All statuses">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        {(nbhd || type || status) && (
          <button
            onClick={() => {
              setNbhd("");
              setType("");
              setStatus("");
            }}
            className="text-sm text-neutral-500 underline hover:text-neutral-800"
          >
            Clear
          </button>
        )}

        {/* Type legend */}
        <div className="ml-auto hidden flex-wrap items-center gap-3 text-xs text-neutral-500 md:flex">
          {PROPERTY_TYPES.map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: TYPE_COLORS[t] }}
              />
              {t}
            </span>
          ))}
        </div>
      </div>

      {nbhd && NEIGHBORHOOD_THESIS[nbhd] && (
        <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-600">
          <span className="font-semibold text-neutral-900">{nbhd}:</span>{" "}
          {NEIGHBORHOOD_THESIS[nbhd]}
        </div>
      )}

      {view === "map" ? (
        <div className="h-[65vh] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <MapView
            properties={filtered}
            focusId={focus?.id}
            focusNonce={focus?.n ?? 0}
          />
        </div>
      ) : (
        <PropertyTable properties={filtered} onShowOnMap={showOnMap} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-bold">{value}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-700"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

function PropertyTable({
  properties,
  onShowOnMap,
}: {
  properties: Property[];
  onShowOnMap: (id: string) => void;
}) {
  if (!properties.length)
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
        No properties match. Try clearing filters or{" "}
        <Link href="/properties/new" className="text-blue-600 underline">
          add one
        </Link>
        .
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-4 py-2.5">Address</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Neighborhood</th>
            <th className="px-4 py-2.5">Price</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => (
            <tr
              key={p.id}
              className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
            >
              <td className="px-4 py-2.5 font-medium">
                <Link
                  href={`/properties/${p.id}`}
                  className="hover:underline"
                >
                  {p.address}
                </Link>
              </td>
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      background: TYPE_COLORS[p.propertyType] ?? "#6b7280",
                    }}
                  />
                  {p.propertyType}
                </span>
              </td>
              <td className="px-4 py-2.5 text-neutral-600">{p.neighborhood}</td>
              <td className="px-4 py-2.5 font-semibold">
                {formatPrice(p.price)}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ background: STATUS_COLORS[p.status] ?? "#6b7280" }}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-3">
                  {p.lat != null && p.lng != null && (
                    <button
                      onClick={() => onShowOnMap(p.id)}
                      className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                      title="Show this property on the map"
                    >
                      📍 Map
                    </button>
                  )}
                  <Link
                    href={`/properties/${p.id}`}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
