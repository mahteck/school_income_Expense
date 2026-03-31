import { getSupabaseServerClient } from "./server";

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function requireAuthedUser() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new HttpError(401, "Unauthorized", error);
  }

  if (!data?.user) {
    throw new HttpError(401, "Unauthorized");
  }

  return { supabase, user: data.user };
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}

export function toHttpError(err: unknown): HttpError {
  if (isHttpError(err)) return err;
  const message = err instanceof Error ? err.message : "Unexpected error";
  return new HttpError(500, message, err);
}

