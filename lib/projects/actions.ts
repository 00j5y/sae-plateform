"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { getCurrentMemberAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import {
  projectInputFromFormData,
  projectMemberInputFromFormData,
  projectMemberSchema,
  projectSchema
} from "@/lib/validations/project";

type ProjectSummary = {
  id: string;
  name: string;
};

type ProjectMemberSummary = {
  profileId: string;
  projectId: string;
};

type ProjectMembershipRow = {
  profile_id: string;
  project_id: string;
};

export type ProjectActionResult =
  | { ok: true; project: ProjectSummary }
  | { ok: false; message: string };

export type ProjectMemberActionResult =
  | { ok: true; membership: ProjectMemberSummary }
  | { ok: false; message: string };

type ActiveCaller = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

async function getActiveCaller(): Promise<ActiveCaller | null> {
  const access = await getCurrentMemberAccess();
  if (!access || access.status !== "active") {
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== access.userId) {
    return null;
  }

  return { supabase, userId: user.id };
}

async function isProjectMember(caller: ActiveCaller, projectId: string) {
  const { data, error } = await caller.supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("profile_id", caller.userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function createProject(
  _previousState: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
  try {
    const caller = await getActiveCaller();
    if (!caller) {
      return { ok: false, message: "Seuls les membres actifs connectés peuvent créer un projet." };
    }

    const parsed = projectSchema.safeParse(projectInputFromFormData(formData));
    if (!parsed.success) {
      return { ok: false, message: "Les informations du projet sont invalides." };
    }

    const { data, error } = await caller.supabase.rpc("create_project_with_creator", {
      p_name: parsed.data.name,
      p_description: parsed.data.description,
      p_color: parsed.data.color,
      p_starts_on: parsed.data.startsOn,
      p_ends_on: parsed.data.endsOn
    });

    const project = data as ProjectSummary | null;
    if (error || !project) {
      return { ok: false, message: "Impossible de créer le projet pour le moment." };
    }

    revalidatePath("/projects");
    return { ok: true, project: { id: project.id, name: project.name } };
  } catch {
    return { ok: false, message: "Impossible de créer le projet pour le moment." };
  }
}

export async function addProjectMember(formData: FormData): Promise<ProjectMemberActionResult> {
  try {
    const caller = await getActiveCaller();
    if (!caller) {
      return { ok: false, message: "Seuls les membres actifs connectés peuvent gérer les projets." };
    }

    const parsed = projectMemberSchema.safeParse(projectMemberInputFromFormData(formData));
    if (!parsed.success) {
      return { ok: false, message: "Le membre ou le projet est invalide." };
    }

    if (!await isProjectMember(caller, parsed.data.projectId)) {
      return { ok: false, message: "Vous n’êtes pas membre de ce projet." };
    }

    const { data: member, error: memberError } = await caller.supabase
      .from("profiles")
      .select("id, status")
      .eq("id", parsed.data.profileId)
      .maybeSingle();

    if (memberError || !member || member.status !== "active") {
      return { ok: false, message: "Seuls les membres actifs peuvent rejoindre un projet." };
    }

    const { data: membership, error: membershipError } = await caller.supabase
      .from("project_members")
      .upsert({
        project_id: parsed.data.projectId,
        profile_id: parsed.data.profileId,
        added_by: caller.userId
      }, { onConflict: "project_id,profile_id", ignoreDuplicates: true })
      .select("project_id, profile_id")
      .maybeSingle();

    if (membershipError) {
      return { ok: false, message: "Impossible d’ajouter ce membre au projet." };
    }

    if (membership) {
      const result = membership as ProjectMembershipRow;
      return {
        ok: true,
        membership: { projectId: result.project_id, profileId: result.profile_id }
      };
    }

    return {
      ok: true,
      membership: { projectId: parsed.data.projectId, profileId: parsed.data.profileId }
    };
  } catch {
    return { ok: false, message: "Impossible d’ajouter ce membre au projet." };
  }
}
