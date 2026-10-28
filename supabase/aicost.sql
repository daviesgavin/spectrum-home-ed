-- Spectrum Home Ed: real AI cost per run, monthly fair-use budget, and admin settings
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  kind text not null,                      -- plan, worksheet, program, year, report
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10,5) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_parent on public.ai_usage (parent_id, created_at desc);
alter table public.ai_usage enable row level security;
drop policy if exists "own usage" on public.ai_usage;
create policy "own usage" on public.ai_usage for select using (parent_id = auth.uid());
grant select on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;

alter table public.generations add column if not exists kind text not null default 'plan';

create table if not exists public.app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
alter table public.app_settings enable row level security;
drop policy if exists "admins manage settings" on public.app_settings;
create policy "admins manage settings" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
insert into public.app_settings (key, value) values
  ('worksheet_model', '"claude-sonnet-5-5"'), ('ai_budget_aud', '9'), ('aud_per_usd', '1.55')
on conflict (key) do nothing;

-- Start of the current month in Perth time
create or replace function public.month_start_perth() returns timestamptz language sql stable as $$
  select date_trunc('month', now() at time zone 'Australia/Perth') at time zone 'Australia/Perth';
$$;

create or replace function public.my_ai_usage() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'spent_usd', (select coalesce(sum(cost_usd), 0) from ai_usage where parent_id = auth.uid() and created_at >= month_start_perth()),
    'budget_aud', (select (value #>> '{}')::numeric from app_settings where key = 'ai_budget_aud'),
    'aud_per_usd', (select (value #>> '{}')::numeric from app_settings where key = 'aud_per_usd'),
    'resets', (date_trunc('month', now() at time zone 'Australia/Perth') + interval '1 month')::date
  );
$$;
revoke all on function public.my_ai_usage() from public, anon;
grant execute on function public.my_ai_usage() to authenticated;

create or replace function public.admin_ai_costs() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return json_build_object(
    'month_usd', (select coalesce(sum(cost_usd), 0) from ai_usage where created_at >= month_start_perth()),
    'month_runs', (select count(*) from ai_usage where created_at >= month_start_perth()),
    'by_kind', (select coalesce(json_agg(k order by k.usd desc), '[]') from (select kind, count(*) as runs, sum(cost_usd) as usd, round(avg(cost_usd), 4) as avg_usd from ai_usage where created_at >= now() - interval '30 days' group by kind) k),
    'by_model', (select coalesce(json_agg(m), '[]') from (select model, kind, count(*) as runs, round(avg(cost_usd), 4) as avg_usd from ai_usage where created_at >= now() - interval '30 days' group by model, kind order by kind) m),
    'top', (select coalesce(json_agg(t), '[]') from (select u.email, count(*) as runs, sum(a.cost_usd) as usd from ai_usage a join auth.users u on u.id = a.parent_id where a.created_at >= month_start_perth() group by u.email order by 3 desc limit 10) t),
    'families', (select count(distinct parent_id) from ai_usage where created_at >= month_start_perth()),
    'settings', (select json_object_agg(key, value) from app_settings)
  );
end $$;
revoke all on function public.admin_ai_costs() from public, anon;
grant execute on function public.admin_ai_costs() to authenticated;
