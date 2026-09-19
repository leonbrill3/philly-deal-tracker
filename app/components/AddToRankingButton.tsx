"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useManager } from "./useManager";

export default function AddToRankingButton({
  propertyId,
}: {
  propertyId: string;
}) {
  const { managerId, managerName, ready } = useManager();
  const [inList, setInList] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!managerId) return;
    fetch(`/api/rankings?managerId=${managerId}`)
      .then((r) => r.json())
      .then((data: { property: { id: string } }[]) =>
        setInList(data.some((d) => d.property.id === propertyId))
      )
      .catch(() => {});
  }, [managerId, propertyId]);

  if (!ready) return null;

  if (!managerId) {
    return (
      <Link
        href="/rankings"
        className="block rounded-lg border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
      >
        ★ Rank this deal
      </Link>
    );
  }

  async function add() {
    setBusy(true);
    await fetch("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId, propertyId }),
    });
    setInList(true);
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await fetch(
      `/api/rankings?managerId=${managerId}&propertyId=${propertyId}`,
      { method: "DELETE" }
    );
    setInList(false);
    setBusy(false);
  }

  return inList ? (
    <div className="flex items-center gap-2">
      <span className="flex-1 rounded-lg bg-green-50 px-4 py-2 text-center text-sm font-semibold text-green-700">
        ✓ In {managerName}&apos;s ranking
      </span>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
      >
        Remove
      </button>
    </div>
  ) : (
    <button
      onClick={add}
      disabled={busy}
      className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
    >
      ★ Add to {managerName}&apos;s ranking
    </button>
  );
}
