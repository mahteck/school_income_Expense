import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthedUser, toHttpError } from "@/lib/supabase/requireAuth";
import { fetchFinanceRecords } from "@/lib/financial/records";

export async function GET(req: Request) {
  try {
    const { supabase } = await requireAuthedUser();

    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? undefined;
    const date = url.searchParams.get("date") ?? undefined;
    const headId = url.searchParams.get("headId") ?? undefined;
    const page = url.searchParams.get("page");
    const pageSize = url.searchParams.get("pageSize");

    const schema = z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        headId: z.string().uuid().optional(),
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(100).optional(),
      })
      .refine(
        (v) => !(v.month && v.date),
        "Provide either 'month' or 'date', not both.",
      );

    const parsed = schema.parse({
      month,
      date,
      headId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    const result = await fetchFinanceRecords(supabase, parsed);
    return NextResponse.json(result);
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

