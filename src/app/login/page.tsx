"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SupabaseClient } from "@supabase/supabase-js";

export default function LoginPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSupabase(getSupabaseBrowserClient());
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        router.replace("/dashboard");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function signInWithGoogle() {
    if (!supabase) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/login`,
        },
      });
      if (error) throw error;
      // Redirect handled by Supabase.
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start Google sign-in";
      setErrorMsg(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-zinc-600 mt-2">
          Use your Google account to access the dashboard.
        </p>

        {errorMsg ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <button
          className="mt-6 w-full rounded-xl bg-zinc-900 px-4 py-3 text-white font-medium disabled:opacity-60"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

