import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnvError } from "@/lib/supabase/validate-public-env";

export function createClient() {
  const msg = getSupabasePublicEnvError();
  if (msg) {
    throw new Error(msg);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  return createBrowserClient(url, key);
}
