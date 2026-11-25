-- Limite par minute (anti-détournement de l'API) : une fenêtre glissante d'une minute par utilisateur.
-- Aucune donnée de contenu, seulement un horodatage de fenêtre et un compteur.

create table if not exists public.rate_windows (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  count        integer not null default 0 check (count >= 0)
);

alter table public.rate_windows enable row level security;
alter table public.rate_windows force row level security;
-- Aucune policy : la table n'est accessible que via record_message() (security definer).
revoke all on public.rate_windows from anon, authenticated;

drop function if exists public.record_message();

create function public.record_message()
returns table (messages_today integer, active_days_30d integer, messages_last_minute integer)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.usage_daily as u (user_id, day, messages) values (uid, current_date, 1)
    on conflict (user_id, day) do update set messages = u.messages + 1;

  insert into public.rate_windows as r (user_id, window_start, count) values (uid, now(), 1)
    on conflict (user_id) do update set
      window_start = case when r.window_start < now() - interval '1 minute' then now() else r.window_start end,
      count        = case when r.window_start < now() - interval '1 minute' then 1 else r.count + 1 end;

  return query
    select (select d.messages from public.usage_daily d where d.user_id = uid and d.day = current_date),
           (select count(*)::int from public.usage_daily d where d.user_id = uid and d.day > current_date - 30),
           (select w.count from public.rate_windows w where w.user_id = uid);
end $$;

revoke all on function public.record_message() from public, anon;
grant execute on function public.record_message() to authenticated;
