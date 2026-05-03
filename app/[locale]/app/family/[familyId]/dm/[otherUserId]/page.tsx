import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureDirectConversation } from "@/lib/actions/chat";
import { ChatRoom } from "@/components/chat/chat-room";
import { buildUiMessages } from "@/lib/chat/build-ui-messages";

export default async function DirectChatPage({
  params,
}: {
  params: Promise<{ locale: string; familyId: string; otherUserId: string }>;
}) {
  const { familyId, otherUserId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const conversationId = await ensureDirectConversation(familyId, otherUserId);

  const { data: raw } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  const initialMessages = await buildUiMessages(supabase, raw ?? []);

  return (
    <ChatRoom
      key={conversationId}
      conversationId={conversationId}
      familyId={familyId}
      currentUserId={user.id}
      initialMessages={initialMessages}
    />
  );
}
