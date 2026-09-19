"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Property } from "@/lib/types";
import { TYPE_COLORS, formatPrice } from "@/lib/constants";
import ManagerPicker from "./ManagerPicker";
import { useManager } from "./useManager";

type Manager = { id: string; name: string };
type Row = {
  property: Property;
  points: number;
  voters: number;
  positions: Record<string, number>;
};

export default function RankingsBoard({
  allProperties,
  managers,
  rows,
}: {
  allProperties: Property[];
  managers: Manager[];
  rows: Row[];
}) {
  const router = useRouter();
  const { managerId, managerName, ready } = useManager();
  const [myList, setMyList] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [addId, setAddId] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const loadMine = useCallback(async () => {
    if (!managerId) return;
    setLoading(true);
    const res = await fetch(`/api/rankings?managerId=${managerId}`);
    const data = (await res.json()) as { property: Property }[];
    setMyList(data.map((d) => d.property));
    setLoading(false);
  }, [managerId]);

  useEffect(() => {
    if (managerId) loadMine();
    else setMyList([]);
  }, [managerId, loadMine]);

  async function persist(order: string[]) {
    await fetch("/api/rankings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId, order }),
    });
    router.refresh(); // refresh the server-computed leaderboard
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = myList.findIndex((p) => p.id === active.id);
    const newI = myList.findIndex((p) => p.id === over.id);
    const next = arrayMove(myList, oldI, newI);
    setMyList(next);
    await persist(next.map((p) => p.id));
  }

  async function addToList() {
    if (!addId || !managerId) return;
    const prop = allProperties.find((p) => p.id === addId);
    if (!prop || myList.some((p) => p.id === addId)) return;
    const next = [...myList, prop];
    setMyList(next);
    setAddId("");
    await fetch("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId, propertyId: addId }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    const next = myList.filter((p) => p.id !== id);
    setMyList(next);
    await persist(next.map((p) => p.id));
  }

  const notYetRanked = allProperties.filter(
    (p) => !myList.some((m) => m.id === p.id)
  );

  if (!ready) return null;

  return (
    <div className="space-y-8">
      {/* Identity */}
      {!managerId ? (
        <ManagerPicker />
      ) : (
        <ManagerPicker compact />
      )}

      {/* My ranked shortlist */}
      {managerId && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {managerName}&apos;s ranking
            </h2>
            <span className="text-xs text-neutral-400">
              Drag to reorder · #1 = top pick
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <select
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
              className="input max-w-sm"
            >
              <option value="">+ Add a property to your ranking…</option>
              {notYetRanked.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address} — {p.propertyType} · {formatPrice(p.price)}
                </option>
              ))}
            </select>
            <button
              onClick={addToList}
              disabled={!addId}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {myList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-400">
              {loading
                ? "Loading…"
                : "Your ranking is empty — add the deals you like above, then drag to order them."}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={myList.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {myList.map((p, i) => (
                    <SortableRow
                      key={p.id}
                      property={p}
                      rank={i + 1}
                      onRemove={() => remove(p.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>
      )}

      {/* Consensus leaderboard */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Consensus leaderboard</h2>
          <span className="text-xs text-neutral-400">
            Combined from every manager&apos;s ranking (Borda points)
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-400">
            No rankings yet. Add some above to build the leaderboard.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Property</th>
                  <th className="px-3 py-2.5 text-right">Points</th>
                  <th className="px-3 py-2.5 text-center">Managers</th>
                  {managers.map((m) => (
                    <th
                      key={m.id}
                      className={`px-3 py-2.5 text-center ${
                        m.id === managerId ? "text-neutral-900" : ""
                      }`}
                    >
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.property.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                  >
                    <td className="px-3 py-2.5 font-bold text-neutral-400">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/properties/${r.property.id}`}
                        className="font-medium hover:underline"
                      >
                        {r.property.address}
                      </Link>
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-neutral-400">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            background:
                              TYPE_COLORS[r.property.propertyType] ?? "#6b7280",
                          }}
                        />
                        {r.property.propertyType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {r.points}
                    </td>
                    <td className="px-3 py-2.5 text-center text-neutral-500">
                      {r.voters}/{managers.length}
                    </td>
                    {managers.map((m) => (
                      <td
                        key={m.id}
                        className={`px-3 py-2.5 text-center ${
                          m.id === managerId ? "bg-neutral-50" : ""
                        }`}
                      >
                        {r.positions[m.id] ? (
                          <span className="font-semibold">
                            #{r.positions[m.id]}
                          </span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SortableRow({
  property,
  rank,
  onRemove,
}: {
  property: Property;
  rank: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: property.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : undefined,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex touch-none cursor-grab select-none items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <span
        className="px-1 text-lg leading-none text-neutral-300"
        aria-hidden
      >
        ⠿
      </span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
        {rank}
      </span>
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: TYPE_COLORS[property.propertyType] ?? "#6b7280" }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{property.address}</div>
        <div className="text-xs text-neutral-400">
          {property.propertyType} · {property.neighborhood} ·{" "}
          {formatPrice(property.price)}
        </div>
      </div>
      <Link
        href={`/properties/${property.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 text-xs font-medium text-neutral-400 hover:text-neutral-800"
      >
        Open
      </Link>
      <button
        onClick={onRemove}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 text-xs font-medium text-neutral-400 hover:text-red-600"
      >
        Remove
      </button>
    </li>
  );
}
