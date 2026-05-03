"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(values: {
  display_name?: string | null;
  birth_date?: string | null;
  preferred_locale?: "he" | "en";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (values.display_name !== undefined) patch.display_name = values.display_name;
  if (values.birth_date !== undefined) patch.birth_date = values.birth_date || null;
  if (values.preferred_locale !== undefined) {
    patch.preferred_locale = values.preferred_locale;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/", "layout");
}
