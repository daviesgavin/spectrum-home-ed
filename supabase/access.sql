-- Spectrum Home Ed: admins, free (comp) access list, and subscriptions
-- Run after schema.sql. Safe to run more than once.

create table if not exists public.admins (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);

create table if not exists public.comp_access (
  email text primary key check (email = lower(email)),
  note text,
  expires_on date,                      -- empty = never expires
  added_by text,
  added_at timestamptz not null default now()
);

-- Filled by the Stripe webhook later
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null,                 -- active, trialing, past_due, canceled
  plan text,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

alter table public.admins        enable row level security;
alter table public.comp_access   enable row level security;
alter table public.subscriptions enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- Only admins can see or change the free access list
drop policy if exists "admins manage comp" on public.comp_access;
create policy "admins manage comp" on public.comp_access for all using (public.is_admin()) with check (public.is_admin());

-- Parents can see their own subscription; only the server writes it
drop policy if exists "own subscription" on public.subscriptions;
create policy "own subscription" on public.subscriptions for select using (user_id = auth.uid());

-- What the signed-in parent is entitled to
create or replace function public.my_access() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'is_admin', public.is_admin(),
    'comp', exists (select 1 from public.comp_access c
                    where c.email = lower(coalesce(auth.jwt() ->> 'email', ''))
                      and (c.expires_on is null or c.expires_on >= current_date)),
    'subscribed', exists (select 1 from public.subscriptions s
                          where s.user_id = auth.uid() and s.status in ('active', 'trialing')),
    'ai_plans_used', (select count(*) from public.generations g where g.parent_id = auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.my_access() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.my_access() to authenticated, service_role;
grant select, insert, update, delete on public.comp_access to authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.admins, public.comp_access, public.subscriptions to service_role;

-- Owner
insert into public.admins (email) values ('daviesgavin@hotmail.com') on conflict do nothing;
insert into public.comp_access (email, note, added_by) values ('daviesgavin@hotmail.com', 'Owner, testing', 'daviesgavin@hotmail.com') on conflict do nothing;
