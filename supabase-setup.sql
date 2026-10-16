-- 1. Создай пользователя администратора в Supabase -> Authentication -> Users -> Add user.
-- 2. Скопируй его User UID.
-- 3. ЗАМЕНИ В ДВУХ МЕСТАХ ниже 00000000-0000-0000-0000-000000000000 на этот UID.
-- 4. Выполни этот SQL в Supabase -> SQL Editor -> New query -> Run.
create table if not exists public.app_state (
 id integer primary key check (id=1),
 content jsonb not null
);
alter table public.app_state enable row level security;
insert into public.app_state(id,content) values (1,'{"study":[["Курсант А.",96.8],["Курсант Б.",94.5]],"sport":[["Курсант В.",98],["Курсант Г.",95]],"schedule":["08:30 — Математика","10:10 — Физика"],"birthdays":["Курсант Д. — сегодня 🎉"],"notice":"Добро пожаловать в ACADEMY HUB"}'::jsonb)
on conflict (id) do nothing;
revoke all on public.app_state from public;
grant usage on schema public to anon, authenticated;
grant select on public.app_state to anon, authenticated;
grant update on public.app_state to authenticated;
drop policy if exists "display read" on public.app_state;
create policy "display read" on public.app_state for select to anon, authenticated using (true);
drop policy if exists "only chosen admin updates" on public.app_state;
create policy "only chosen admin updates" on public.app_state for update to authenticated
using (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid)
with check (auth.uid() = '00000000-0000-0000-0000-000000000000'::uuid);
