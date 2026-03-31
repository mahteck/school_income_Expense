import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuthedUser, toHttpError } from "@/lib/supabase/requireAuth";

const idSchema = z.string().uuid();
const HeadTypeSchema = z.enum(["income", "expense"]);

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase } = await requireAuthedUser();
    const params = await context.params;
    const id = idSchema.parse(params.id);

    const body = await req.json();
    const parsed = z
      .object({
        name: z.string().min(1).max(200).optional(),
        type: HeadTypeSchema.optional(),
      })
      .parse(body);

    const update: Record<string, unknown> = {};
    if (parsed.name !== undefined) update.name = parsed.name;
    if (parsed.type !== undefined) update.type = parsed.type;

    const { data, error } = await supabase
      .from("heads")
      .update(update)
      .eq("id", id)
      .select("id,name,type")
      .single();

    if (error) throw error;
    if (!data) throw new Error("Head not found");

    return NextResponse.json(data);
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

    const { error } = await supabase.from("heads").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

