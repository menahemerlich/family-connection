"use client";

import { Link, usePathname } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export function FamilyNav({ familyId }: { familyId: string }) {
  const t = useTranslations();
  const pathname = usePathname() ?? "";
  const base = `/app/family/${familyId}`;

  const navCls = (path: string, exact?: boolean) => {
    const active = exact
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`);
    return [
      "rounded-md border px-3 py-1.5 text-sm transition",
      active
        ? "border-teal-200 bg-teal-50 font-medium text-teal-900"
        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white",
    ].join(" ");
  };

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50/80 px-1 py-2 sm:px-2">
      <Link href={base} className={navCls(base, true)}>
        {t("nav.hub")}
      </Link>
      <Link href={`${base}/chat`} className={navCls(`${base}/chat`)}>
        {t("nav.chat")}
      </Link>
      <Link href={`${base}/members`} className={navCls(`${base}/members`)}>
        {t("nav.members")}
      </Link>
      <Link href={`${base}/gallery`} className={navCls(`${base}/gallery`)}>
        {t("nav.gallery")}
      </Link>
      <Link href={`${base}/calendar`} className={navCls(`${base}/calendar`)}>
        {t("nav.calendar")}
      </Link>
    </nav>
  );
}
