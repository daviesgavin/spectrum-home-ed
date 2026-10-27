-- Spectrum Home Ed: working level per subject, and worksheets
alter table public.children add column if not exists levels jsonb not null default '{}'::jsonb;

create table if not exists public.worksheets (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  lesson_key text,
  subject text not null,
  level text,
  topic text,
  content jsonb not null,          -- { title, intro, teach, key_words[], sections: [{ heading, items: [...] }] }
  created_at timestamptz not null default now()
);
create index if not exists worksheets_child on public.worksheets (child_id, created_at desc);
alter table public.worksheets enable row level security;
drop policy if exists "own worksheets" on public.worksheets;
create policy "own worksheets" on public.worksheets for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
grant select, insert, update, delete on public.worksheets to authenticated;
grant all on public.worksheets to service_role;
alter table public.plan_jobs add column if not exists worksheet_id uuid references public.worksheets(id) on delete set null;
