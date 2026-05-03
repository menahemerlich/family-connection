import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FamilyNav } from "@/components/layout/family-nav";

export default async function FamilySectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; familyId: string }>;
}) {
  const { familyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: mem } = await supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mem) notFound();

  return (
    <div className="flex flex-col gap-4">
      <FamilyNav familyId={familyId} />
      {children}
    </div>
  );
}
