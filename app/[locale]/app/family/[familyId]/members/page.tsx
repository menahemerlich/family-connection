import { Link } from "@/lib/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ locale: string; familyId: string }>;
}) {
  const { familyId } = await params;
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: rows } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId);

  const ids = (rows ?? []).map((r) => r.user_id as string);
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const nameById = Object.fromEntries(
    (profs ?? []).map((p) => [p.id, p.display_name as string | null]),
  );

  const members = ids.map((id) => ({ id, name: nameById[id] ?? null }));

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t("nav.members")}</h2>
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <span>{m.name ?? m.id}</span>
            {m.id !== user.id && (
              <Link
                className="text-xs underline"
                href={`/app/family/${familyId}/dm/${m.id}`}
              >
                {t("chat.openDm")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
