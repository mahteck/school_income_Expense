"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function Home() {
  const router = useRouter();
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          setMessage("Completing sign-in...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session?.user) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      } catch {
        if (!active) return;
        router.replace("/login");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 text-zinc-900">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-600">{message}</p>
      </div>
    </div>
  );
}
