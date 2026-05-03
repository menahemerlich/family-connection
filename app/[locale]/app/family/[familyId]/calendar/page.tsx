import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { CalendarClient } from "@/components/calendar/calendar-client";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string; familyId: string }>;
}) {
  await getTranslations("calendar");
  const { familyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: evs } = await supabase
    .from("calendar_events")
    .select("id, title, starts_at, ends_at, reminder_minutes_before")
    .eq("family_id", familyId)
    .order("starts_at", { ascending: true });

  const { data: mems } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId);

  const ids = (mems ?? []).map((m) => m.user_id as string);
  const now = new Date();
  const month = now.getMonth() + 1;

  let birthdayRows: { display_name: string | null; birth_date: string }[] = [];
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("display_name, birth_date")
      .in("id", ids)
      .not("birth_date", "is", null);
    birthdayRows =
      (profs ?? []).filter((p) => {
        const d = new Date(p.birth_date as string);
        return d.getMonth() + 1 === month;
      }) as typeof birthdayRows;
  }

  const birthdays = birthdayRows.map((p) => ({
    name: p.display_name ?? "?",
    day: new Date(p.birth_date).getDate(),
  }));

  return (
    <CalendarClient
      familyId={familyId}
      events={evs ?? []}
      birthdays={birthdays}
    />
  );
}
