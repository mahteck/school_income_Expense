import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthedUser, toHttpError } from "@/lib/supabase/requireAuth";
import { monthKeyFromDate, parseDateKey } from "@/lib/financial/month";

const idSchema = z.string().uuid();

const CollectionUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  studentName: z.string().min(1).max(200).optional(),
  className: z.string().min(1).max(100).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // ignored; month derived from date for consistency
  feeHeadId: z.string().uuid().optional(),
  amountReceived: z.coerce.number().finite().optional(),
  remainingAmount: z.coerce.number().finite().optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase } = await requireAuthedUser();
    const params = await context.params;
    const id = idSchema.parse(params.id);

    const body = await req.json();
    const parsed = CollectionUpdateSchema.parse(body);

    const update: Record<string, unknown> = {};

    if (parsed.date !== undefined) {
      update.date = parsed.date;
      update.month = monthKeyFromDate(parseDateKey(parsed.date));
    }
    if (parsed.studentName !== undefined) update.student_name = parsed.studentName;
    if (parsed.className !== undefined) update.class = parsed.className;
    if (parsed.feeHeadId !== undefined) update.fee_head_id = parsed.feeHeadId;
    if (parsed.amountReceived !== undefined) update.amount_received = parsed.amountReceived;
    if (parsed.remainingAmount !== undefined) update.remaining_amount = parsed.remainingAmount;
    if (parsed.remarks !== undefined) update.remarks = parsed.remarks ?? null;

    const { data, error } = await supabase
      .from("collections")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase } = await requireAuthedUser();
    const params = await context.params;
    const id = idSchema.parse(params.id);

    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

