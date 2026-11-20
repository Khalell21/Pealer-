-- ============================================================
-- Socle RLS : modèle à reproduire pour CHAQUE nouvelle table.
-- Règle : RLS activé + policies explicites. Rien n'est ouvert par défaut.
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- Un utilisateur ne voit / modifie QUE sa propre ligne.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Pas de policy DELETE : la suppression passe par l'Edge Function delete-account
-- (cascade depuis auth.users), pour purger aussi le stockage et les tiers.

-- Aucun accès pour le rôle anon.
revoke all on public.profiles from anon;

-- ------------------------------------------------------------
-- Garde-fou : lister les tables publiques SANS RLS (doit renvoyer 0 ligne).
--   select tablename from pg_tables
--   where schemaname = 'public' and not rowsecurity;
-- ------------------------------------------------------------
