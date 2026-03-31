import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthedUser, toHttpError } from "@/lib/supabase/requireAuth";

const idSchema = z.string().uuid();

const ExpenseUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expenseHeadId: z.string().uuid().optional(),
  amount: z.coerce.number().finite().optional(),
  description: z.string().max(2000).nullable().optional(),
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
    const parsed = ExpenseUpdateSchema.parse(body);

    const update: Record<string, unknown> = {};
    if (parsed.date !== undefined) update.date = parsed.date;
    if (parsed.expenseHeadId !== undefined)
      update.expense_head_id = parsed.expenseHeadId;
    if (parsed.amount !== undefined) update.amount = parsed.amount;
    if (parsed.description !== undefined) update.description = parsed.description;

    const { data, error } = await supabase
      .from("expenses")
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

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

