import type { SupabaseClient } from "@supabase/supabase-js";
import type { UiMessage } from "@/components/chat/chat-room";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  media_type: UiMessage["media_type"];
  storage_path: string | null;
  reply_to_id: string | null;
  created_at: string;
};

export async function buildUiMessages(
  supabase: SupabaseClient,
  rows: MessageRow[],
): Promise<UiMessage[]> {
  if (rows.length === 0) return [];

  const senderIds = [...new Set(rows.map((r) => r.sender_id))];
  const replyIds = [
    ...new Set(
      rows.map((r) => r.reply_to_id).filter((x): x is string => !!x),
    ),
  ];
  const messageIds = rows.map((r) => r.id);

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", senderIds);

  const nameById = Object.fromEntries(
    (profs ?? []).map((p) => [p.id, p.display_name as string | null]),
  );

  let replyBodyById: Record<string, string | null> = {};
  if (replyIds.length) {
    const { data: reps } = await supabase
      .from("messages")
      .select("id, body")
      .in("id", replyIds);
    replyBodyById = Object.fromEntries(
      (reps ?? []).map((r) => [r.id as string, r.body as string | null]),
    );
  }

  const { data: rx } = await supabase
    .from("message_reactions")
    .select("message_id, emoji, user_id")
    .in("message_id", messageIds);

  const rxByMessage = new Map<string, { emoji: string; user_id: string }[]>();
  for (const r of rx ?? []) {
    const mid = r.message_id as string;
    const list = rxByMessage.get(mid) ?? [];
    list.push({ emoji: r.emoji as string, user_id: r.user_id as string });
    rxByMessage.set(mid, list);
  }

  return rows.map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    body: m.body,
    media_type: m.media_type,
    storage_path: m.storage_path,
    reply_to_id: m.reply_to_id,
    created_at: m.created_at,
    sender_name: nameById[m.sender_id] ?? "Member",
    reply_snippet: m.reply_to_id ? replyBodyById[m.reply_to_id] ?? null : null,
    reactions: rxByMessage.get(m.id) ?? [],
  }));
}
