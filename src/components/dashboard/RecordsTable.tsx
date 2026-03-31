"use client";

import { useEffect, useMemo, useState } from "react";
import type { FinanceRecord } from "@/lib/financial/records";

type HeadOption = { id: string; name: string; type: "income" | "expense" };

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(n);
}

export default function RecordsTable(props: {
  monthOptions: string[];
  defaultMonthKey: string;
  incomeHeads: Array<{ id: string; name: string }>;
  expenseHeads: Array<{ id: string; name: string }>;
  onAfterMutation: () => void;
}) {
  const allHeads: HeadOption[] = useMemo(
    () => [
      ...props.incomeHeads.map((h) => ({ ...h, type: "income" as const })),
      ...props.expenseHeads.map((h) => ({ ...h, type: "expense" as const })),
    ],
    [props.incomeHeads, props.expenseHeads],
  );

  const [month, setMonth] = useState(props.defaultMonthKey);
  const [date, setDate] = useState<string>("");
  const [headId, setHeadId] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadRecords() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      else params.set("month", month);
      if (headId) params.set("headId", headId);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/records?${params.toString()}`, {
        method: "GET",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to fetch records");

      setRecords(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [month, date, headId]);

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function renderHeadLabel(r: FinanceRecord) {
    return r.headName || r.headId;
  }

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceRecord | null>(null);

  // Edit form state
  const [editDate, setEditDate] = useState("");
  const [editStudentName, setEditStudentName] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editFeeHeadId, setEditFeeHeadId] = useState("");
  const [editAmountReceived, setEditAmountReceived] = useState<number>(0);
  const [editRemainingAmount, setEditRemainingAmount] = useState<number>(0);
  const [editRemarks, setEditRemarks] = useState("");

  const [editExpenseHeadId, setEditExpenseHeadId] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDescription, setEditDescription] = useState("");

  function openEdit(r: FinanceRecord) {
    setEditing(r);
    setEditDate(r.date);
    if (r.recordType === "collection") {
      setEditStudentName(r.studentName ?? "");
      setEditClassName(r.className ?? "");
      setEditFeeHeadId(r.headId);
      setEditAmountReceived(r.amountReceived ?? 0);
      setEditRemainingAmount(r.remainingAmount ?? 0);
      setEditRemarks(r.remarks ?? "");
    } else {
      setEditExpenseHeadId(r.headId);
      setEditAmount(r.amount ?? 0);
      setEditDescription(r.description ?? "");
    }
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      setLoading(true);
      if (editing.recordType === "collection") {
        const res = await fetch(`/api/collections/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: editDate,
            studentName: editStudentName,
            className: editClassName,
            feeHeadId: editFeeHeadId,
            amountReceived: editAmountReceived,
            remainingAmount: editRemainingAmount,
            remarks: editRemarks || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to update");
      } else {
        const res = await fetch(`/api/expenses/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: editDate,
            expenseHeadId: editExpenseHeadId,
            amount: editAmount,
            description: editDescription || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to update");
      }

      setEditOpen(false);
      setEditing(null);
      props.onAfterMutation();
      await loadRecords();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecord(r: FinanceRecord) {
    const ok = window.confirm(
      `Delete this ${r.recordType === "collection" ? "collection" : "expense"} record?`,
    );
    if (!ok) return;
    try {
      setLoading(true);
      if (r.recordType === "collection") {
        const res = await fetch(`/api/collections/${r.id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to delete");
      } else {
        const res = await fetch(`/api/expenses/${r.id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to delete");
      }

      props.onAfterMutation();
      await loadRecords();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    // Export currently filtered dataset (current page) for speed.
    const header = [
      "Type",
      "Date",
      "Head",
      "Student",
      "Class",
      "AmountReceived",
      "RemainingAmount",
      "Remarks",
      "ExpenseAmount",
      "Description",
    ];
    const rows = records.map((r) => [
      r.recordType,
      r.date,
      r.headName,
      r.studentName ?? "",
      r.className ?? "",
      r.amountReceived ?? "",
      r.remainingAmount ?? "",
      r.remarks ?? "",
      r.amount ?? "",
      r.description ?? "",
    ]);

    const escapeCsv = (v: unknown) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replaceAll('"', '""')}"`;
      }
      return s;
    };

    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `records_${month}_${date ? "date" : "month"}_page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          <label className="block">
            <div className="text-sm font-medium text-zinc-700 mb-1">Month</div>
            <select
              className="w-full rounded-xl border px-3 py-2 bg-white"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {props.monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-700 mb-1">Date</div>
            <input
              type="date"
              className="w-full rounded-xl border px-3 py-2 bg-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-700 mb-1">Head</div>
            <select
              className="w-full rounded-xl border px-3 py-2 bg-white"
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
            >
              <option value="">All heads</option>
              {allHeads.map((h) => (
                <option key={`${h.type}-${h.id}`} value={h.id}>
                  {h.name} ({h.type})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl border bg-white px-4 py-2 font-medium hover:bg-zinc-50"
            onClick={exportCsv}
            disabled={loading || records.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 sticky top-0 z-10">
              <tr className="text-left text-zinc-700">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Head</th>
                <th className="px-3 py-3">Student/Class</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Pending/Desc</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                    Loading...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={`${r.recordType}-${r.id}`} className="border-t">
                    <td className="px-3 py-3 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          r.recordType === "collection"
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-amber-50 text-amber-900"
                        }`}
                      >
                        {r.recordType === "collection" ? "Collection" : "Expense"}
                      </span>
                    </td>
                    <td className="px-3 py-3">{renderHeadLabel(r)}</td>
                    <td className="px-3 py-3">
                      {r.recordType === "collection"
                        ? `${r.studentName ?? ""} / ${r.className ?? ""}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {r.recordType === "collection" ? (
                        <>
                          <div className="font-medium">
                            {formatMoney(r.amountReceived ?? 0)}
                          </div>
                          <div className="text-xs text-zinc-500">
                            Received
                          </div>
                        </>
                      ) : (
                        <div className="font-medium">{formatMoney(r.amount ?? 0)}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {r.recordType === "collection" ? (
                        <>
                          <div className="font-medium">
                            {formatMoney(r.remainingAmount ?? 0)}
                          </div>
                          <div className="text-xs text-zinc-500">
                            Pending (Remarks: {r.remarks ?? "—"})
                          </div>
                        </>
                      ) : (
                        <div className="text-zinc-700">{r.description ?? "—"}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="rounded-lg border bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRecord(r)}
                          className="rounded-lg border bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50 text-rose-700 border-rose-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600">
          Page {page} of {totalPages} (Total: {total})
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl border bg-white px-3 py-2 font-medium disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-xl border bg-white px-3 py-2 font-medium disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {editOpen && editing ? (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-3">
          <div className="w-full max-w-2xl rounded-2xl bg-white border shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">
                Edit {editing.recordType === "collection" ? "Collection" : "Expense"}
              </div>
              <button
                type="button"
                className="rounded-lg border bg-white px-3 py-1 hover:bg-zinc-50"
                onClick={() => setEditOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-4">
              <label className="block">
                <div className="text-sm font-medium text-zinc-700 mb-1">Date</div>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 bg-white"
                />
              </label>

              {editing.recordType === "collection" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <div className="text-sm font-medium text-zinc-700 mb-1">Student</div>
                      <input
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editStudentName}
                        onChange={(e) => setEditStudentName(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <div className="text-sm font-medium text-zinc-700 mb-1">Class</div>
                      <input
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editClassName}
                        onChange={(e) => setEditClassName(e.target.value)}
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <div className="text-sm font-medium text-zinc-700 mb-1">Fee Head</div>
                      <select
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editFeeHeadId}
                        onChange={(e) => setEditFeeHeadId(e.target.value)}
                      >
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
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editAmountReceived}
                        onChange={(e) => setEditAmountReceived(Number(e.target.value))}
                      />
                    </label>

                    <label className="block">
                      <div className="text-sm font-medium text-zinc-700 mb-1">Remaining Amount</div>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editRemainingAmount}
                        onChange={(e) => setEditRemainingAmount(Number(e.target.value))}
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <div className="text-sm font-medium text-zinc-700 mb-1">Remarks</div>
                      <input
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block sm:col-span-2">
                      <div className="text-sm font-medium text-zinc-700 mb-1">Expense Head</div>
                      <select
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editExpenseHeadId}
                        onChange={(e) => setEditExpenseHeadId(e.target.value)}
                      >
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
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editAmount}
                        onChange={(e) => setEditAmount(Number(e.target.value))}
                      />
                    </label>

                    <label className="block">
                      <div className="text-sm font-medium text-zinc-700 mb-1">
                        Description
                      </div>
                      <input
                        className="w-full rounded-xl border px-3 py-2 bg-white"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-xl border bg-white px-4 py-2 font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={loading}
                className="rounded-xl bg-zinc-900 text-white px-4 py-2 font-medium disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

