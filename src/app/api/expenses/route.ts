import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthedUser, toHttpError } from "@/lib/supabase/requireAuth";
import { parseDateKey, monthKeyFromDate } from "@/lib/financial/month";
import { fetchMonthlySummary } from "@/lib/financial/summary";
import { sendNewEntryEmail } from "@/lib/email/sendEmail";
import { resolveEntryEmailRecipients } from "@/lib/email/recipients";

const ExpenseCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expenseHeadId: z.string().uuid(),
  amount: z.coerce.number().finite(),
  description: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuthedUser();
    const body = await req.json();
    const parsed = ExpenseCreateSchema.parse(body);

    const date = parsed.date;
    const month = monthKeyFromDate(parseDateKey(date));

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        date,
        expense_head_id: parsed.expenseHeadId,
        amount: parsed.amount,
        description: parsed.description,
      })
      .select("*")
      .single();

    if (error) throw error;

    const recipients = resolveEntryEmailRecipients(user.email);
    if (recipients.length > 0) {
      const summary = await fetchMonthlySummary(supabase, month);
      await sendNewEntryEmail({
        to: recipients,
        entryType: "expense",
        subject: `New expense entry (${month})`,
        entryDetails: {
          Date: date,
          "Expense Head Id": parsed.expenseHeadId,
          Amount: parsed.amount,
          Description: parsed.description ?? "",
        },
        summary: {
          month,
          totalReceived: summary.totalReceived,
          totalPending: summary.totalPending,
          totalExpected: summary.totalExpected,
          totalExpenses: summary.totalExpenses,
          remainingBalance: summary.remainingBalance,
        },
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

