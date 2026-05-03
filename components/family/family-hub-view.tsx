"use client";

import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export type HubMember = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type HubConversationRow = {
  id: string;
  href: string;
  title: string;
  preview: string;
  timeLabel: string | null;
};

function initials(name: string | null): string {
  const t = name?.trim();
  if (!t) return "?";
  return t.slice(0, 1).toUpperCase();
}

function MemberAvatar({
  id,
  displayName,
  avatarUrl,
}: {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const label = displayName ?? id.slice(0, 8);
  if (avatarUrl) {
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white sm:h-[4.5rem] sm:w-[4.5rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          width={72}
          height={72}
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-teal-50 text-base font-medium text-teal-800 sm:h-[4.5rem] sm:w-[4.5rem] sm:text-lg"
      aria-hidden
    >
      {initials(displayName)}
    </div>
  );
}

export function FamilyHubView({
  familyId,
  familyName,
  currentUserId,
  members,
  conversations,
}: {
  familyId: string;
  familyName: string;
  currentUserId: string;
  members: HubMember[];
  conversations: HubConversationRow[];
}) {
  const t = useTranslations("hub");
  const tNav = useTranslations("nav");

  return (
    <div className="space-y-10">
      <header className="space-y-1 border-b border-slate-200 pb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {familyName}
        </h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          {t("membersTitle")}
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noMembers")}</p>
        ) : (
          <ul className="flex flex-wrap gap-6">
            {members.map((m) => (
              <li key={m.id} className="flex w-[5.5rem] flex-col items-center gap-2 sm:w-[6rem]">
                {m.id === currentUserId ? (
                  <div className="rounded-full ring-2 ring-teal-600 ring-offset-2">
                    <MemberAvatar
                      id={m.id}
                      displayName={m.displayName}
                      avatarUrl={m.avatarUrl}
                    />
                  </div>
                ) : (
                  <Link
                    href={`/app/family/${familyId}/dm/${m.id}`}
                    className="rounded-full ring-offset-2 transition hover:ring-2 hover:ring-teal-600 focus-visible:outline focus-visible:ring-2 focus-visible:ring-teal-600"
                    aria-label={t("openDmWith", {
                      name: m.displayName ?? m.id.slice(0, 8),
                    })}
                  >
                    <MemberAvatar
                      id={m.id}
                      displayName={m.displayName}
                      avatarUrl={m.avatarUrl}
                    />
                  </Link>
                )}
                <span className="max-w-full truncate text-center text-xs text-slate-700">
                  {m.displayName ?? m.id.slice(0, 6)}
                  {m.id === currentUserId ? (
                    <span className="block text-[10px] font-normal text-teal-700">({t("you")})</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/app/family/${familyId}/gallery`}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-800 transition hover:border-teal-300 hover:bg-teal-50/40"
        >
          <span>{tNav("gallery")}</span>
          <span className="text-slate-400" aria-hidden>
            →
          </span>
        </Link>
        <Link
          href={`/app/family/${familyId}/calendar`}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-800 transition hover:border-teal-300 hover:bg-teal-50/40"
        >
          <span>{tNav("calendar")}</span>
          <span className="text-slate-400" aria-hidden>
            →
          </span>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          {t("conversationsTitle")}
        </h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noConversations")}</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={c.href}
                  className="block px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{c.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{c.preview}</p>
                    </div>
                    {c.timeLabel ? (
                      <time className="shrink-0 text-xs tabular-nums text-slate-400">
                        {c.timeLabel}
                      </time>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
