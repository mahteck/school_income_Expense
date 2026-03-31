"use client";

import { useCallback, useEffect, useState } from "react";

type HeadType = "income" | "expense";
type Head = { id: string; name: string; type: HeadType };

export default function HeadsManager(props: { refreshSignal: number }) {
  const [incomeHeads, setIncomeHeads] = useState<Head[]>([]);
  const [expenseHeads, setExpenseHeads] = useState<Head[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newIncomeName, setNewIncomeName] = useState("");
  const [newExpenseName, setNewExpenseName] = useState("");

  const load = useCallback(async (type: HeadType) => {
    const res = await fetch(`/api/heads?type=${encodeURIComponent(type)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to load heads");
    return (json ?? []) as Head[];
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [inc, exp] = await Promise.all([load("income"), load("expense")]);
      setIncomeHeads(inc);
      setExpenseHeads(exp);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load heads";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    loadAll();
  }, [props.refreshSignal, loadAll]);

  async function createHead(type: HeadType, name: string) {
    const res = await fetch("/api/heads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to create head");
    return json;
  }

  async function deleteHead(id: string) {
    const ok = window.confirm("Delete this head? Existing records will be blocked if referenced.");
    if (!ok) return;
    const res = await fetch(`/api/heads/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to delete");
  }

  async function saveRename(id: string, type: HeadType, name: string) {
    const res = await fetch(`/api/heads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to update");
    return json;
  }

  return (
    <div className="space-y-4">
      {errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold mb-3">Income Heads</div>
          <div className="flex gap-2 mb-3">
            <input
              className="w-full rounded-xl border px-3 py-2 bg-white"
              value={newIncomeName}
              onChange={(e) => setNewIncomeName(e.target.value)}
              placeholder="Add income head"
            />
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 text-white font-medium disabled:opacity-60"
              disabled={!newIncomeName.trim() || loading}
              onClick={async () => {
                try {
                  await createHead("income", newIncomeName.trim());
                  setNewIncomeName("");
                  await loadAll();
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Failed";
                  setErrorMsg(msg);
                }
              }}
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {incomeHeads.length === 0 ? (
              <div className="text-sm text-zinc-500">No income heads yet.</div>
            ) : (
              incomeHeads.map((h) => (
                <HeadRow
                  key={h.id}
                  head={h}
                  onDelete={() => deleteHead(h.id).then(loadAll)}
                  onRename={(name) => saveRename(h.id, "income", name).then(loadAll)}
                />
              ))
              )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold mb-3">Expense Heads</div>
          <div className="flex gap-2 mb-3">
            <input
              className="w-full rounded-xl border px-3 py-2 bg-white"
              value={newExpenseName}
              onChange={(e) => setNewExpenseName(e.target.value)}
              placeholder="Add expense head"
            />
            <button
              className="rounded-xl bg-zinc-900 px-4 py-2 text-white font-medium disabled:opacity-60"
              disabled={!newExpenseName.trim() || loading}
              onClick={async () => {
                try {
                  await createHead("expense", newExpenseName.trim());
                  setNewExpenseName("");
                  await loadAll();
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Failed";
                  setErrorMsg(msg);
                }
              }}
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {expenseHeads.length === 0 ? (
              <div className="text-sm text-zinc-500">No expense heads yet.</div>
            ) : (
              expenseHeads.map((h) => (
                <HeadRow
                  key={h.id}
                  head={h}
                  onDelete={() => deleteHead(h.id).then(loadAll)}
                  onRename={(name) => saveRename(h.id, "expense", name).then(loadAll)}
                />
              ))
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeadRow(props: {
  head: Head;
  onDelete: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.head.name);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-zinc-50 p-3">
      {editing ? (
        <input
          className="flex-1 rounded-xl border px-3 py-2 bg-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      ) : (
        <div className="flex-1 text-sm font-medium text-zinc-800">
          {props.head.name}
          <div className="text-xs text-zinc-500">{props.head.type}</div>
        </div>
      )}

      <div className="flex gap-2">
        {editing ? (
          <>
            <button
              className="rounded-lg border bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
              onClick={async () => {
                await props.onRename(name.trim());
                setEditing(false);
              }}
              disabled={!name.trim()}
            >
              Save
            </button>
            <button
              className="rounded-lg border bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="rounded-lg border bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
              onClick={() => {
                setName(props.head.name);
                setEditing(true);
              }}
            >
              Rename
            </button>
            <button
              className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-medium hover:bg-rose-50 text-rose-700"
              onClick={() => props.onDelete()}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

