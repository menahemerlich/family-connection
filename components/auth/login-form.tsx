"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  getGoogleOAuthUrl,
  signInWithEmailPassword,
} from "@/lib/actions/auth";
import { Link, useRouter } from "@/lib/navigation";
import { useState } from "react";

export function LoginForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await signInWithEmailPassword(email, password);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      router.push("/app");
      router.refresh();
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
      <h1 className="text-xl font-semibold">{t("auth.signInTitle")}</h1>
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
          autoComplete="current-password"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {t("nav.signIn")}
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
        <Link href="/register" className="underline">
          {t("auth.noAccount")}
        </Link>
      </p>
    </form>
  );
}
