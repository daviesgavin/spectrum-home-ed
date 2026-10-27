-- Spectrum Home Ed: year plans (4 terms) that weekly plans follow
create table if not exists public.year_plans (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  content jsonb not null,          -- { title, summary, terms: [{ term, theme, goals[], areas{area: focus}, activities[] }] }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, year)
);
alter table public.year_plans enable row level security;
drop policy if exists "own year plans" on public.year_plans;
create policy "own year plans" on public.year_plans for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
grant select, insert, update, delete on public.year_plans to authenticated;
grant all on public.year_plans to service_role;
alter table public.plan_jobs add column if not exists year_plan_id uuid references public.year_plans(id) on delete set null;
