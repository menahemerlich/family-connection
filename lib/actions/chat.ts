"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function ensureDirectConversation(
  familyId: string,
  otherUserId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    p_family_id: familyId,
    p_other_user: otherUserId,
  });
  if (error) throw error;
  return data as string;
}

export async function sendMessage(input: {
  conversationId: string;
  body?: string | null;
  mediaType?: "none" | "image" | "video" | "audio";
  storagePath?: string | null;
  replyToId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversationId,
    sender_id: user.id,
    body: input.body ?? null,
    media_type: input.mediaType ?? "none",
    storage_path: input.storagePath ?? null,
    reply_to_id: input.replyToId ?? null,
  });
  if (error) throw error;
  revalidatePath("/app");
}

export async function toggleReaction(messageId: string, emoji: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
  } else {
    await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    });
  }
}
