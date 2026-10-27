-- Spectrum Home Ed: let admins add and remove other admins from the dashboard.
-- The owner (daviesgavin@hotmail.com) can't be removed, and nobody can remove themselves.
alter table public.admins add column if not exists added_by text;
alter table public.admins add column if not exists note text;

create or replace function public.admin_list() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return (select coalesce(json_agg(a order by a.added_at), '[]') from (select email, note, added_by, added_at from admins) a);
end $$;

create or replace function public.admin_add(new_email text, new_note text default null) returns void
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(trim(new_email));
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address.'; end if;
  insert into admins (email, note, added_by) values (e, nullif(trim(new_note), ''), lower(auth.jwt() ->> 'email'))
  on conflict (email) do update set note = excluded.note;
end $$;

create or replace function public.admin_remove(old_email text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(trim(old_email));
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if e = 'daviesgavin@hotmail.com' then raise exception 'The owner can''t be removed.'; end if;
  if e = lower(auth.jwt() ->> 'email') then raise exception 'You can''t remove yourself.'; end if;
  delete from admins where email = e;
end $$;

revoke all on function public.admin_list(), public.admin_add(text, text), public.admin_remove(text) from public, anon;
grant execute on function public.admin_list(), public.admin_add(text, text), public.admin_remove(text) to authenticated;
