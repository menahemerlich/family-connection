import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDistanceToNowStrict } from "date-fns";
import { enUS, he } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import {
  FamilyHubView,
  type HubConversationRow,
  type HubMember,
} from "@/components/family/family-hub-view";

type ConvRow = {
  id: string;
  type: "family" | "direct";
  family_id: string;
  dm_user_a: string | null;
  dm_user_b: string | null;
};

export default async function FamilyHubPage({
  params,
}: {
  params: Promise<{ locale: string; familyId: string }>;
}) {
  const { familyId, locale } = await params;
  const tHub = await getTranslations("hub");
  const tFamily = await getTranslations("family");

  const dateLocale = locale === "he" ? he : enUS;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: memCheck } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!memCheck) notFound();

  const { data: fam } = await supabase
    .from("families")
    .select("name")
    .eq("id", familyId)
    .maybeSingle();

  const familyName = (fam?.name as string | undefined) ?? tHub("unnamedFamily");

  const { data: memberRows } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId);

  const memberIds = (memberRows ?? []).map((r) => r.user_id as string);

  let members: HubMember[] = [];
  if (memberIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", memberIds);

    const byId = Object.fromEntries(
      (profs ?? []).map((p) => [
        p.id as string,
        {
          displayName: p.display_name as string | null,
          avatarUrl: p.avatar_url as string | null,
        },
      ]),
    );
    members = memberIds.map((id) => ({
      id,
      displayName: byId[id]?.displayName ?? null,
      avatarUrl: byId[id]?.avatarUrl ?? null,
    }));
    members.sort((a, b) =>
      (a.displayName ?? a.id).localeCompare(b.displayName ?? b.id, locale, {
        sensitivity: "base",
      }),
    );
  }

  const { data: partRows } = await supabase
    .from("conversation_participants")
    .select(
      `
      conversations!inner (
        id,
        type,
        family_id,
        dm_user_a,
        dm_user_b
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("conversations.family_id", familyId);

  const convs: ConvRow[] = (partRows ?? [])
    .map((row) => {
      const raw = row.conversations as unknown;
      const c = Array.isArray(raw) ? raw[0] : raw;
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      return {
        id: o.id as string,
        type: o.type as ConvRow["type"],
        family_id: o.family_id as string,
        dm_user_a: (o.dm_user_a as string | null) ?? null,
        dm_user_b: (o.dm_user_b as string | null) ?? null,
      };
    })
    .filter((x): x is ConvRow => !!x);

  const otherIds = new Set<string>();
  for (const c of convs) {
    if (c.type === "direct" && c.dm_user_a && c.dm_user_b) {
      otherIds.add(c.dm_user_a === user.id ? c.dm_user_b : c.dm_user_a);
    }
  }

  const nameByUser: Record<string, string | null> = {};
  if (otherIds.size) {
    const { data: op } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [...otherIds]);
    for (const p of op ?? []) {
      nameByUser[p.id as string] = p.display_name as string | null;
    }
  }

  const convIds = [...new Set(convs.map((c) => c.id))];
  const lastByConv: Record<
    string,
    { body: string | null; media_type: string; created_at: string }
  > = {};

  if (convIds.length) {
    const { data: recent } = await supabase
      .from("messages")
      .select("conversation_id, body, media_type, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(400);

    for (const m of recent ?? []) {
      const cid = m.conversation_id as string;
      if (!lastByConv[cid]) {
        lastByConv[cid] = {
          body: m.body as string | null,
          media_type: m.media_type as string,
          created_at: m.created_at as string,
        };
      }
    }
  }

  function previewFor(convId: string): string {
    const m = lastByConv[convId];
    if (!m) return tHub("noMessagesYet");
    if (m.body?.trim()) {
      const s = m.body.trim();
      return s.length > 72 ? `${s.slice(0, 69)}…` : s;
    }
    if (m.media_type === "image") return tHub("previewImage");
    if (m.media_type === "video") return tHub("previewVideo");
    if (m.media_type === "audio") return tHub("previewAudio");
    return tHub("previewAttachment");
  }

  const conversationRows: HubConversationRow[] = convs.map((c) => {
    let title: string;
    let href: string;
    if (c.type === "family") {
      title = tFamily("familyChat");
      href = `/app/family/${familyId}/chat`;
    } else {
      const other =
        c.dm_user_a === user.id ? c.dm_user_b! : c.dm_user_a!;
      const nm = nameByUser[other];
      title = tHub("dmWith", { name: nm?.trim() || other.slice(0, 8) });
      href = `/app/family/${familyId}/dm/${other}`;
    }
    const last = lastByConv[c.id];
    const timeLabel = last
      ? formatDistanceToNowStrict(new Date(last.created_at), {
          addSuffix: true,
          locale: dateLocale,
        })
      : null;
    return {
      id: c.id,
      href,
      title,
      preview: previewFor(c.id),
      timeLabel,
    };
  });

  const typeById: Record<string, "family" | "direct"> = {};
  for (const c of convs) typeById[c.id] = c.type;

  conversationRows.sort((a, b) => {
    const af = typeById[a.id] === "family";
    const bf = typeById[b.id] === "family";
    if (af && !bf) return -1;
    if (!af && bf) return 1;
    return a.title.localeCompare(b.title, locale, { sensitivity: "base" });
  });

  return (
    <FamilyHubView
      familyId={familyId}
      familyName={familyName}
      currentUserId={user.id}
      members={members}
      conversations={conversationRows}
    />
  );
}
