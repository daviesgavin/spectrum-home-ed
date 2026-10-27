-- Spectrum Home Ed: progress reports (written summary; the data tables are built live from records)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  content jsonb not null,          -- { sections: [{ heading, body }] }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_child on public.reports (child_id, created_at desc);
alter table public.reports enable row level security;
drop policy if exists "own reports" on public.reports;
create policy "own reports" on public.reports for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.plan_jobs add column if not exists report_id uuid references public.reports(id) on delete set null;
