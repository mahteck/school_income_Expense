import { addMonths, format, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MonthlySummary = {
  month: string; // YYYY-MM
  totalReceived: number;
  totalPending: number;
  totalExpected: number;
  totalExpenses: number;
  remainingBalance: number; // received - expenses
  incomeByHead: Array<{ headId: string; headName: string; totalReceived: number }>;
  expenseByHead: Array<{ headId: string; headName: string; total: number }>;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(String(value));
}

function monthBounds(monthKey: string) {
  // monthKey: YYYY-MM
  const start = parseISO(`${monthKey}-01`);
  const end = addMonths(start, 1);
  const startKey = format(start, "yyyy-MM-dd");
  const endKey = format(end, "yyyy-MM-dd");
  return { start, end, startKey, endKey };
}

export async function fetchMonthlySummary(
  supabase: SupabaseClient,
  monthKey: string,
): Promise<MonthlySummary> {
  const { startKey, endKey } = monthBounds(monthKey);

  type CollectionRow = {
    amount_received: string | number;
    remaining_amount: string | number;
    fee_head_id: string;
  };

  type ExpenseRow = {
    amount: string | number;
    expense_head_id: string;
  };

  const { data: collectionRows, error: collectionError } = await supabase
    .from("collections")
    .select("amount_received,remaining_amount,fee_head_id")
    .eq("month", monthKey);

  if (collectionError) throw new Error(collectionError.message);
  const rows = (collectionRows ?? []) as CollectionRow[];

  const totalReceived = rows.reduce(
    (sum, r) => sum + toNumber(r.amount_received),
    0,
  );
  const totalPending = rows.reduce(
    (sum, r) => sum + toNumber(r.remaining_amount),
    0,
  );
  const totalExpected = totalReceived + totalPending;

  const feeHeadIds = Array.from(
    new Set(rows.map((r) => String(r.fee_head_id)).filter(Boolean)),
  );

  const { data: feeHeads, error: feeHeadsError } = feeHeadIds.length
    ? await supabase.from("heads").select("id,name").in("id", feeHeadIds)
    : { data: [], error: null };

  if (feeHeadsError) throw new Error(feeHeadsError.message);

  const headNameById = new Map(
    (feeHeads ?? []).map((h) => [String(h.id), String(h.name)]),
  );

  const incomeByHeadMap = new Map<
    string,
    { headId: string; headName: string; totalReceived: number }
  >();
  for (const r of rows) {
    const headId = String(r.fee_head_id);
    const prev =
      incomeByHeadMap.get(headId) ??
      ({
        headId,
        headName: headNameById.get(headId) ?? headId,
        totalReceived: 0,
      } as const);
    incomeByHeadMap.set(headId, {
      ...prev,
      totalReceived: prev.totalReceived + toNumber(r.amount_received),
    });
  }

  const incomeByHead = Array.from(incomeByHeadMap.values()).sort((a, b) =>
    a.headName.localeCompare(b.headName),
  );

  const { data: expenseRows, error: expenseError } = await supabase
    .from("expenses")
    .select("amount,expense_head_id")
    .gte("date", startKey)
    .lt("date", endKey);

  if (expenseError) throw new Error(expenseError.message);
  const expRows = (expenseRows ?? []) as ExpenseRow[];

  const totalExpenses = expRows.reduce(
    (sum, r) => sum + toNumber(r.amount),
    0,
  );
  const remainingBalance = totalReceived - totalExpenses;

  const expenseHeadIds = Array.from(
    new Set(expRows.map((r) => String(r.expense_head_id)).filter(Boolean)),
  );
  const { data: expenseHeads, error: expenseHeadsError } = expenseHeadIds.length
    ? await supabase
        .from("heads")
        .select("id,name")
        .in("id", expenseHeadIds)
    : { data: [], error: null };

  if (expenseHeadsError) throw new Error(expenseHeadsError.message);

  const expenseHeadNameById = new Map(
    (expenseHeads ?? []).map((h) => [String(h.id), String(h.name)]),
  );

  const expenseByHeadMap = new Map<
    string,
    { headId: string; headName: string; total: number }
  >();
  for (const r of expRows) {
    const headId = String(r.expense_head_id);
    const prev =
      expenseByHeadMap.get(headId) ??
      ({
        headId,
        headName: expenseHeadNameById.get(headId) ?? headId,
        total: 0,
      } as const);
    expenseByHeadMap.set(headId, {
      ...prev,
      total: prev.total + toNumber(r.amount),
    });
  }

  const expenseByHead = Array.from(expenseByHeadMap.values()).sort((a, b) =>
    a.headName.localeCompare(b.headName),
  );

  return {
    month: monthKey,
    totalReceived,
    totalPending,
    totalExpected,
    totalExpenses,
    remainingBalance,
    incomeByHead,
    expenseByHead,
  };
}

