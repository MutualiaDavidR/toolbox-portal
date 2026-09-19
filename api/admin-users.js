// Fonction serveur (Vercel) — gère les comptes utilisateurs avec la clé
// "service_role" de Supabase, qui ne doit JAMAIS être exposée au navigateur.
//
// Variables d'environnement à définir dans Vercel (Project Settings > Environment Variables) :
//   SUPABASE_URL              = https://VOTRE-PROJET.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = la clé "service_role" (Project Settings > API dans Supabase)
//
// Sécurité : chaque appel doit fournir le token de session de l'utilisateur connecté
// (Authorization: Bearer <token>). On vérifie ce token, PUIS on vérifie que cet
// utilisateur a bien le rôle Admin, avant d'exécuter la moindre action.

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client "admin" avec tous les droits (utilisé uniquement côté serveur)
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function requireAdmin(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw { status: 401, message: "Non authentifié." };

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData?.user) throw { status: 401, message: "Session invalide." };

  const uid = userData.user.id;

  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", uid);

  if (roleError) throw { status: 500, message: "Erreur de vérification des droits." };

  const isAdmin = (roleRows || []).some(r => r.roles?.name === "Admin");
  if (!isAdmin) throw { status: 403, message: "Accès réservé aux administrateurs." };

  return uid;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  try {
    await requireAdmin(req);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "Erreur." });
  }

  const { action, payload } = req.body || {};

  try {
    switch (action) {
      case "list": {
        const { data, error } = await adminClient.auth.admin.listUsers();
        if (error) throw error;
        const users = data.users.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }));
        return res.status(200).json({ users });
      }

      case "create": {
        const { email, password } = payload || {};
        if (!email || !password) {
          return res.status(400).json({ error: "Email et mot de passe requis." });
        }
        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) throw error;
        return res.status(200).json({ user: data.user });
      }

      case "update": {
        const { userId, email, password } = payload || {};
        if (!userId) return res.status(400).json({ error: "userId requis." });
        const updates = {};
        if (email) updates.email = email;
        if (password) updates.password = password;
        const { data, error } = await adminClient.auth.admin.updateUserById(userId, updates);
        if (error) throw error;
        return res.status(200).json({ user: data.user });
      }

      case "delete": {
        const { userId } = payload || {};
        if (!userId) return res.status(400).json({ error: "userId requis." });
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: "Action inconnue." });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur serveur." });
  }
};
