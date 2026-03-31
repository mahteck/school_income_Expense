"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { monthKeyFromDate } from "@/lib/financial/month";

type Head = { id: string; name: string };

export default function ExpenseForm(props: {
  expenseHeads: Head[];
  monthOptions: string[];
  onCreated: () => void;
}) {
  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const [date, setDate] = useState(todayISO);
  const [month, setMonth] = useState(monthKeyFromDate(new Date(todayISO + "T00:00:00")));
  const [expenseHeadId, setExpenseHeadId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date(date + "T00:00:00");
    setMonth(monthKeyFromDate(d));
  }, [date]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          expenseHeadId,
          amount,
          description: description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create expense");

      setExpenseHeadId("");
      setAmount(0);
      setDescription("");
      props.onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <div className="text-sm font-medium text-zinc-700 mb-1">Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 bg-white"
            required
          />
        </label>

        <label className="block sm:col-span-1">
          <div className="text-sm font-medium text-zinc-700 mb-1">Month</div>
          <select
            value={month}
            onChange={(e) => setDate(e.target.value + "-01")}
            className="w-full rounded-xl border px-3 py-2 bg-white"
          >
            {props.monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <div className="text-sm font-medium text-zinc-700 mb-1">
            Expense Head
          </div>
          <select
            className="w-full rounded-xl border px-3 py-2 bg-white"
            value={expenseHeadId}
            onChange={(e) => setExpenseHeadId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select head...
            </option>
            {props.expenseHeads.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-zinc-700 mb-1">Amount</div>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-xl border px-3 py-2 bg-white"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <div className="text-sm font-medium text-zinc-700 mb-1">
            Description
          </div>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-white"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-zinc-900 text-white px-4 py-3 font-medium disabled:opacity-60"
      >
        {loading ? "Saving..." : "Add Expense"}
      </button>
    </form>
  );
}

