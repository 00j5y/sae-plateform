import { revalidatePath } from "next/cache";

import { getCurrentMemberAccess } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { activateMemberSchema } from "@/lib/validations/member";

async function activateMember(formData: FormData) {
  "use server";

  const parsed = activateMemberSchema.safeParse({ profileId: formData.get("profileId") });
  if (!parsed.success) {
    throw new Error("Profil à activer invalide.");
  }

  const access = await getCurrentMemberAccess();
  if (!access || access.status !== "active") {
    throw new Error("Seuls les membres actifs peuvent activer un accès.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== access.userId) {
    throw new Error("Session membre invalide.");
  }

  const { data: caller, error: callerError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  if (callerError || caller?.status !== "active") {
    throw new Error("Seuls les membres actifs peuvent activer un accès.");
  }

  const admin = createAdminClient();
  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({
      status: "active",
      activated_at: new Date().toISOString(),
      activated_by: user.id
    })
    .eq("id", parsed.data.profileId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updatedProfile) {
    throw new Error("Impossible d’activer ce membre.");
  }

  revalidatePath("/members");
}

export function ActivateMemberForm({ profileId }: { profileId: string }) {
  return (
    <form action={activateMember}>
      <input name="profileId" type="hidden" value={profileId} />
      <button className="secondary-button" type="submit">Activer</button>
    </form>
  );
}
