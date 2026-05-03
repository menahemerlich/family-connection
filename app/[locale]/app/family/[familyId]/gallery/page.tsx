import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { GalleryManager } from "@/components/gallery/gallery-manager";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string; familyId: string }>;
}) {
  await getTranslations("gallery");
  const { familyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: albums } = await supabase
    .from("gallery_albums")
    .select("id, title, event_tag")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  const list = albums ?? [];

  const { data: items } = await supabase
    .from("gallery_items")
    .select("id, title, storage_path, album_id")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(60);

  const signed: { id: string; url: string; title: string | null }[] = [];
  for (const it of items ?? []) {
    const { data } = await supabase.storage
      .from("family-media")
      .createSignedUrl(it.storage_path as string, 600);
    if (data?.signedUrl) {
      signed.push({
        id: it.id as string,
        url: data.signedUrl,
        title: (it.title as string | null) ?? null,
      });
    }
  }

  return (
    <div className="space-y-6">
      <GalleryManager familyId={familyId} albums={list} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {signed.map((s) => (
          <figure
            key={s.id}
            className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.url} alt="" className="aspect-square object-cover" />
            <figcaption className="truncate px-2 py-1 text-xs text-zinc-600">
              {s.title}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
