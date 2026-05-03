import { createClient } from "@/lib/supabase/server";
import { NotificationsForm } from "@/components/notifications/notifications-form";
import { parseFamilyJoin } from "@/lib/supabase/family-join";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settings } = await supabase
    .from("user_notification_settings")
    .select("global_mute, quiet_until, quiet_hours_start, quiet_hours_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: rows } = await supabase
    .from("family_members")
    .select("families ( id, name )")
    .eq("user_id", user.id);

  const famIds =
    (rows ?? [])
      .map((r) => parseFamilyJoin(r.families)?.id)
      .filter((x): x is string => !!x) ?? [];

  let muted: string[] = [];
  if (famIds.length) {
    const { data: mutes } = await supabase
      .from("user_muted_families")
      .select("family_id")
      .eq("user_id", user.id)
      .in("family_id", famIds);
    muted = (mutes ?? []).map((m) => m.family_id as string);
  }

  const families =
    (rows ?? [])
      .map((r) => {
        const f = parseFamilyJoin(r.families);
        return f
          ? { id: f.id, name: f.name, muted: muted.includes(f.id) }
          : null;
      })
      .filter(
        (x): x is { id: string; name: string; muted: boolean } => !!x,
      );

  return (
    <NotificationsForm
      settings={settings ?? null}
      families={families}
    />
  );
}
