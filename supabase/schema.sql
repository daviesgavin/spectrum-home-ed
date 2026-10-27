-- Spectrum Home Ed database
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Every table uses row level security: a parent can only ever see and change their own family's data.

-- Children ------------------------------------------------------------
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,                       -- first name or nickname only
  birth_year int check (birth_year between 1990 and 2100),
  state text not null check (state in ('WA','NSW','VIC','QLD','SA','TAS','ACT','NT')),
  support_level text not null check (support_level in ('high','moderate','low','advanced')),
  communication text,                       -- e.g. nonverbal, AAC, gestalt scripts, speaks in sentences
  interests text[] not null default '{}',   -- favourite shows, songs, places, games
  sensory_notes text,                       -- what helps, what overwhelms
  goals text,                               -- parent's priorities, therapy goals
  minutes_per_day int not null default 60 check (minutes_per_day between 10 and 360),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lesson plans (one row per weekly plan) -----------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  child_id uuid not null references public.children(id) on delete cascade,
  week_start date not null,
  title text,
  content jsonb not null,                   -- days -> lessons, coverage, focus goals
  source text not null default 'ai' check (source in ('ai','demo','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plans_child_week on public.plans (child_id, week_start desc);

-- Lesson records (H / P / I tracking and notes) ----------------------
create table if not exists public.lesson_logs (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  lesson_key text not null,                 -- e.g. "0-1" = day 0, lesson 1
  rating text check (rating in ('H','P','I','skipped')),
  note text,
  logged_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (plan_id, lesson_key)
);

-- Generation log (used to limit AI plans per day) --------------------
create table if not exists public.generations (
  id bigint generated always as identity primary key,
  parent_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

-- Row level security --------------------------------------------------
alter table public.children    enable row level security;
alter table public.plans       enable row level security;
alter table public.lesson_logs enable row level security;
alter table public.generations enable row level security;

do $$
declare t text;
begin
  foreach t in array array['children','plans','lesson_logs'] loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('create policy "own rows select" on public.%I for select using (parent_id = auth.uid())', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (parent_id = auth.uid())', t);
    execute format('create policy "own rows update" on public.%I for update using (parent_id = auth.uid()) with check (parent_id = auth.uid())', t);
    execute format('create policy "own rows delete" on public.%I for delete using (parent_id = auth.uid())', t);
  end loop;
end $$;

-- Let signed-in users reach the tables through the API (row level security still limits them to their own rows)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.children, public.plans, public.lesson_logs to authenticated;
grant select on public.generations to authenticated;
grant all on public.generations to service_role;
grant usage, select on all sequences in schema public to service_role;

drop policy if exists "own generations select" on public.generations;
create policy "own generations select" on public.generations for select using (parent_id = auth.uid());
-- inserts into generations happen only from the edge function with the service role

-- A plan must belong to a child of the same parent
create or replace function public.check_plan_child() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.children c where c.id = new.child_id and c.parent_id = new.parent_id) then
    raise exception 'child does not belong to this parent';
  end if;
  return new;
end $$;
drop trigger if exists plans_child_check on public.plans;
create trigger plans_child_check before insert or update on public.plans for each row execute function public.check_plan_child();

-- Keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists children_touch on public.children;
create trigger children_touch before update on public.children for each row execute function public.touch_updated_at();
drop trigger if exists plans_touch on public.plans;
create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();
-- Learning time: recommended (default) or adjusted by the parent with a reason
alter table public.children add column if not exists time_mode text not null default 'recommended';
alter table public.children add column if not exists time_reason text;
alter table public.children drop constraint if exists children_time_mode_check;
alter table public.children add constraint children_time_mode_check check (time_mode in ('recommended','adjusted'));
alter table public.children drop constraint if exists children_minutes_per_day_check;
alter table public.children add constraint children_minutes_per_day_check check (minutes_per_day between 10 and 480);
alter table public.children alter column minutes_per_day set default 180;
