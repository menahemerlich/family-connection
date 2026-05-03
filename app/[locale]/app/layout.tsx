import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { parseFamilyJoin } from "@/lib/supabase/family-join";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  if (!user) {
    throw new Error("Unauthorized");
  }

  const userId = user.id;

  const { data: rows } = await supabase
    .from("family_members")
    .select("families ( id, name )")
    .eq("user_id", userId);

  const families =
    (rows ?? [])
      .map((r) => parseFamilyJoin(r.families))
      .filter((x): x is { id: string; name: string } => x !== null);

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_active_family_id")
    .eq("id", userId)
    .maybeSingle();

  const activeFamilyId =
    profile?.last_active_family_id &&
    families.some((f) => f.id === profile.last_active_family_id)
      ? profile.last_active_family_id
      : families[0]?.id ?? null;

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader
        userEmail={user.email ?? null}
        families={families}
        activeFamilyId={activeFamilyId}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
        {children}
      </main>
    </div>
  );
}
