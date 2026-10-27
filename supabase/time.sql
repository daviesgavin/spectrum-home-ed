-- Learning time: recommended (default) or adjusted by the parent with a reason
alter table public.children add column if not exists time_mode text not null default 'recommended';
alter table public.children add column if not exists time_reason text;
alter table public.children drop constraint if exists children_time_mode_check;
alter table public.children add constraint children_time_mode_check check (time_mode in ('recommended','adjusted'));
alter table public.children drop constraint if exists children_minutes_per_day_check;
alter table public.children add constraint children_minutes_per_day_check check (minutes_per_day between 10 and 480);
alter table public.children alter column minutes_per_day set default 180;
