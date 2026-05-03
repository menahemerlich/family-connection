/**
 * Validates NEXT_PUBLIC_SUPABASE_* before any request to Supabase.
 * Returns a user-facing message, or null if OK.
 */
export function getSupabasePublicEnvError(): string | null {
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!urlRaw || !key) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add both from Supabase → Settings → API to .env.local, then restart npm run dev.";
  }

  if (!urlRaw.startsWith("https://")) {
    return "NEXT_PUBLIC_SUPABASE_URL must start with https://";
  }

  const lower = urlRaw.toLowerCase();
  if (
    lower.includes("your_project") ||
    lower.includes("xxxx") ||
    /placeholder|example\.com|dummy/i.test(urlRaw)
  ) {
    return "NEXT_PUBLIC_SUPABASE_URL still contains placeholder text (e.g. your_project). Replace it with your real URL from Supabase → Settings → API (looks like https://abcdefghij.supabase.co — no /rest/v1 at the end).";
  }

  let pathname = "";
  try {
    pathname = new URL(urlRaw).pathname;
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL.";
  }

  if (pathname && pathname !== "/") {
    return "NEXT_PUBLIC_SUPABASE_URL must be the project root only, e.g. https://YOUR_REF.supabase.co — remove paths like /rest/v1/";
  }

  const keyLower = key.toLowerCase();
  if (
    keyLower === "your_anon_key" ||
    keyLower.includes("your_anon") ||
    keyLower.includes("paste_your")
  ) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY still looks like a placeholder. Copy the anon public key from Supabase → Settings → API.";
  }

  return null;
}
