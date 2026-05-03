"use client";

import { useTranslations } from "next-intl";
import { acceptInvitation } from "@/lib/actions/families";
import { useRouter } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function JoinInner() {
  const t = useTranslations("join");
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const familyId = await acceptInvitation(token);
      router.push(`/app/family/${familyId}/chat`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-red-600">{t("missingToken")}</p>;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="rounded-md bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {busy ? "…" : t("cta")}
      </button>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <p className="text-xs text-zinc-500">{t("hintSignIn")}</p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Suspense fallback={<p>…</p>}>
        <JoinInner />
      </Suspense>
    </div>
  );
}
