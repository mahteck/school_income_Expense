import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function getSupabaseBrowserClient() {
  // Runs in the browser, so @supabase/ssr will use document.cookie automatically.
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

