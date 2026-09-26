-- ============================================================
-- CORRECTIF : les utilisateurs non-admin ne voyaient aucune application
-- À exécuter une fois dans Supabase > SQL Editor
-- ============================================================
-- Les tables d'affectation n'étaient lisibles que par les admins : la vue
-- user_apps ne trouvait donc ni les rôles ni les accès d'un utilisateur
-- standard. Ces policies lui permettent de lire SES PROPRES affectations.

drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select using (user_id = auth.uid());

drop policy if exists "app_access_user_select_own" on public.app_access_user;
create policy "app_access_user_select_own" on public.app_access_user
  for select using (user_id = auth.uid());

drop policy if exists "app_access_role_select_own" on public.app_access_role;
create policy "app_access_role_select_own" on public.app_access_role
  for select using (
    exists (
      select 1 from public.user_roles ur
      where ur.role_id = app_access_role.role_id and ur.user_id = auth.uid()
    )
  );

-- Les noms de rôles ne sont pas sensibles : lisibles par tout utilisateur connecté
drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated" on public.roles
  for select using (auth.role() = 'authenticated');

-- ============================================================
-- Vérification (optionnelle) : apps attendues pour un utilisateur
-- ============================================================
-- select a.name
-- from public.profiles p
-- join public.user_roles ur on ur.user_id = p.id
-- join public.app_access_role ar on ar.role_id = ur.role_id
-- join public.apps a on a.id = ar.app_id
-- where p.email = 'deoliveira.julien@mutualia.fr';
