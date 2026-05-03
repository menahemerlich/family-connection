import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  CreateFamilyForm,
  FamilyList,
  InviteFamilyCard,
} from "@/components/families/dashboard-panels";
import { parseFamilyJoin } from "@/lib/supabase/family-join";

export default async function DashboardPage() {
  const t = await getTranslations("family");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("family_members")
    .select("families ( id, name )")
    .eq("user_id", user.id);

  const families =
    (rows ?? [])
      .map((r) => parseFamilyJoin(r.families))
      .filter((x): x is { id: string; name: string } => x !== null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("yourFamilies")}</h1>
        <div className="mt-4">
          <FamilyList families={families} />
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {families.map((f) => (
          <InviteFamilyCard key={f.id} familyId={f.id} />
        ))}
      </div>
      <CreateFamilyForm />
    </div>
  );
}
