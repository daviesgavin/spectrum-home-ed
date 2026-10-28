-- Spectrum Home Ed: professional accounts (teachers, education assistants, therapists, tutors)
-- Account type and role live in the user's auth metadata: { account_type: 'family' | 'pro', role, organisation, pro_consent_at }
alter table public.children add column if not exists setting text;
alter table public.children add column if not exists session_minutes int check (session_minutes between 10 and 180);
alter table public.plans add column if not exists group_ids uuid[] not null default '{}';
create index if not exists plans_group on public.plans using gin (group_ids);

insert into public.app_settings (key, value) values ('ai_budget_aud_pro', '15') on conflict (key) do nothing;

-- Allowance: Professional subscribers get the larger budget
create or replace function public.ai_allowance(uid uuid) returns json
language sql stable security definer set search_path = public as $$
  with s as (
    select case when exists (select 1 from subscriptions where user_id = uid and plan = 'pro' and status in ('active','trialing','past_due'))
             then coalesce((select (value #>> '{}')::numeric from app_settings where key = 'ai_budget_aud_pro'), 15)
             else coalesce((select (value #>> '{}')::numeric from app_settings where key = 'ai_budget_aud'), 9) end as b,
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
