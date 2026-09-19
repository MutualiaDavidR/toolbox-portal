-- ============================================================
-- SCHEMA : Portail de la boîte à outils
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Profils utilisateurs (miroir de auth.users géré par Supabase Auth)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default now()
);

-- Rôles disponibles (ex : Admin, Compta, RH...)
create table public.roles (
  id serial primary key,
  name text unique not null
);

-- Un utilisateur peut avoir plusieurs rôles
create table public.user_roles (
  user_id uuid references public.profiles(id) on delete cascade,
  role_id int references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Les outils/applications de la boîte à outils
create table public.apps (
  id serial primary key,
  name text not null,
  description text,
  url text not null,
  icon text,               -- emoji ou nom d'icône, ex: '📊'
  created_at timestamp with time zone default now()
);

-- Accès direct à une app pour UN utilisateur précis
create table public.app_access_user (
  app_id int references public.apps(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (app_id, user_id)
);

-- Accès à une app pour tout un ROLE (profil)
create table public.app_access_role (
  app_id int references public.apps(id) on delete cascade,
  role_id int references public.roles(id) on delete cascade,
  primary key (app_id, role_id)
);

-- Vue calculée : pour chaque profil, la liste des apps auxquelles il a droit
-- (accès direct OU via un de ses rôles)
create view public.user_apps as
select distinct a.id, a.name, a.description, a.url, a.icon, u.id as user_id
from public.apps a
join public.profiles u on true
where
  exists (
    select 1 from public.app_access_user au
    where au.app_id = a.id and au.user_id = u.id
  )
  or exists (
    select 1 from public.app_access_role ar
    join public.user_roles ur on ur.role_id = ar.role_id
    where ar.app_id = a.id and ur.user_id = u.id
  );

-- ============================================================
-- Fonction utilitaire : l'utilisateur connecté est-il Admin ?
-- ============================================================
create function public.is_admin()
returns boolean as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name = 'Admin'
  );
$$ language sql security definer stable;

-- ============================================================
-- SÉCURITÉ (Row Level Security)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.apps enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.app_access_user enable row level security;
alter table public.app_access_role enable row level security;

-- Un utilisateur voit son propre profil ; un admin voit tous les profils.
-- (Ceci restreint automatiquement la vue user_apps au périmètre visible,
-- grâce au "join public.profiles u on true" ci-dessus.)
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- Tout utilisateur connecté peut lire la liste brute des apps
-- (le filtrage réel pour le dashboard se fait via user_apps)
create policy "apps_select_authenticated" on public.apps
  for select using (auth.role() = 'authenticated');

-- Seuls les admins peuvent lire/écrire les rôles
create policy "roles_all_admin" on public.roles
  for all using (public.is_admin()) with check (public.is_admin());

-- Seuls les admins peuvent gérer les affectations de rôles
create policy "user_roles_all_admin" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- Seuls les admins peuvent créer/modifier/supprimer des apps
create policy "apps_write_admin" on public.apps
  for insert with check (public.is_admin());
create policy "apps_update_admin" on public.apps
  for update using (public.is_admin());
create policy "apps_delete_admin" on public.apps
  for delete using (public.is_admin());

-- Seuls les admins peuvent gérer les accès directs (utilisateur <-> app)
create policy "app_access_user_all_admin" on public.app_access_user
  for all using (public.is_admin()) with check (public.is_admin());

-- Seuls les admins peuvent gérer les accès par rôle (rôle <-> app)
create policy "app_access_role_all_admin" on public.app_access_role
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Création automatique du profil à l'inscription
-- ============================================================
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Exemple de données (à adapter / supprimer)
-- ============================================================
insert into public.roles (name) values ('Admin'), ('Compta'), ('RH');

insert into public.apps (name, description, url, icon) values
  ('Suivi budget', 'Outil de suivi budgétaire', 'https://mon-app-budget.exemple.com', '📊'),
  ('Gestion RH', 'Gestion des congés et absences', 'https://mon-app-rh.exemple.com', '👥');

-- Pour donner accès à un rôle entier à une app :
-- insert into public.app_access_role (app_id, role_id) values (1, 1);

-- Pour donner accès à un utilisateur précis (après sa première connexion) :
-- insert into public.app_access_user (app_id, user_id) values (1, '<uuid-utilisateur>');

-- ============================================================
-- IMPORTANT : promouvoir le tout premier compte Admin
-- ============================================================
-- Les policies ci-dessus font qu'un admin peut gérer les rôles des autres,
-- mais il faut bien créer le PREMIER admin manuellement une fois, via le
-- SQL Editor (ce endroit n'est pas soumis à la RLS) :
--
-- insert into public.user_roles (user_id, role_id)
-- select '<uuid-du-premier-admin>', id from public.roles where name = 'Admin';
