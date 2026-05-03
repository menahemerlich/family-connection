"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/actions/calendar";

export function CalendarClient({
  familyId,
  events,
  birthdays,
}: {
  familyId: string;
  events: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    reminder_minutes_before: number | null;
  }[];
  birthdays: { name: string; day: number }[];
}) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [reminder, setReminder] = useState("30");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!starts) return;
    setBusy(true);
    try {
      await createCalendarEvent({
        familyId,
        title,
        startsAt: new Date(starts).toISOString(),
        endsAt: ends ? new Date(ends).toISOString() : null,
        reminderMinutesBefore: reminder ? Number(reminder) : null,
      });
      setTitle("");
      setStarts("");
      setEnds("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("OK?")) return;
    await deleteCalendarEvent(familyId, id);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={submit}
        className="grid max-w-xl gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2 className="font-medium">{t("newEvent")}</h2>
        <input
          required
          className="rounded-md border px-3 py-2 text-sm dark:border-zinc-700"
          placeholder={t("eventTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="text-sm">
          {t("starts")}
          <input
            type="datetime-local"
            required
            className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
          />
        </label>
        <label className="text-sm">
          {t("ends")}
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
          />
        </label>
        <label className="text-sm">
          {t("reminder")}
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-md border px-3 py-2 dark:border-zinc-700"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t("save")}
        </button>
      </form>

      {birthdays.length > 0 && (
        <div>
          <h3 className="mb-2 font-medium">{t("birthdaysThisMonth")}</h3>
          <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            {birthdays.map((b) => (
              <li key={`${b.name}-${b.day}`}>
                {b.name} — {b.day}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-2">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <div>
              <div className="font-medium">{ev.title}</div>
              <div className="text-xs text-zinc-600">
                {new Date(ev.starts_at).toLocaleString()}
                {ev.reminder_minutes_before != null &&
                  ` · ${ev.reminder_minutes_before}′`}
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-red-600 underline"
              onClick={() => void remove(ev.id)}
            >
              {t("delete")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
