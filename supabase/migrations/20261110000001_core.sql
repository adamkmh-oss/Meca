-- =====================================================================
-- STRUCTURA — socle : types, rôles et permissions (RBAC), profils,
-- journal d'audit, limitation de débit.
--
-- Principes :
--  * auth.users (Supabase Auth) porte l'identité, l'e-mail et le mot de
--    passe (haché par Supabase Auth, bcrypt) ; public.profiles porte le
--    reste. Le rôle n'est JAMAIS lu dans les métadonnées fournies par
--    l'utilisateur : tout nouveau compte est « student ».
--  * Les autorisations sont vérifiées dans la base (RLS + fonctions
--    security definer) ET côté serveur Next.js : un bouton masqué n'est
--    jamais une protection.
--  * Les fonctions security definer fixent search_path = '' et qualifient
--    tous les objets.
-- =====================================================================

-- ------------------------------ Types --------------------------------
create type public.app_role as enum ('student', 'teacher', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.study_year as enum ('BUT1', 'BUT2', 'BUT3', 'autre');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.difficulty as enum ('debutant', 'intermediaire', 'avance');

-- --------------------------- RBAC ------------------------------------
create table public.roles (
  key public.app_role primary key,
  label text not null,
  description text not null
);

create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null
);

create table public.role_permissions (
  role public.app_role not null references public.roles (key) on delete cascade,
  permission text not null references public.permissions (key) on delete cascade,
  primary key (role, permission)
);

insert into public.roles (key, label, description) values
  ('student', 'Étudiant', 'Consulte les contenus publiés, fait les exercices, suit sa progression.'),
  ('teacher', 'Enseignant', 'Rédige, publie et modère les contenus pédagogiques ; consulte les statistiques agrégées.'),
  ('admin', 'Administrateur', 'Tous les droits enseignant, plus la gestion des comptes, des rôles, des matières et du journal d''audit.');

insert into public.permissions (key, description) values
  ('learning.track', 'Enregistrer ses tentatives, sa progression et ses favoris'),
  ('reports.create', 'Signaler une erreur dans un contenu'),
  ('ai.use', 'Utiliser l''assistant pédagogique IA'),
  ('content.read_drafts', 'Lire les contenus en brouillon ou archivés'),
  ('content.write', 'Créer et modifier chapitres, leçons, exercices, questions et corrigés'),
  ('content.publish', 'Publier ou dépublier un contenu'),
  ('subjects.manage', 'Créer, supprimer et réordonner les matières'),
  ('documents.manage', 'Déposer, publier et supprimer des documents'),
  ('reports.moderate', 'Traiter les signalements'),
  ('stats.read', 'Consulter les statistiques globales (agrégées)'),
  ('users.read', 'Consulter la liste des comptes'),
  ('users.manage', 'Changer les rôles, suspendre ou supprimer des comptes'),
  ('audit.read', 'Consulter le journal d''audit');

insert into public.role_permissions (role, permission)
select r.role::public.app_role, p
from (values
  ('student', array['learning.track', 'reports.create', 'ai.use']),
  ('teacher', array['learning.track', 'reports.create', 'ai.use', 'content.read_drafts', 'content.write', 'content.publish',
                    'documents.manage', 'reports.moderate', 'stats.read']),
  ('admin',   array['learning.track', 'reports.create', 'ai.use', 'content.read_drafts', 'content.write', 'content.publish',
                    'documents.manage', 'reports.moderate', 'stats.read', 'subjects.manage', 'users.read', 'users.manage', 'audit.read'])
) as r(role, perms), unnest(r.perms) as p;

-- ----------------------------- Profils --------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  study_year public.study_year,
  role public.app_role not null default 'student' references public.roles (key),
  status public.account_status not null default 'active',
  weekly_goal integer not null default 15 check (weekly_goal between 1 and 100),
  last_item_key text check (char_length(last_item_key) <= 200),
  last_item_title text check (char_length(last_item_title) <= 200),
  last_item_href text check (last_item_href ~ '^/[A-Za-z0-9/_.?=&%-]{0,255}$'),
  last_item_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

comment on table public.profiles is 'Données de profil (1-1 avec auth.users). E-mail et mot de passe restent dans auth.users.';

-- --------------------------- Fonctions d'accès -----------------------
-- MFA : si l'utilisateur a un facteur vérifié, la session doit être aal2.
create or replace function public.mfa_satisfied()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active');
$$;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles pr
    join public.role_permissions rp on rp.role = pr.role
    where pr.id = auth.uid() and pr.status = 'active' and rp.permission = p_permission
  ) and public.mfa_satisfied();
$$;

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.status = 'active';
$$;

create or replace function public.my_permissions()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(rp.permission order by rp.permission), '{}')
  from public.profiles pr join public.role_permissions rp on rp.role = pr.role
  where pr.id = auth.uid() and pr.status = 'active' and public.mfa_satisfied();
$$;

-- Lève une erreur d'autorisation (SQLSTATE 42501) si la permission manque.
create or replace function public.assert_permission(p_permission text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission(p_permission) then
    raise exception 'forbidden' using errcode = '42501', hint = p_permission;
  end if;
end $$;

-- ------------------------------ Audit ---------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  target_table text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
comment on table public.audit_logs is 'Journal append-only des opérations sensibles (écrit par déclencheurs et fonctions security definer).';

create or replace function public.write_audit(p_action text, p_table text, p_target text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, target_table, target_id, details)
  values (auth.uid(), p_action, p_table, p_target, coalesce(p_details, '{}'::jsonb));
$$;

-- Déclencheur générique : création, suppression, changement de statut.
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_id text;
  v_details jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    v_id := to_jsonb(old) ->> coalesce(tg_argv[0], 'id');
    v_details := jsonb_build_object('title', to_jsonb(old) ->> 'title');
    perform public.write_audit(tg_table_name || '.delete', tg_table_name, v_id, v_details);
    return old;
  end if;
  v_id := to_jsonb(new) ->> coalesce(tg_argv[0], 'id');
  if tg_op = 'INSERT' then
    perform public.write_audit(tg_table_name || '.create', tg_table_name, v_id, jsonb_build_object('title', to_jsonb(new) ->> 'title'));
  elsif (to_jsonb(old) ->> 'status') is distinct from (to_jsonb(new) ->> 'status') then
    perform public.write_audit(tg_table_name || '.status', tg_table_name, v_id,
      jsonb_build_object('from', to_jsonb(old) ->> 'status', 'to', to_jsonb(new) ->> 'status', 'title', to_jsonb(new) ->> 'title'));
  else
    perform public.write_audit(tg_table_name || '.update', tg_table_name, v_id, jsonb_build_object('title', to_jsonb(new) ->> 'title'));
  end if;
  return new;
end $$;

-- ------------------------- Limitation de débit ------------------------
create table public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

-- Compte un appel ; renvoie false si la limite est atteinte pour la fenêtre courante.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits as rl (bucket, window_start, hits) values (p_key, v_window, 1)
  on conflict (bucket, window_start) do update set hits = rl.hits + 1
  returning hits into v_hits;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end $$;

-- Variante utilisateur : la clé inclut toujours l'identifiant de l'appelant.
create or replace function public.consume_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_bucket !~ '^[a-z_:.-]{1,40}$' or p_max < 1 or p_window_seconds not between 1 and 604800 then
    raise exception 'invalid rate limit' using errcode = '22023';
  end if;
  return public.rate_limit_hit(p_bucket || ':' || auth.uid()::text, p_max, p_window_seconds);
end $$;

-- ------------------------- Horodatage ---------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ----------------- Création du profil à l'inscription -----------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_year text := new.raw_user_meta_data ->> 'study_year';
begin
  insert into public.profiles (id, display_name, study_year)
  values (
    new.id,
    left(regexp_replace(coalesce(new.raw_user_meta_data ->> 'display_name', ''), '[[:cntrl:]<>]', '', 'g'), 60),
    case when v_year in ('BUT1', 'BUT2', 'BUT3', 'autre') then v_year::public.study_year end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Changements de rôle et de statut : uniquement par les fonctions d'administration.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and coalesce(current_setting('structura.admin_op', true), '') <> 'on'
     and auth.uid() is not null then
    raise exception 'role and status are managed by administrators' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ------------------------------ RLS -----------------------------------
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;

create policy "roles: lecture" on public.roles for select to authenticated using (true);
create policy "permissions: lecture" on public.permissions for select to authenticated using (true);
create policy "role_permissions: lecture" on public.role_permissions for select to authenticated using (true);

create policy "profiles: lecture du sien" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('users.read')));
create policy "profiles: modification du sien" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.is_active_user()))
  with check (id = (select auth.uid()));

create policy "audit: lecture admin" on public.audit_logs for select to authenticated
  using ((select public.has_permission('audit.read')));
-- rate_limits : aucune politique → inaccessible aux clients (fonctions security definer uniquement).

-- --------------------------- Privilèges -------------------------------
revoke all on public.roles, public.permissions, public.role_permissions, public.profiles, public.audit_logs, public.rate_limits from anon;
revoke insert, update, delete on public.roles, public.permissions, public.role_permissions, public.audit_logs, public.rate_limits from authenticated;
revoke insert, delete, update on public.profiles from authenticated;
grant update (display_name, study_year, weekly_goal, last_item_key, last_item_title, last_item_href, last_item_at) on public.profiles to authenticated;

revoke execute on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_privileges() from public, anon, authenticated;
revoke execute on function public.assert_permission(text) from public, anon;
revoke execute on function public.my_permissions() from public, anon;
