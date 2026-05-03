"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAlbum(input: {
  familyId: string;
  title: string;
  description?: string | null;
  eventTag?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("gallery_albums")
    .insert({
      family_id: input.familyId,
      title: input.title,
      description: input.description ?? null,
      event_tag: input.eventTag ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath(`/app/family/${input.familyId}/gallery`);
  return data.id as string;
}

export async function addGalleryItem(input: {
  familyId: string;
  albumId: string;
  storagePath: string;
  title?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("gallery_items").insert({
    family_id: input.familyId,
    album_id: input.albumId,
    storage_path: input.storagePath,
    title: input.title ?? null,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath(`/app/family/${input.familyId}/gallery`);
}
