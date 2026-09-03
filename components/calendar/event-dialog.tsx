"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/lib/calendar/actions";
import { getDialogAnchor, type DialogAnchor, type DialogSourceRect } from "@/lib/calendar/dialog-anchor";
import type { CalendarItem, CalendarEventType } from "@/lib/calendar/types";
import { focusTrapIndex } from "@/lib/kanban/dialog-focus";
import type { Project } from "@/lib/kanban/types";

type Props = { event?: CalendarItem; projects: Project[]; sourceRect?: DialogSourceRect; onClose: () => void; onAnnounce: (message: string) => void };
const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

function localDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function EventDialog({ event, projects, sourceRect, onClose, onAnnounce }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [message, setMessage] = useState("");
  const [anchor, setAnchor] = useState<DialogAnchor>();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(event);
  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial = dialogRef.current?.querySelector<HTMLElement>("[data-dialog-initial]") ?? dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
    initial?.focus();
    return () => returnFocusRef.current?.focus();
  }, []);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !sourceRect) { setAnchor(undefined); return; }
    setAnchor(getDialogAnchor(sourceRect, { width: window.innerWidth, height: window.innerHeight }, { width: dialog.offsetWidth, height: dialog.offsetHeight }));
  }, [sourceRect]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])];
    const next = focusTrapIndex(controls.length, controls.indexOf(document.activeElement as HTMLElement), event.shiftKey);
    if (next !== null) { event.preventDefault(); controls[next]?.focus(); }
  };
  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const start = new Date(String(data.get("startsAt")));
    const end = new Date(String(data.get("endsAt")));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) { setMessage("Les dates de l’événement sont invalides."); return; }
    const startsAt = start.toISOString();
    const endsAt = end.toISOString();
    const input = { projectId: String(data.get("projectId")), title: String(data.get("title")), eventType: String(data.get("eventType")) as CalendarEventType, startsAt, endsAt, description: String(data.get("description")) };
    startTransition(async () => {
      const result = editing ? await updateCalendarEvent(event!.id.replace("event:", ""), input) : await createCalendarEvent(input);
      if (!result.ok) { setMessage(result.message); onAnnounce(result.message); return; }
      onAnnounce(editing ? "Événement modifié." : "Événement créé."); router.refresh(); onClose();
    });
  };
  const onSubmit = (formEvent: FormEvent<HTMLFormElement>) => { formEvent.preventDefault(); submit(formEvent.currentTarget); };
  const remove = () => startTransition(async () => {
    if (!event) return;
    const result = await deleteCalendarEvent(event.id.replace("event:", ""));
    if (!result.ok) { setMessage(result.message); onAnnounce(result.message); return; }
    onAnnounce("Événement supprimé."); router.refresh(); onClose();
  });
  return <div className="dialog-backdrop"><section aria-labelledby="calendar-event-title" aria-modal="true" className="task-dialog calendar-dialog" onKeyDown={onKeyDown} ref={dialogRef} role="dialog" style={anchor ? { position: "fixed", top: anchor.top, left: anchor.left } : undefined}>
    <button aria-label="Fermer l’événement" className="dialog-close" onClick={onClose} type="button">×</button>
    <p className="eyebrow">Calendrier</p><h2 id="calendar-event-title">{editing ? "Modifier l’événement" : "Nouvel événement"}</h2>
    {projects.length === 0 ? <p className="form-error" role="alert">Vous devez être membre d’une SAE pour créer un événement.</p> : <form className="task-form" onSubmit={onSubmit}>
      <label>SAE<select defaultValue={event?.projectId ?? projects[0]?.id} name="projectId" required>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label>Titre<input data-dialog-initial defaultValue={event?.title ?? ""} maxLength={160} name="title" required /></label>
      <label>Type<select defaultValue={event?.eventType ?? "dev"} name="eventType"><option value="dev">Développement</option><option value="testing">Tests</option><option value="bugfix">Correction</option><option value="meeting">Réunion</option><option value="deadline">Rendu</option></select></label>
      <label>Début<input defaultValue={localDate(event?.start)} name="startsAt" required type="datetime-local" /></label>
      <label>Fin<input defaultValue={localDate(event?.end)} name="endsAt" required type="datetime-local" /></label>
      <label>Description<textarea defaultValue={event?.description ?? ""} maxLength={10_000} name="description" rows={4} /></label>
      {message ? <p className="form-error" role="alert">{message}</p> : null}<p aria-live="polite" className="form-status">{pending ? "Enregistrement en cours…" : ""}</p>
      <div className="calendar-dialog-actions"><button className="primary-button" disabled={pending} type="submit">{editing ? "Enregistrer" : "Créer l’événement"}</button>{editing ? <button className="text-button danger-button" disabled={pending} onClick={remove} type="button">Supprimer</button> : null}</div>
    </form>}
  </section></div>;
}
