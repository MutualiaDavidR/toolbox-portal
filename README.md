# Portail Boîte à Outils

Portail central avec login/mot de passe, qui n'affiche à chaque utilisateur que
les applications auxquelles il a droit (accès par utilisateur ou par profil/rôle).

## 1. Créer le projet Supabase (gratuit)

1. Va sur https://supabase.com > "New project" (le tier gratuit suffit largement pour démarrer).
2. Une fois le projet créé, va dans **SQL Editor** et colle le contenu de `sql/schema.sql`, puis exécute-le.
   Cela crée toutes les tables, la vue `user_apps`, les règles de sécurité (RLS), et 2 apps + 3 rôles d'exemple.
3. Va dans **Project Settings > API** et récupère :
   - `Project URL`
   - `anon public key`
4. Colle ces deux valeurs dans `js/supabaseClient.js`.

## 2. Tester en local

Ouvre simplement `index.html` dans un navigateur (ou lance un petit serveur local,
ex. `npx serve` depuis le dossier du projet). Crée un premier compte pour tester :
- Dans Supabase > **Authentication > Users**, clique "Add user" pour créer un compte de test
  (email + mot de passe), ou active l'inscription libre si tu préfères.
- Connecte-toi avec ce compte : le profil est créé automatiquement.

## 3. Donner des accès à un utilisateur

Deux façons de faire (table SQL Editor, ou plus tard une vraie interface admin) :

**Donner un rôle à un utilisateur** :
```sql
insert into public.user_roles (user_id, role_id)
values ('<uuid-utilisateur>', <id-role>);
```

**Donner accès à une app pour tout un rôle** :
```sql
insert into public.app_access_role (app_id, role_id)
values (<id-app>, <id-role>);
```

**Donner accès à une app pour un utilisateur précis** (sans passer par un rôle) :
```sql
insert into public.app_access_user (app_id, user_id)
values (<id-app>, '<uuid-utilisateur>');
```

L'UUID d'un utilisateur se trouve dans **Authentication > Users** dans le tableau de bord Supabase.

## 4. Ajouter une nouvelle application au portail

```sql
insert into public.apps (name, description, url, icon)
values ('Nom de l''app', 'Description courte', 'https://url-de-l-app.com', '🚀');
```

Puis attribue l'accès via `app_access_role` ou `app_access_user` comme ci-dessus.

## 5. Interface d'administration

La page `admin.html` (accessible via le lien "⚙️ Administration" visible uniquement pour les
comptes ayant le rôle **Admin**) permet de :
- créer, éditer (email/mot de passe), supprimer des utilisateurs
- cocher/décocher les rôles de chaque utilisateur
- cocher/décocher l'accès direct de chaque utilisateur à chaque application
- gérer l'accès par rôle (une case cochée = tous les utilisateurs de ce rôle ont accès à cette app)

⚠️ Créer/modifier/supprimer un **compte** (pas juste ses droits) passe par la clé secrète
`service_role` de Supabase, qui ne doit jamais transiter côté navigateur. C'est pourquoi une petite
fonction serveur (`api/admin-users.js`) s'en charge — voir étape 6 pour son déploiement.

## 6. Déployer gratuitement (avec la fonction admin)

Ce portail combine des fichiers statiques (HTML/CSS/JS) et une fonction serveur légère : le plus
simple est **Vercel**, qui gère les deux nativement et gratuitement.

1. Pousse ce dossier sur un repo GitHub (ou utilise `vercel` en CLI directement).
2. Sur `vercel.com` > "Add New Project" > importe le repo.
3. Dans **Project Settings > Environment Variables**, ajoute :
   - `SUPABASE_URL` = l'URL de ton projet Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = la clé **service_role** (Project Settings > API dans Supabase —
     ⚠️ jamais la clé `anon`, et ne jamais la mettre dans un fichier `.js` du dossier `js/`)
4. Déploie. Vercel détecte automatiquement `api/admin-users.js` comme fonction serverless.

> Netlify fonctionne aussi, mais les fonctions serverless se placent dans un dossier `netlify/functions/`
> avec une syntaxe légèrement différente (`exports.handler = async (event) => {...}`) — dis-moi si tu
> préfères cette option et je l'adapte.

## 7. Créer le tout premier administrateur

Avant même de pouvoir toucher à l'interface admin, il faut au moins un admin :
1. Crée un premier compte (inscription ou via **Authentication > Users** dans Supabase).
2. Récupère son UUID dans **Authentication > Users**.
3. Dans le SQL Editor de Supabase :
   ```sql
   insert into public.user_roles (user_id, role_id)
   select '<uuid-du-premier-admin>', id from public.roles where name = 'Admin';
   ```
4. Reconnecte-toi avec ce compte : le lien "⚙️ Administration" apparaît sur le dashboard.

## Prochaines étapes possibles

- Un lien "mot de passe oublié" (Supabase Auth le gère nativement, à câbler dans `auth.js`)
- Une interface pour créer/éditer/supprimer les applications elles-mêmes (actuellement via SQL Editor)
- Chaque application de la boîte à outils peut elle-même utiliser Supabase Auth pour vérifier
  qu'un utilisateur est bien connecté et a le droit d'accéder à CETTE app précise (double vérification
  côté app, en plus du filtrage du portail).
