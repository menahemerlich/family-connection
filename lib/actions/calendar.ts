"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCalendarEvent(input: {
  familyId: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  reminderMinutesBefore?: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("calendar_events").insert({
    family_id: input.familyId,
    title: input.title,
    description: input.description ?? null,
    starts_at: input.startsAt,
    ends_at: input.endsAt ?? null,
    reminder_minutes_before: input.reminderMinutesBefore ?? null,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath(`/app/family/${input.familyId}/calendar`);
}

export async function deleteCalendarEvent(familyId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("family_id", familyId);
  if (error) throw error;
  revalidatePath(`/app/family/${familyId}/calendar`);
}
