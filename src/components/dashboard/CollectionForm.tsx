"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { monthKeyFromDate } from "@/lib/financial/month";

type Head = { id: string; name: string };

export default function CollectionForm(props: {
  incomeHeads: Head[];
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
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [month, setMonth] = useState(monthKeyFromDate(new Date(todayISO + "T00:00:00")));
  const [feeHeadId, setFeeHeadId] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Keep month in sync with date.
    const d = new Date(date + "T00:00:00");
    setMonth(monthKeyFromDate(d));
  }, [date]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          studentName,
          className,
          month,
          feeHeadId,
          amountReceived,
          remainingAmount,
          remarks: remarks || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create collection");
      // Reset only entry-specific fields.
      setStudentName("");
      setClassName("");
      setFeeHeadId("");
      setAmountReceived(0);
      setRemainingAmount(0);
      setRemarks("");
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

        <label className="block">
          <div className="text-sm font-medium text-zinc-700 mb-1">Month</div>
          <select
            value={month}
            onChange={(e) => {
              const v = e.target.value;
              setMonth(v);
              setDate(`${v}-01`);
            }}
            className="w-full rounded-xl border px-3 py-2 bg-white"
          >
            {props.monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-zinc-700 mb-1">Student Name</div>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-white"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="e.g. John Doe"
            required
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium text-zinc-700 mb-1">Class</div>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-white"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. 10-A"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <div className="text-sm font-medium text-zinc-700 mb-1">Fee Head</div>
          <select
            className="w-full rounded-xl border px-3 py-2 bg-white"
            value={feeHeadId}
            onChange={(e) => setFeeHeadId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select head...
            </option>
            {props.incomeHeads.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-zinc-700 mb-1">Amount Received</div>
          <input
            type="number"
            step="0.01"
            value={amountReceived}
            onChange={(e) => setAmountReceived(Number(e.target.value))}
            className="w-full rounded-xl border px-3 py-2 bg-white"
            required
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium text-zinc-700 mb-1">Remaining Amount</div>
          <input
            type="number"
            step="0.01"
            value={remainingAmount}
            onChange={(e) => setRemainingAmount(Number(e.target.value))}
            className="w-full rounded-xl border px-3 py-2 bg-white"
            required
          />
        </label>

        <label className="block sm:col-span-2">
          <div className="text-sm font-medium text-zinc-700 mb-1">Remarks</div>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-white"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-zinc-900 text-white px-4 py-3 font-medium disabled:opacity-60"
      >
        {loading ? "Saving..." : "Add Collection"}
      </button>
    </form>
  );
}

