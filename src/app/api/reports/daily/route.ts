import { NextResponse } from "next/server";
import { format, subDays } from "date-fns";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchMonthlySummary } from "@/lib/financial/summary";
import { monthKeyFromDate } from "@/lib/financial/month";
import { getConfiguredReportRecipients } from "@/lib/email/recipients";
import { Resend } from "resend";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(String(value));
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipients = getConfiguredReportRecipients();
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "REPORT_EMAIL_TO is not configured" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const reportDate = subDays(new Date(), 1); // previous day
  const dateKey = format(reportDate, "yyyy-MM-dd");
  const monthKey = monthKeyFromDate(reportDate);

  const [{ data: collections, error: collectionsError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase
        .from("collections")
        .select("student_name,amount_received,remaining_amount")
        .eq("date", dateKey),
      supabase
        .from("expenses")
        .select("description,amount")
        .eq("date", dateKey),
    ]);

  if (collectionsError || expensesError) {
    return NextResponse.json(
      { error: collectionsError?.message ?? expensesError?.message ?? "Failed" },
      { status: 500 },
    );
  }

  const dailyCollection = (collections ?? []).reduce(
    (sum, r) => sum + toNumber((r as { amount_received: unknown }).amount_received),
    0,
  );
  const dailyPending = (collections ?? []).reduce(
    (sum, r) => sum + toNumber((r as { remaining_amount: unknown }).remaining_amount),
    0,
  );
  const dailyExpense = (expenses ?? []).reduce(
    (sum, r) => sum + toNumber((r as { amount: unknown }).amount),
    0,
  );
  const dailyBalance = dailyCollection - dailyExpense;

  const summary = await fetchMonthlySummary(supabase, monthKey);
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2>Daily Finance Report (${dateKey})</h2>
      <ul>
        <li><strong>Daily Collection:</strong> ${dailyCollection}</li>
        <li><strong>Daily Pending:</strong> ${dailyPending}</li>
        <li><strong>Daily Expense:</strong> ${dailyExpense}</li>
        <li><strong>Daily Balance:</strong> ${dailyBalance}</li>
      </ul>
      <h3>Monthly Summary (${monthKey})</h3>
      <ul>
        <li><strong>Total Received:</strong> ${summary.totalReceived}</li>
        <li><strong>Total Pending:</strong> ${summary.totalPending}</li>
        <li><strong>Total Expected:</strong> ${summary.totalExpected}</li>
        <li><strong>Total Expenses:</strong> ${summary.totalExpenses}</li>
        <li><strong>Remaining Balance:</strong> ${summary.remainingBalance}</li>
      </ul>
    </div>
  `;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: recipients,
    subject: `Daily Report - ${dateKey}`,
    html,
  });

  return NextResponse.json({
    ok: true,
    date: dateKey,
    sentTo: recipients,
  });
}

