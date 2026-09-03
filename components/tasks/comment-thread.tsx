"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createTaskComment, deleteTaskComment } from "@/lib/tasks/collaboration-actions";
import type { TaskComment } from "@/lib/kanban/types";

type Props = { taskId: string; comments: TaskComment[]; currentUserId: string };

export function CommentThread({ taskId, comments, currentUserId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = () => startTransition(async () => {
    const result = await createTaskComment({ taskId, body });
    setMessage(result.ok ? "Commentaire ajouté." : result.message);
    if (result.ok) { setBody(""); router.refresh(); }
  });
  const remove = (comment: TaskComment) => {
    if (!window.confirm("Supprimer définitivement ce commentaire ?")) return;
    startTransition(async () => {
      const result = await deleteTaskComment(comment.id);
      setMessage(result.ok ? "Commentaire supprimé." : result.message);
      if (result.ok) router.refresh();
    });
  };
  return (
    <section className="comment-thread" aria-labelledby={`comments-${taskId}`}>
      <h3 id={`comments-${taskId}`}>Commentaires</h3>
      <ul>{comments.map((comment) => (
        <li key={comment.id}>
          <p><strong>{comment.authorName}</strong> <time dateTime={comment.createdAt}>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.createdAt))}</time></p>
          <p>{comment.body}</p>
          {comment.authorId === currentUserId ? <button className="text-button" disabled={pending} onClick={() => remove(comment)} type="button">Supprimer</button> : null}
        </li>
      ))}</ul>
      <label>
        Ajouter un commentaire
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={3} />
      </label>
      <button className="secondary-button" disabled={pending || !body.trim()} onClick={submit} type="button">Publier le commentaire</button>
      <p aria-live="polite" className="form-status">{message}</p>
    </section>
  );
}
