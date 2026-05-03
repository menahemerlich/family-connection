"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  getGoogleOAuthUrl,
  signUpWithEmailPassword,
} from "@/lib/actions/auth";
import { Link, useRouter } from "@/lib/navigation";
import { useState } from "react";

export function RegisterForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    const origin = window.location.origin;

    try {
      const res = await signUpWithEmailPassword(email, password, locale, origin);

      if (!res.ok) {
        setErr(res.message);
        return;
      }

      if (res.session) {
        router.push("/app");
        router.refresh();
        return;
      }

      setInfo(t("auth.confirmEmailHint"));
    } catch (unknown) {
      const message =
        unknown instanceof Error ? unknown.message : String(unknown);
      if (message.includes("fetch") || message === "Failed to fetch") {
        setErr(t("auth.networkError"));
      } else {
        setErr(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const origin = window.location.origin;
      const res = await getGoogleOAuthUrl(locale, origin);
      if (!res.ok || !res.url) {
        setErr(res.message ?? t("auth.googleConfig"));
        return;
      }
      window.location.assign(res.url);
    } catch {
      setErr(t("auth.googleConfig"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("auth.signUpTitle")}</h1>
      <label className="flex flex-col gap-1 text-sm">
        {t("auth.email")}
        <input
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("auth.password")}
        <input
          type="password"
          required
          autoComplete="new-password"
          minLength={6}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {info && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {info}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {t("nav.signUp")}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void google()}
        className="rounded-md border border-zinc-300 py-2 text-sm dark:border-zinc-700"
      >
        {t("auth.google")}
      </button>
      <p className="text-center text-sm text-zinc-600">
        <Link href="/login" className="underline">
          {t("auth.hasAccount")}
        </Link>
      </p>
    </form>
  );
}
