"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { createAttachmentUpload, deleteTaskAttachment, registerTaskAttachment, signedTaskAttachmentUrl } from "@/lib/tasks/collaboration-actions";
import type { TaskAttachment } from "@/lib/kanban/types";
import { taskImageConstraints, validateTaskImage } from "@/lib/kanban/utils";
import { createClient } from "@/lib/supabase/client";

type Props = { projectId: string; taskId: string; attachments: TaskAttachment[]; currentUserId: string };

export function AttachmentUploader({ projectId, taskId, attachments, currentUserId }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [visibleImages, setVisibleImages] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const upload = (file: File) => startTransition(async () => {
    const validated = validateTaskImage(file);
    if (!validated.ok) { setMessage(validated.message); return; }
    const path = `${projectId}/${taskId}/${crypto.randomUUID()}`;
    const input = { projectId, taskId, path, filename: file.name, mimeType: file.type as "image/png" | "image/jpeg" | "image/webp", sizeBytes: file.size };
    const signed = await createAttachmentUpload(input);
    if (!signed.ok) { setMessage(signed.message); return; }
    const { error: uploadError } = await createClient().storage.from("task-attachments").uploadToSignedUrl(path, signed.token, file, { contentType: file.type });
    if (uploadError) { setMessage("Impossible d’envoyer le fichier."); return; }
    const registered = await registerTaskAttachment(input);
    setMessage(registered.ok ? "Image ajoutée." : registered.message);
    if (registered.ok) { router.refresh(); if (fileInput.current) fileInput.current.value = ""; }
  });
  const show = (attachment: TaskAttachment) => startTransition(async () => {
    const result = await signedTaskAttachmentUrl(attachment.id);
    setMessage(result.ok ? "Image affichée pendant une minute." : result.message);
    if (result.ok) setVisibleImages((images) => ({ ...images, [attachment.id]: result.url }));
  });
  const remove = (attachment: TaskAttachment) => {
    if (!window.confirm("Supprimer définitivement cette image ?")) return;
    startTransition(async () => {
      const result = await deleteTaskAttachment(attachment.id);
      setMessage(result.ok ? "Image supprimée." : result.message);
      if (result.ok) router.refresh();
    });
  };
  return (
    <section className="attachment-uploader" aria-labelledby={`attachments-${taskId}`}>
      <h3 id={`attachments-${taskId}`}>Images</h3>
      <label>
        Ajouter une image (PNG, JPEG ou WebP, 5 MiB maximum)
        <input ref={fileInput} accept={taskImageConstraints.acceptedTypes.join(",")} disabled={pending} type="file" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) upload(file);
        }} />
      </label>
      <ul>{attachments.map((attachment) => <li key={attachment.id}>
        <span>{attachment.filename} ({Math.ceil(attachment.sizeBytes / 1024)} Ko)</span>
        <button className="text-button" disabled={pending} onClick={() => show(attachment)} type="button">Afficher</button>
        {attachment.uploadedBy === currentUserId ? <button className="text-button danger-button" disabled={pending} onClick={() => remove(attachment)} type="button">Supprimer</button> : null}
        {visibleImages[attachment.id] ? (
          // eslint-disable-next-line @next/next/no-img-element -- The short-lived signed URL belongs to the authenticated storage session.
          <img alt={`Aperçu : ${attachment.filename}`} src={visibleImages[attachment.id]} />
        ) : null}
      </li>)}</ul>
      <p aria-live="polite" className="form-status">{message}</p>
    </section>
  );
}
