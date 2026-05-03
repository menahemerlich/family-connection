import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/chat/chat-room";
import { buildUiMessages } from "@/lib/chat/build-ui-messages";

export default async function FamilyChatPage({
  params,
}: {
  params: Promise<{ locale: string; familyId: string }>;
}) {
  const { familyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("family_id", familyId)
    .eq("type", "family")
    .maybeSingle();

  if (!conv) notFound();

  const { data: raw } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(200);

  const initialMessages = await buildUiMessages(supabase, raw ?? []);

  return (
    <ChatRoom
      key={conv.id}
      conversationId={conv.id}
      familyId={familyId}
      currentUserId={user.id}
      initialMessages={initialMessages}
    />
  );
}
