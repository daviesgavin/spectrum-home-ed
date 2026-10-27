-- Spectrum Home Ed: visit tracking, payments, and admin dashboard queries.
-- Privacy: visits store no IP address. Location comes from the visitor's device time zone (e.g. Australia/Perth).

create table if not exists public.visits (
  id bigint generated always as identity primary key,
  visitor_id text check (char_length(visitor_id) <= 64),   -- random id kept in the visitor's browser
  path text check (char_length(path) <= 200),
  referrer text check (char_length(referrer) <= 300),
  time_zone text check (char_length(time_zone) <= 64),
  country text check (char_length(country) <= 64),
  city text check (char_length(city) <= 64),
  language text check (char_length(language) <= 20),
  device text check (device in ('mobile','tablet','desktop')),
  created_at timestamptz not null default now()
);
create index if not exists visits_created on public.visits (created_at desc);
alter table public.visits enable row level security;
drop policy if exists "anyone can record a visit" on public.visits;
create policy "anyone can record a visit" on public.visits for insert to anon, authenticated with check (true);
grant insert on public.visits to anon, authenticated;
grant all on public.visits to service_role;

-- One row per paid invoice, written by the Stripe webhook
create table if not exists public.payments (
  id text primary key,                      -- Stripe invoice id
  user_id uuid references auth.users(id) on delete set null,
  amount_cents int not null,
  currency text not null,
  plan text,
  country text, state text, city text,
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
grant all on public.payments to service_role;

alter table public.subscriptions add column if not exists country text;
alter table public.subscriptions add column if not exists state text;
alter table public.subscriptions add column if not exists city text;
alter table public.subscriptions add column if not exists email text;

-- Admin-only dashboard data in one call
create or replace function public.admin_dashboard() returns json
language plpgsql stable security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select json_build_object(
    'visits', json_build_object(
      'today', (select count(*) from visits where created_at >= date_trunc('day', now() at time zone 'Australia/Perth') at time zone 'Australia/Perth'),
      'week',  (select count(*) from visits where created_at >= now() - interval '7 days'),
      'month', (select count(*) from visits where created_at >= now() - interval '30 days'),
      'year',  (select count(*) from visits where created_at >= now() - interval '365 days'),
      'unique_month', (select count(distinct visitor_id) from visits where created_at >= now() - interval '30 days'),
      'by_day', (select coalesce(json_agg(d order by d.day), '[]') from (select (created_at at time zone 'Australia/Perth')::date as day, count(*) as n from visits where created_at >= now() - interval '30 days' group by 1) d),
      'by_place', (select coalesce(json_agg(p), '[]') from (select coalesce(city,'Unknown') as city, coalesce(country,'Unknown') as country, count(*) as n from visits where created_at >= now() - interval '30 days' group by 1,2 order by 3 desc limit 25) p),
      'by_country', (select coalesce(json_agg(p), '[]') from (select coalesce(country,'Unknown') as country, count(*) as n from visits where created_at >= now() - interval '30 days' group by 1 order by 2 desc limit 15) p),
      'by_page', (select coalesce(json_agg(p), '[]') from (select path, count(*) as n from visits where created_at >= now() - interval '30 days' group by 1 order by 2 desc limit 10) p)
    ),
    'registrations', json_build_object(
      'total', (select count(*) from auth.users),
      'week',  (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'month', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'by_day', (select coalesce(json_agg(d order by d.day), '[]') from (select (created_at at time zone 'Australia/Perth')::date as day, count(*) as n from auth.users where created_at >= now() - interval '30 days' group by 1) d),
      'recent', (select coalesce(json_agg(r), '[]') from (select u.email, u.created_at, (select count(*) from children c where c.parent_id = u.id) as children, (select count(*) from plans p where p.parent_id = u.id) as plans from auth.users u order by u.created_at desc limit 25) r)
    ),
    'customers', (select coalesce(json_agg(c), '[]') from (select s.email, s.plan, s.status, s.city, s.state, s.country, s.current_period_end, s.updated_at from subscriptions s order by s.updated_at desc) c),
    'paying', (select count(*) from subscriptions where status in ('active','trialing')),
    'revenue', json_build_object(
      'week',  (select coalesce(sum(amount_cents),0) from payments where paid_at >= now() - interval '7 days'),
      'month', (select coalesce(sum(amount_cents),0) from payments where paid_at >= now() - interval '30 days'),
      'year',  (select coalesce(sum(amount_cents),0) from payments where paid_at >= now() - interval '365 days'),
      'all_time', (select coalesce(sum(amount_cents),0) from payments),
      'by_month', (select coalesce(json_agg(m order by m.month), '[]') from (select to_char(paid_at at time zone 'Australia/Perth', 'YYYY-MM') as month, sum(amount_cents) as cents from payments where paid_at >= now() - interval '365 days' group by 1) m),
      'by_place', (select coalesce(json_agg(p), '[]') from (select coalesce(state, '') as state, coalesce(country,'Unknown') as country, count(distinct user_id) as customers, sum(amount_cents) as cents from payments group by 1,2 order by 4 desc limit 15) p)
    ),
    'comp', (select coalesce(json_agg(c order by c.added_at desc), '[]') from comp_access c)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_dashboard() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;
