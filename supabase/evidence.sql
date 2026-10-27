-- Spectrum Home Ed: private photo and video evidence attached to lessons.
-- Files live in a private storage bucket under <parent's user id>/..., so each family can only reach its own folder.

alter table public.children add column if not exists media_consent_at timestamptz;

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete cascade,
  lesson_key text,
  lesson_title text check (char_length(lesson_title) <= 120),
  areas text[] not null default '{}',
  kind text not null check (kind in ('photo','video')),
  path text not null unique check (char_length(path) <= 300),
  bytes bigint,
  caption text check (char_length(caption) <= 300),
  taken_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists evidence_plan on public.evidence (plan_id);
create index if not exists evidence_child on public.evidence (child_id, taken_on);
alter table public.evidence enable row level security;
drop policy if exists "own evidence" on public.evidence;
create policy "own evidence" on public.evidence for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid() and exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));
grant select, insert, update, delete on public.evidence to authenticated;
grant all on public.evidence to service_role;

-- Private bucket: 60 MB per file, photos and common phone video formats only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 62914560, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "evidence own read" on storage.objects;
drop policy if exists "evidence own insert" on storage.objects;
drop policy if exists "evidence own delete" on storage.objects;
create policy "evidence own read" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage used, for the admin dashboard
create or replace function public.admin_storage() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return json_build_object(
    'files', (select count(*) from evidence),
    'photos', (select count(*) from evidence where kind = 'photo'),
    'videos', (select count(*) from evidence where kind = 'video'),
    'bytes', (select coalesce(sum(bytes), 0) from evidence),
    'families', (select count(distinct parent_id) from evidence)
  );
end $$;
revoke all on function public.admin_storage() from public, anon;
grant execute on function public.admin_storage() to authenticated;
