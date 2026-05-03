import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, birth_date, preferred_locale")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="flex justify-center py-6">
      <ProfileForm
        initial={{
          display_name: profile?.display_name ?? null,
          birth_date: profile?.birth_date ?? null,
          preferred_locale: profile?.preferred_locale ?? "he",
        }}
      />
    </div>
  );
}
