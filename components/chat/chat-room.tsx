"use client";

import { createClient } from "@/lib/supabase/client";
import { sendMessage, toggleReaction } from "@/lib/actions/chat";
import { setConversationMuted } from "@/lib/actions/notifications";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

export type UiMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  media_type: "none" | "image" | "video" | "audio";
  storage_path: string | null;
  reply_to_id: string | null;
  created_at: string;
  sender_name: string;
  reply_snippet?: string | null;
  reactions?: { emoji: string; user_id: string }[];
};

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉"];

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function ChatRoom({
  conversationId,
  familyId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  familyId: string;
  currentUserId: string;
  initialMessages: UiMessage[];
}) {
  const t = useTranslations("chat");
  const tNotif = useTranslations("notifications");
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<UiMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>;
          const senderId = String(row.sender_id);
          let senderName = "Member";
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", senderId)
            .maybeSingle();
          if (prof?.display_name) senderName = prof.display_name;

          let replySnippet: string | null = null;
          if (row.reply_to_id) {
            const { data: rep } = await supabase
              .from("messages")
              .select("body")
              .eq("id", String(row.reply_to_id))
              .maybeSingle();
            replySnippet = rep?.body ?? null;
          }

          const ui: UiMessage = {
            id: String(row.id),
            conversation_id: String(row.conversation_id),
            sender_id: senderId,
            body: (row.body as string | null) ?? null,
            media_type: row.media_type as UiMessage["media_type"],
            storage_path: (row.storage_path as string | null) ?? null,
            reply_to_id: (row.reply_to_id as string | null) ?? null,
            created_at: String(row.created_at),
            sender_name: senderName,
            reply_snippet: replySnippet,
            reactions: [],
          };
          setMessages((prev) => [...prev, ui]);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const paths = useMemo(() => {
    return messages
      .filter(
        (m) =>
          !!m.storage_path &&
          (m.media_type === "image" ||
            m.media_type === "video" ||
            m.media_type === "audio"),
      )
      .map((m) => m.storage_path as string);
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const supabase = createClient();
      const next: Record<string, string> = { ...urls };
      for (const p of paths) {
        if (next[p]) continue;
        const { data, error } = await supabase.storage
          .from("family-media")
          .createSignedUrl(p, 3600);
        if (!error && data?.signedUrl) next[p] = data.signedUrl;
      }
      if (!cancelled) setUrls(next);
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- batch sign paths
  }, [paths.join("|")]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await sendMessage({
        conversationId,
        body: trimmed,
        replyToId: replyTo?.id ?? null,
      });
      setText("");
      setReplyTo(null);
    } finally {
      setBusy(false);
    }
  }

  async function uploadMedia(file: File, kind: "image" | "video" | "audio") {
    if (kind === "video" && file.size > MAX_VIDEO_BYTES) {
      alert("Video too large for free tier (max ~25MB).");
      return;
    }
    setBusy(true);
    try {
      const path = `${familyId}/${crypto.randomUUID()}-${file.name}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("family-media")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      await sendMessage({
        conversationId,
        body: null,
        mediaType: kind,
        storagePath: path,
        replyToId: replyTo?.id ?? null,
      });
      setReplyTo(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMuteThis() {
    await setConversationMuted(conversationId, true);
  }

  const chunksRef = useRef<Blob[]>([]);

  async function startVoice() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "voice-note.webm", { type: "audio/webm" });
      await uploadMedia(file, "audio");
    };
    rec.start();
  }

  function stopVoice() {
    recorderRef.current?.stop();
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">{t("membersOnline")}</p>
        <button
          type="button"
          onClick={() => void toggleMuteThis()}
          className="text-xs text-zinc-600 underline"
        >
          {tNotif("muteConversation")}
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-3 py-2 text-sm ${
              m.sender_id === currentUserId
                ? "ms-8 bg-zinc-100 dark:bg-zinc-900"
                : "me-8 bg-zinc-50 dark:bg-zinc-900/60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600">
                {m.sender_name}
              </span>
              <button
                type="button"
                className="text-xs text-zinc-500 underline"
                onClick={() => setReplyTo(m)}
              >
                {t("replying")}
              </button>
            </div>
            {m.reply_to_id && m.reply_snippet && (
              <p className="mt-1 border-s-2 border-zinc-300 ps-2 text-xs text-zinc-500">
                {m.reply_snippet}
              </p>
            )}
            {m.body && <p className="mt-1 whitespace-pre-wrap">{m.body}</p>}
            {m.storage_path && m.media_type === "image" && urls[m.storage_path] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urls[m.storage_path]}
                alt=""
                className="mt-2 max-h-64 rounded-md"
              />
            )}
            {m.storage_path && m.media_type === "video" && urls[m.storage_path] && (
              <video
                src={urls[m.storage_path]}
                controls
                className="mt-2 max-h-64 w-full rounded-md"
              />
            )}
            {m.storage_path && m.media_type === "audio" && urls[m.storage_path] && (
              <audio
                src={urls[m.storage_path]}
                controls
                className="mt-2 w-full"
              />
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {(m.reactions ?? []).map((r) => (
                <span key={`${r.emoji}-${r.user_id}`} className="text-xs">
                  {r.emoji}
                </span>
              ))}
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800"
                  onClick={() => void toggleReaction(m.id, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {replyTo && (
        <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/40">
          <span>
            {t("replying")}: {replyTo.body ?? "…"}
          </span>
          <button type="button" onClick={() => setReplyTo(null)}>
            ✕
          </button>
        </div>
      )}
      <form onSubmit={onSend} className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadMedia(f, "image");
              e.target.value = "";
            }}
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadMedia(f, "video");
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {t("attachImage")}
          </button>
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {t("attachVideo")}
          </button>
          <button
            type="button"
            onClick={() => void startVoice()}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {t("startRecording")}
          </button>
          <button
            type="button"
            onClick={stopVoice}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {t("stopRecording")}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            placeholder={t("placeholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {t("send")}
          </button>
        </div>
      </form>
    </div>
  );
}
