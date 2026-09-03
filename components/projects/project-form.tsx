"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createProject, type ProjectActionResult } from "@/lib/projects/actions";

const initialState: ProjectActionResult | null = null;

export function ProjectForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createProject, initialState);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [router, state]);

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="project-name">Nom du projet</label>
        <input id="project-name" maxLength={100} name="name" required type="text" />
      </div>
      <div>
        <label htmlFor="project-description">Description</label>
        <textarea id="project-description" maxLength={10_000} name="description" rows={4} />
      </div>
      <div>
        <label htmlFor="project-color">Couleur</label>
        <input defaultValue="#6D4AFF" id="project-color" name="color" type="color" />
      </div>
      <div>
        <label htmlFor="project-starts-on">Date de début</label>
        <input id="project-starts-on" name="startsOn" type="date" />
      </div>
      <div>
        <label htmlFor="project-ends-on">Date de fin</label>
        <input id="project-ends-on" name="endsOn" type="date" />
      </div>
      {state && !state.ok ? <p className="form-error" role="alert">{state.message}</p> : null}
      {state?.ok ? <p role="status">Projet « {state.project.name} » créé.</p> : null}
      <button disabled={isPending} type="submit">
        {isPending ? "Création…" : "Créer le projet"}
      </button>
    </form>
  );
}
