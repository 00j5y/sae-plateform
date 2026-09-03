alter table storage.buckets
  alter column file_size_limit set default 5242880;

update storage.buckets
set file_size_limit = 5242880
where id = 'task-attachments';

create or replace function public.can_manage_task_attachment_path(target_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
begin
  if target_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$' then
    return false;
  end if;
  return exists (
    select 1
    from public.tasks
    where tasks.project_id = split_part(target_name, '/', 1)::uuid
      and tasks.id = split_part(target_name, '/', 2)::uuid
      and public.is_project_member(tasks.project_id)
  );
end;
$$;

revoke all on function public.can_manage_task_attachment_path(text) from public;
grant execute on function public.can_manage_task_attachment_path(text) to authenticated;

drop policy if exists "project members upload task attachments" on storage.objects;
create policy "project members upload task attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-attachments'
  and public.can_manage_task_attachment_path(name)
);

drop policy if exists "project members delete task attachments" on storage.objects;
create policy "project members delete task attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'task-attachments'
  and public.can_manage_task_attachment_path(name)
);
