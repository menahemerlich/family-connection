"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  updateGlobalNotificationSettings,
  setFamilyMuted,
} from "@/lib/actions/notifications";

export function NotificationsForm({
  settings,
  families,
}: {
  settings: {
    global_mute: boolean;
    quiet_until: string | null;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
  } | null;
  families: { id: string; name: string; muted: boolean }[];
}) {
  const t = useTranslations("notifications");
  const [globalMute, setGlobalMute] = useState(
    settings?.global_mute ?? false,
  );
  const [quietUntil, setQuietUntil] = useState(
    settings?.quiet_until ? settings.quiet_until.slice(0, 16) : "",
  );
  const [qhStart, setQhStart] = useState(settings?.quiet_hours_start ?? "");
  const [qhEnd, setQhEnd] = useState(settings?.quiet_hours_end ?? "");
  const [localFamilies, setLocalFamilies] = useState(families);
  const [busy, setBusy] = useState(false);

  async function saveGlobals(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateGlobalNotificationSettings({
        global_mute: globalMute,
        quiet_until: quietUntil ? new Date(quietUntil).toISOString() : null,
        quiet_hours_start: qhStart || null,
        quiet_hours_end: qhEnd || null,
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleFamily(id: string, muted: boolean) {
    await setFamilyMuted(id, muted);
    setLocalFamilies((prev) =>
      prev.map((f) => (f.id === id ? { ...f, muted } : f)),
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <form onSubmit={saveGlobals} className="space-y-3 rounded-lg border p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={globalMute}
            onChange={(e) => setGlobalMute(e.target.checked)}
          />
          {t("globalMute")}
        </label>
        <label className="text-sm">
          {t("quietUntil")}
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
            value={quietUntil}
            onChange={(e) => setQuietUntil(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            {t("quietHours")} (start)
            <input
              type="time"
              className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
              value={qhStart ?? ""}
              onChange={(e) => setQhStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {t("quietHours")} (end)
            <input
              type="time"
              className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
              value={qhEnd ?? ""}
              onChange={(e) => setQhEnd(e.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "…" : "Save"}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="font-medium">{t("muteFamily")}</h2>
        <ul className="space-y-2">
          {localFamilies.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{f.name}</span>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={f.muted}
                  onChange={(e) => void toggleFamily(f.id, e.target.checked)}
                />
                mute
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
