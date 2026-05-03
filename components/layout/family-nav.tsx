"use client";

import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export function FamilyNav({ familyId }: { familyId: string }) {
  const t = useTranslations();
  const base = `/app/family/${familyId}`;
  const cls =
    "rounded-full px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900";
  return (
    <nav className="flex flex-wrap gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
      <Link href={`${base}/chat`} className={cls}>
        {t("nav.chat")}
      </Link>
      <Link href={`${base}/members`} className={cls}>
        {t("nav.members")}
      </Link>
      <Link href={`${base}/gallery`} className={cls}>
        {t("nav.gallery")}
      </Link>
      <Link href={`${base}/calendar`} className={cls}>
        {t("nav.calendar")}
      </Link>
    </nav>
  );
}
