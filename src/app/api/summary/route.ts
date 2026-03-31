import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthedUser, toHttpError } from "@/lib/supabase/requireAuth";
import { fetchMonthlySummary } from "@/lib/financial/summary";

export async function GET(req: Request) {
  try {
    const { supabase } = await requireAuthedUser();
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? undefined;

    const parsed = z
      .object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
      .parse({ month });

    const summary = await fetchMonthlySummary(supabase, parsed.month);
    return NextResponse.json(summary);
  } catch (err) {
    const httpErr = toHttpError(err);
    return NextResponse.json({ error: httpErr.message }, { status: httpErr.status });
  }
}

