"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useState } from "react";
import { updateProfile } from "@/lib/actions/profile";

export function ProfileForm({
  initial,
}: {
  initial: {
    display_name: string | null;
    birth_date: string | null;
    preferred_locale: string | null;
  };
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const locale = useLocale();
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [birthDate, setBirthDate] = useState(
    initial.birth_date ? initial.birth_date.slice(0, 10) : "",
  );
  const [loc, setLoc] = useState(
    (initial.preferred_locale as "he" | "en" | null) ?? (locale as "he" | "en"),
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({
        display_name: displayName,
        birth_date: birthDate || null,
        preferred_locale: loc,
      });
      if (loc !== locale) {
        router.replace(`/${loc}/app/profile`);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex max-w-md flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <label className="text-sm">
        {t("displayName")}
        <input
          className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>
      <label className="text-sm">
        {t("birthDate")}
        <input
          type="date"
          className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </label>
      <label className="text-sm">
        {t("locale")}
        <select
          className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
          value={loc}
          onChange={(e) => setLoc(e.target.value as "he" | "en")}
        >
          <option value="he">עברית</option>
          <option value="en">English</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-zinc-900 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {t("save")}
      </button>
    </form>
  );
}
