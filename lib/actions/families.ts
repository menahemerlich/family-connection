"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createFamily(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");

  const { data, error } = await supabase.rpc("create_family_for_user", {
    p_name: trimmed,
  });

  if (error) throw error;
  revalidatePath("/app");
  return data as string;
}

export async function setActiveFamily(familyId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ last_active_family_id: familyId })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function sendInvitation(
  familyId: string,
  email: string,
  locale: string = "he",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const token = crypto.randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + 14);

  const { error } = await supabase.from("invitations").insert({
    family_id: familyId,
    email: email.trim().toLowerCase(),
    token,
    invited_by: user.id,
    expires_at: expires.toISOString(),
  });

  if (error) throw error;

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const joinUrl = `${base}/${locale}/join?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.RESEND_FROM_EMAIL ?? "Family <onboarding@resend.dev>",
          to: [email.trim()],
          subject: "הזמנה להצטרפות למשפחה / Family invite",
          html: `<p>הצטרפו כאן / Join: <a href="${joinUrl}">${joinUrl}</a></p>`,
        }),
      });
    } catch {
      /* optional email */
    }
  }

  revalidatePath(`/app/family/${familyId}`);
  return { joinUrl };
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    invite_token: token,
  });
  if (error) throw error;
  const result = data as { ok?: boolean; family_id?: string; error?: string };
  if (!result?.ok) throw new Error(result?.error ?? "invite_failed");
  revalidatePath("/", "layout" as const);
  return result.family_id as string;
}
