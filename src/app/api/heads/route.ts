import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuthedUser, toHttpError } from "@/lib/supabase/requireAuth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const HeadTypeSchema = z.enum(["income", "expense"]);

export async function GET(req: Request) {
  try {
    // Dashboard needs dropdowns filtered by type (income vs expense)
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? undefined;

    await requireAuthedUser(); // auth check; RLS also applies

    const supabase = getSupabaseServerClient();

    const q = supabase.from("heads").select("id,name,type").order("name", { ascending: true });
    const rows =
      type && HeadTypeSchema.safeParse(type).success
        ? await q.eq("type", type)
        : await q;

    return NextResponse.json(rows.data ?? []);
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

export async function POST(req: Request) {
  try {
    const { supabase } = await requireAuthedUser();

    const bodySchema = z.object({
      name: z.string().min(1).max(200),
      type: HeadTypeSchema,
    });
    const body = await req.json();
    const parsed = bodySchema.parse(body);

    const { data, error } = await supabase
      .from("heads")
      .insert({ name: parsed.name, type: parsed.type })
      .select("id,name,type")
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create head");

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

