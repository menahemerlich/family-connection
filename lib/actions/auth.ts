"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSupabasePublicEnvError } from "@/lib/supabase/validate-public-env";

function envError(): string | null {
  return getSupabasePublicEnvError();
}

export async function signInWithEmailPassword(email: string, password: string) {
  const bad = envError();
  if (bad) return { ok: false as const, message: bad };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  locale: string,
  origin: string,
) {
  const bad = envError();
  if (bad) return { ok: false as const, message: bad, session: false };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/${locale}/app`,
    },
  });

  if (error) {
    return { ok: false as const, message: error.message, session: false };
  }

  revalidatePath("/", "layout");
  return {
    ok: true as const,
    session: !!data.session,
    message: null as string | null,
  };
}

/** יוצר כתובת OAuth בשרת (בלי fetch מהדפדפן ל-Supabase) ואז מפנים ב-navigate מלא */
export async function getGoogleOAuthUrl(locale: string, origin: string) {
  const bad = envError();
  if (bad) return { ok: false as const, message: bad, url: null as string | null };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin.replace(/\/$/, "")}/auth/callback?next=/${locale}/app`,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return { ok: false as const, message: error.message, url: null as string | null };
  }
  if (!data.url) {
    return {
      ok: false as const,
      message: "No OAuth URL returned. Enable Google in Supabase (Authentication → Providers) and set Client ID/Secret.",
      url: null as string | null,
    };
  }

  return { ok: true as const, message: null as string | null, url: data.url };
}
