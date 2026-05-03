"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/navigation";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export function AppHeader({
  userEmail,
  families,
  activeFamilyId,
}: {
  userEmail: string | null;
  families: { id: string; name: string }[];
  activeFamilyId: string | null;
}) {
  const t = useTranslations();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app" className="font-semibold">
            {t("meta.title")}
          </Link>
          <span className="hidden text-sm text-zinc-500 sm:inline">{userEmail}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600">{t("family.active")}</span>
            <select
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={activeFamilyId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                router.push(`/app/family/${id}/chat`);
                router.refresh();
              }}
            >
              {families.length === 0 && (
                <option value="">{t("family.none")}</option>
              )}
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/app/profile"
            className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            {t("nav.profile")}
          </Link>
          <Link
            href="/app/notifications"
            className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            {t("nav.notifications")}
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          >
            {t("nav.signOut")}
          </button>
        </div>
      </div>
    </header>
  );
}
