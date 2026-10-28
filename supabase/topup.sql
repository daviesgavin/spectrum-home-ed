-- Spectrum Home Ed: buy extra AI writing (top-ups). Credits don't expire and are used after the monthly allowance.
create table if not exists public.ai_credits (
  id text primary key,                     -- Stripe Checkout session id
  parent_id uuid not null references auth.users(id) on delete cascade,
  pack text,
  amount_aud numeric(10,2) not null,       -- extra AI allowance, in A$ of AI cost
  paid_cents int,
  created_at timestamptz not null default now()
);
create index if not exists ai_credits_parent on public.ai_credits (parent_id);
alter table public.ai_credits enable row level security;
drop policy if exists "own credits" on public.ai_credits;
create policy "own credits" on public.ai_credits for select using (parent_id = auth.uid());
grant select on public.ai_credits to authenticated;
grant all on public.ai_credits to service_role;

-- Allowance for one family: monthly budget + top-ups, minus what's been used
create or replace function public.ai_allowance(uid uuid) returns json
language sql stable security definer set search_path = public as $$
  with s as (
    select coalesce((select (value #>> '{}')::numeric from app_settings where key = 'ai_budget_aud'), 9) as b,
           coalesce((select (value #>> '{}')::numeric from app_settings where key = 'aud_per_usd'), 1.55) as r,
           date_trunc('month', now() at time zone 'Australia/Perth') as cur),
  m as (select date_trunc('month', created_at at time zone 'Australia/Perth') as mon, sum(cost_usd) as usd from ai_usage where parent_id = uid group by 1),
  c as (select
    coalesce((select sum(amount_aud) from ai_credits where parent_id = uid), 0) as credits,
    coalesce((select sum(greatest(0, m.usd * s.r - s.b)) from m, s where m.mon < s.cur), 0) as used_before,
    coalesce((select m.usd * s.r from m, s where m.mon = s.cur), 0) as month_aud)
  select json_build_object(
    'budget_aud', s.b, 'aud_per_usd', s.r,
    'month_aud', round(c.month_aud, 4),
    'credits_aud', c.credits,
    'credits_left_aud', round(greatest(0, c.credits - c.used_before - greatest(0, c.month_aud - s.b)), 2),
    'available_aud', round(s.b + c.credits - c.used_before - c.month_aud, 4),
    'resets', (s.cur + interval '1 month')::date)
  from s, c;
$$;
revoke all on function public.ai_allowance(uuid) from public, anon, authenticated;
grant execute on function public.ai_allowance(uuid) to service_role;

create or replace function public.my_ai_usage() returns json
language sql stable security definer set search_path = public as $$ select public.ai_allowance(auth.uid()); $$;
revoke all on function public.my_ai_usage() from public, anon;
grant execute on function public.my_ai_usage() to authenticated;
