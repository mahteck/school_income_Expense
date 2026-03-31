import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthedUser, toHttpError } from "@/lib/supabase/requireAuth";
import { monthKeyFromDate, parseDateKey } from "@/lib/financial/month";
import { fetchMonthlySummary } from "@/lib/financial/summary";
import { sendNewEntryEmail } from "@/lib/email/sendEmail";
import { resolveEntryEmailRecipients } from "@/lib/email/recipients";

const CollectionCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studentName: z.string().min(1).max(200),
  className: z.string().min(1).max(100),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  feeHeadId: z.string().uuid(),
  amountReceived: z.coerce.number().finite(),
  remainingAmount: z.coerce.number().finite().nonnegative(),
  remarks: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuthedUser();

    const body = await req.json();
    const parsed = CollectionCreateSchema.parse(body);

    const date = parsed.date;
    const dateObj = parseDateKey(date); // safe UTC parse
    const month = monthKeyFromDate(dateObj);

    const { data, error } = await supabase
      .from("collections")
      .insert({
        date,
        student_name: parsed.studentName,
        class: parsed.className,
        month,
        fee_head_id: parsed.feeHeadId,
        amount_received: parsed.amountReceived,
        remaining_amount: parsed.remainingAmount,
        remarks: parsed.remarks,
      })
      .select("*")
      .single();

    if (error) throw error;

    const recipients = resolveEntryEmailRecipients(user.email);
    if (recipients.length > 0) {
      const summary = await fetchMonthlySummary(supabase, month);
      await sendNewEntryEmail({
        to: recipients,
        entryType: "collection",
        subject: `New collection entry (${month})`,
        entryDetails: {
          Date: date,
          Student: parsed.studentName,
          Class: parsed.className,
          "Fee Head Id": parsed.feeHeadId,
          "Amount Received": parsed.amountReceived,
          "Remaining Amount": parsed.remainingAmount,
          Remarks: parsed.remarks ?? "",
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

