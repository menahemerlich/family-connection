import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="max-w-lg text-center space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("meta.title")}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{t("home.tagline")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <Link
            href="/app"
            className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {t("home.ctaDashboard")}
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {t("home.ctaLogin")}
          </Link>
        )}
        {!user && (
          <Link
            href="/register"
            className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {t("nav.signUp")}
          </Link>
        )}
      </div>
      <p className="text-xs text-zinc-500">{locale.toUpperCase()}</p>
    </div>
  );
}
