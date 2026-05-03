"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createAlbum, addGalleryItem } from "@/lib/actions/gallery";
import { createClient } from "@/lib/supabase/client";

import { useRouter } from "@/lib/navigation";

export function GalleryManager({
  familyId,
  albums,
}: {
  familyId: string;
  albums: {
    id: string;
    title: string;
    event_tag: string | null;
  }[];
}) {
  const t = useTranslations("gallery");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(albums[0]?.id ?? "");

  async function create() {
    setBusy(true);
    try {
      await createAlbum({
        familyId,
        title,
        eventTag: tag || null,
      });
      setTitle("");
      setTag("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    if (!selectedAlbum) return;
    setBusy(true);
    try {
      const path = `${familyId}/${crypto.randomUUID()}-${file.name}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("family-media")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      await addGalleryItem({
        familyId,
        albumId: selectedAlbum,
        storagePath: path,
        title: file.name,
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-2 font-medium">{t("newAlbum")}</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-md border px-3 py-2 text-sm dark:border-zinc-700"
            placeholder={t("albumTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="flex-1 rounded-md border px-3 py-2 text-sm dark:border-zinc-700"
            placeholder={t("eventTag")}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !title}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => void create()}
          >
            {t("newAlbum")}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="mb-2 font-medium">{t("upload")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border px-2 py-2 text-sm dark:border-zinc-700"
            value={selectedAlbum}
            onChange={(e) => setSelectedAlbum(e.target.value)}
          >
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
                {a.event_tag ? ` · ${a.event_tag}` : ""}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*,video/*"
            disabled={!selectedAlbum}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
