"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const oauthError = url.searchParams.get("error_description");

        if (oauthError) {
          throw new Error(oauthError);
        }

        if (!code) {
          throw new Error("Missing OAuth code in callback URL.");
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        if (!active) return;
        router.replace("/dashboard");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign-in failed.";
        if (!active) return;
        setMessage(msg);
        setTimeout(() => {
          router.replace("/login");
        }, 1200);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Authenticating</h1>
        <p className="mt-2 text-zinc-600">{message}</p>
      </div>
    </div>
  );
}

