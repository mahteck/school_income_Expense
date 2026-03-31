"use client";

import { useEffect, useMemo, useState } from "react";
import type { MonthlySummary } from "@/lib/financial/summary";

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    n ?? 0,
  );
}

export default function SummaryPanel(props: {
  defaultMonthKey: string;
  monthOptions: string[];
  refreshSignal: number;
}) {
  const [month, setMonth] = useState(props.defaultMonthKey);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadSummary(forMonth: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/summary?month=${encodeURIComponent(forMonth)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load summary");
      setSummary(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load summary";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary(month);
  }, [month, props.refreshSignal]);

  const monthLabel = useMemo(() => month, [month]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm text-zinc-600">Monthly Summary</div>
          <div className="text-xl font-semibold leading-6">{monthLabel}</div>
        </div>

        <label className="block min-w-[220px]">
          <div className="text-sm font-medium text-zinc-700 mb-1">Select Month</div>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 bg-white"
          >
            {props.monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {loading || !summary ? (
        <div className="rounded-xl border bg-white p-4 text-zinc-600">
          Loading summary...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-zinc-600">Total Collection</div>
              <div className="text-2xl font-semibold">{formatMoney(summary.totalReceived)}</div>
              <div className="text-xs text-zinc-500 mt-1">Received fees</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-zinc-600">Total Expenses</div>
              <div className="text-2xl font-semibold">{formatMoney(summary.totalExpenses)}</div>
              <div className="text-xs text-zinc-500 mt-1">Expenditure</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-zinc-600">Remaining Balance</div>
              <div className="text-2xl font-semibold">{formatMoney(summary.remainingBalance)}</div>
              <div className="text-xs text-zinc-500 mt-1">Collection - Expenses</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-zinc-600">Expected Collection</div>
              <div className="text-2xl font-semibold">{formatMoney(summary.totalExpected)}</div>
              <div className="text-xs text-zinc-500 mt-1">Received + Pending</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="font-semibold">Pending vs Received</div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Received</span>
                  <span className="font-medium">{formatMoney(summary.totalReceived)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Pending</span>
                  <span className="font-medium">{formatMoney(summary.totalPending)}</span>
                </div>
                <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${
                        summary.totalExpected > 0
                          ? Math.round((summary.totalReceived / summary.totalExpected) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="text-xs text-zinc-500">
                  Progress toward expected collection
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="font-semibold">Expected Breakdown</div>
              <div className="mt-3 text-sm text-zinc-700 space-y-2">
                <div>
                  <span className="text-zinc-500">Expected:</span>{" "}
                  <span className="font-medium">{formatMoney(summary.totalExpected)}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Balance after expenses:</span>{" "}
                  <span className="font-medium">{formatMoney(summary.remainingBalance)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="font-semibold mb-2">Income by Head</div>
              <div className="max-h-[45vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr className="text-left text-zinc-700">
                      <th className="px-2 py-2">Head</th>
                      <th className="px-2 py-2">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.incomeByHead.length === 0 ? (
                      <tr>
                        <td className="px-2 py-4 text-zinc-500" colSpan={2}>
                          No income records.
                        </td>
                      </tr>
                    ) : (
                      summary.incomeByHead.map((r) => (
                        <tr key={r.headId} className="border-t">
                          <td className="px-2 py-2 font-medium">{r.headName}</td>
                          <td className="px-2 py-2">{formatMoney(r.totalReceived)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="font-semibold mb-2">Expense by Head</div>
              <div className="max-h-[45vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr className="text-left text-zinc-700">
                      <th className="px-2 py-2">Head</th>
                      <th className="px-2 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.expenseByHead.length === 0 ? (
                      <tr>
                        <td className="px-2 py-4 text-zinc-500" colSpan={2}>
                          No expense records.
                        </td>
                      </tr>
                    ) : (
                      summary.expenseByHead.map((r) => (
                        <tr key={r.headId} className="border-t">
                          <td className="px-2 py-2 font-medium">{r.headName}</td>
                          <td className="px-2 py-2">{formatMoney(r.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

