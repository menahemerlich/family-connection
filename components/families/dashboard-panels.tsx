"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createFamily, sendInvitation } from "@/lib/actions/families";
import { Link, useRouter } from "@/lib/navigation";

export function CreateFamilyForm() {
  const t = useTranslations("family");
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const id = await createFamily(name);
      router.push(`/app/family/${id}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-md flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-medium">{t("create")}</h2>
      <input
        required
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        placeholder={t("name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-zinc-900 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {t("create")}
      </button>
    </form>
  );
}

export function InviteFamilyCard({
  familyId,
  joinUrl,
}: {
  familyId: string;
  joinUrl?: string | null;
}) {
  const t = useTranslations("family");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(joinUrl ?? null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await sendInvitation(familyId, email, locale);
      setLink(res.joinUrl);
      setEmail("");
    } catch {
      /* handled visually */
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-md flex-col gap-2 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
    >
      <h3 className="text-sm font-medium">{t("sendInvite")}</h3>
      <input
        type="email"
        required
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        placeholder={t("inviteEmail")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md border py-2 text-sm dark:border-zinc-700"
      >
        {t("sendInvite")}
      </button>
      {link && (
        <p className="break-all text-xs text-zinc-600">
          {t("inviteHint")} <br />
          <a className="underline" href={link}>
            {link}
          </a>
        </p>
      )}
    </form>
  );
}

export function FamilyList({
  families,
}: {
  families: { id: string; name: string }[];
}) {
  const t = useTranslations("family");
  if (!families.length) {
    return <p className="text-sm text-zinc-600">{t("none")}</p>;
  }
  return (
    <ul className="space-y-2">
      {families.map((f) => (
        <li key={f.id}>
          <Link
            href={`/app/family/${f.id}`}
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            {f.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
