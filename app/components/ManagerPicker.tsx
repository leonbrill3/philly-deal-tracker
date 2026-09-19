"use client";

import { useEffect, useState } from "react";
import { useManager } from "./useManager";

type Manager = { id: string; name: string };

export default function ManagerPicker({
  compact = false,
  onChosen,
}: {
  compact?: boolean;
  onChosen?: () => void;
}) {
  const { managerId, managerName, ready, choose, clear } = useManager();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch("/api/managers");
    setManagers(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function addManager() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const res = await fetch("/api/managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const m = await res.json();
    setNewName("");
    setAdding(false);
    await load();
    choose(m.id, m.name);
    onChosen?.();
  }

  if (!ready) return null;

  // Already identified — show a compact chip with switch option
  if (managerId && compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">You are</span>
        <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white">
          {managerName}
        </span>
        <button
          onClick={clear}
          className="text-xs text-neutral-400 underline hover:text-neutral-700"
        >
          switch
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-neutral-900">
        Who are you?
      </div>
      <div className="flex flex-wrap gap-2">
        {managers.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              choose(m.id, m.name);
              onChosen?.();
            }}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              managerId === m.id
                ? "border-transparent bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addManager()}
          placeholder="Add a manager…"
          className="input max-w-[220px]"
        />
        <button
          onClick={addManager}
          disabled={adding || !newName.trim()}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {managerId && (
        <div className="mt-2 text-xs text-neutral-400">
          Current: {managerName} ·{" "}
          <button onClick={clear} className="underline hover:text-neutral-700">
            clear
          </button>
        </div>
      )}
    </div>
  );
}
