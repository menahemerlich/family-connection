"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateGlobalNotificationSettings(values: {
  global_mute?: boolean;
  quiet_until?: string | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (values.global_mute !== undefined) patch.global_mute = values.global_mute;
  if (values.quiet_until !== undefined) patch.quiet_until = values.quiet_until;
  if (values.quiet_hours_start !== undefined) {
    patch.quiet_hours_start = values.quiet_hours_start;
  }
  if (values.quiet_hours_end !== undefined) {
    patch.quiet_hours_end = values.quiet_hours_end;
  }

  const { error } = await supabase
    .from("user_notification_settings")
    .upsert(
      { user_id: user.id, ...patch },
      { onConflict: "user_id" },
    );
  if (error) throw error;
  revalidatePath("/app/notifications");
}

export async function setFamilyMuted(familyId: string, muted: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (muted) {
    const { error } = await supabase.from("user_muted_families").upsert(
      { user_id: user.id, family_id: familyId },
      { onConflict: "user_id,family_id" },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_muted_families")
      .delete()
      .eq("user_id", user.id)
      .eq("family_id", familyId);
    if (error) throw error;
  }
  revalidatePath("/app/notifications");
}

export async function setConversationMuted(
  conversationId: string,
  muted: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (muted) {
    const { error } = await supabase
      .from("user_muted_conversations")
      .upsert(
        { user_id: user.id, conversation_id: conversationId },
        { onConflict: "user_id,conversation_id" },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_muted_conversations")
      .delete()
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId);
    if (error) throw error;
  }
}
