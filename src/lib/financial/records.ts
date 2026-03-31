import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, format, parseISO } from "date-fns";

export type FinanceRecordType = "collection" | "expense";

export type FinanceRecord = {
  recordType: FinanceRecordType;
  id: string;
  date: string; // YYYY-MM-DD
  headId: string;
  headName: string;
  amountReceived?: number; // collection
  remainingAmount?: number; // collection
  studentName?: string; // collection
  className?: string; // collection
  remarks?: string; // collection
  amount?: number; // expense
  description?: string; // expense
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(String(value));
}

function monthToDateRange(monthKey: string) {
  const start = parseISO(`${monthKey}-01`);
  const end = addMonths(start, 1);
  return {
    startKey: format(start, "yyyy-MM-dd"),
    endKey: format(end, "yyyy-MM-dd"),
  };
}

export type RecordsQuery = {
  month?: string; // YYYY-MM
  date?: string; // YYYY-MM-DD
  headId?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchFinanceRecords(
  supabase: SupabaseClient,
  query: RecordsQuery,
): Promise<{ items: FinanceRecord[]; total: number }> {
  type CollectionRow = {
    id: string;
    date: string;
    fee_head_id: string;
    amount_received: string | number;
    remaining_amount: string | number;
    student_name: string | null;
    class: string | null;
    remarks: string | null;
  };

  type ExpenseRow = {
    id: string;
    date: string;
    expense_head_id: string;
    amount: string | number;
    description: string | null;
  };

  type HeadRow = {
    id: string;
    name: string;
  };

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  let collectionRows: CollectionRow[] = [];
  let expenseRows: ExpenseRow[] = [];

  if (query.month) {
    const { startKey, endKey } = monthToDateRange(query.month);
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("month", query.month);
    if (error) throw new Error(error.message);
    collectionRows = (data ?? []) as CollectionRow[];
    // expense uses date range
    const { data: expData, error: expError } = await supabase
      .from("expenses")
      .select("*")
      .gte("date", startKey)
      .lt("date", endKey);
    if (expError) throw new Error(expError.message);
    expenseRows = (expData ?? []) as ExpenseRow[];
  } else {
    // no month filter
    if (query.date) {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("date", query.date);
      if (error) throw new Error(error.message);
      collectionRows = (data ?? []) as CollectionRow[];

      const { data: expData, error: expError } = await supabase
        .from("expenses")
        .select("*")
        .eq("date", query.date);
      if (expError) throw new Error(expError.message);
      expenseRows = (expData ?? []) as ExpenseRow[];
    } else {
      // month not specified but could happen; keep safe with empty datasets to avoid huge reads.
      // Users can always choose a month in the UI.
      collectionRows = [];
      expenseRows = [];
    }
  }

  if (query.headId) {
    collectionRows = collectionRows.filter((r) => r.fee_head_id === query.headId);
    expenseRows = expenseRows.filter(
      (r) => r.expense_head_id === query.headId,
    );
  }

  const headIds = Array.from(
    new Set([
      ...collectionRows.map((r) => String(r.fee_head_id)).filter(Boolean),
      ...expenseRows.map((r) => String(r.expense_head_id)).filter(Boolean),
    ]),
  );

  const { data: heads, error: headsError } = headIds.length
    ? await supabase.from("heads").select("id,name").in("id", headIds)
    : { data: [], error: null };
  if (headsError) throw new Error(headsError.message);

  const headNameById = new Map<string, string>(
    ((heads ?? []) as HeadRow[]).map((h) => [String(h.id), String(h.name)]),
  );

  const items: FinanceRecord[] = [
    ...collectionRows.map((r) => ({
      recordType: "collection" as const,
      id: String(r.id),
      date: String(r.date),
      headId: String(r.fee_head_id),
      headName:
        headNameById.get(String(r.fee_head_id)) ?? String(r.fee_head_id),
      amountReceived: toNumber(r.amount_received),
      remainingAmount: toNumber(r.remaining_amount),
      studentName: r.student_name ?? "",
      className: r.class ?? "",
      remarks: r.remarks ?? "",
    })),
    ...expenseRows.map((r) => ({
      recordType: "expense" as const,
      id: String(r.id),
      date: String(r.date),
      headId: String(r.expense_head_id),
      headName:
        headNameById.get(String(r.expense_head_id)) ??
        String(r.expense_head_id),
      amount: toNumber(r.amount),
      description: r.description ?? "",
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const total = items.length;
  const paged = items.slice(offset, offset + pageSize);
  return { items: paged, total };
}

