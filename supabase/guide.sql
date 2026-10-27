-- Spectrum Home Ed: registration dates and checklist per child, for the state guide
alter table public.children add column if not exists reg_date date;
alter table public.children add column if not exists reg_end date;
alter table public.children add column if not exists checklist jsonb not null default '{}'::jsonb;
