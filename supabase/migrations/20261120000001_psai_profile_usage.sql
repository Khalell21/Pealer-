-- Profil PSAI : pays + mineur déclaré, et compteur d'usage SANS contenu.

alter table public.profiles
  add column if not exists country text check (country ~ '^[A-Z]{2}$'),
  add column if not exists is_minor boolean not null default false,
  add column if not exists onboarded_at timestamptz,
  add column if not exists health_consent_at timestamptz;

-- Profil créé automatiquement à l'inscription.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prompt : « Si un utilisateur déclare être mineur, les protections s'activent de manière permanente. »
create or replace function public.minor_is_permanent()
returns trigger language plpgsql as $$
begin
  if old.is_minor and not new.is_minor then
    raise exception 'is_minor cannot be reverted';
  end if;
  return new;
end $$;

drop trigger if exists profiles_minor_permanent on public.profiles;
create trigger profiles_minor_permanent before update on public.profiles
  for each row execute function public.minor_is_permanent();

-- Compteur quotidien : nombre de messages, jamais leur contenu.
create table if not exists public.usage_daily (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default current_date,
  messages integer not null default 0 check (messages >= 0),
  primary key (user_id, day)
);

alter table public.usage_daily enable row level security;
alter table public.usage_daily force row level security;

create policy "usage_select_own" on public.usage_daily
  for select to authenticated using ((select auth.uid()) = user_id);
-- Pas d'insert/update direct : uniquement via record_message() (pas de triche sur le quota).
revoke all on public.usage_daily from anon;
revoke insert, update, delete on public.usage_daily from authenticated;

-- Incrémente le compteur de l'appelant et renvoie ce dont la fonction chat a besoin.
create or replace function public.record_message()
returns table (messages_today integer, active_days_30d integer)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.usage_daily as u (user_id, day, messages) values (uid, current_date, 1)
    on conflict (user_id, day) do update set messages = u.messages + 1;
  return query
    select (select d.messages from public.usage_daily d where d.user_id = uid and d.day = current_date),
           (select count(*)::int from public.usage_daily d where d.user_id = uid and d.day > current_date - 30);
end $$;

revoke all on function public.record_message() from public, anon;
grant execute on function public.record_message() to authenticated;
