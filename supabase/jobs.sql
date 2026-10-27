-- Spectrum Home Ed: background plan writing. The app starts a job, then checks back until the plan is ready.
create table if not exists public.plan_jobs (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  week_start date not null,
  status text not null default 'working' check (status in ('working','done','failed')),
  progress int not null default 0,          -- days finished, out of 5
  plan_id uuid references public.plans(id) on delete set null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plan_jobs_parent on public.plan_jobs (parent_id, created_at desc);
alter table public.plan_jobs enable row level security;
drop policy if exists "own jobs" on public.plan_jobs;
create policy "own jobs" on public.plan_jobs for select using (parent_id = auth.uid());
grant select on public.plan_jobs to authenticated;
grant all on public.plan_jobs to service_role;

-- The background planner saves plans with the server key
grant all on public.plans, public.children, public.lesson_logs, public.generations to service_role;
