-- Spectrum Home Ed: registration pack (education program document) per child
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  state text not null,
  title text,
  content jsonb not null,          -- { sections: [{ heading, body }], answers, doc_name }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists programs_child on public.programs (child_id, created_at desc);
alter table public.programs enable row level security;
drop policy if exists "own programs" on public.programs;
create policy "own programs" on public.programs for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
grant select, insert, update, delete on public.programs to authenticated;
grant all on public.programs to service_role;
alter table public.plan_jobs add column if not exists program_id uuid references public.programs(id) on delete set null;
