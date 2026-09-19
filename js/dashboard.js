const grid = document.getElementById("apps-grid");
const userLabel = document.getElementById("user-label");
const logoutBtn = document.getElementById("logout-btn");

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  userLabel.textContent = session.user.email;

  // Affiche le lien Administration si l'utilisateur a le rôle Admin
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", session.user.id);
  const isAdmin = (roleRows || []).some(r => r.roles?.name === "Admin");
  if (isAdmin) document.getElementById("admin-link").classList.remove("hidden");

  // Grâce à la RLS + la vue user_apps, cette requête ne renvoie
  // QUE les apps auxquelles cet utilisateur a droit.
  const { data: apps, error } = await supabase
    .from("user_apps")
    .select("*")
    .order("name");

  if (error) {
    grid.innerHTML = `<p class="error">Erreur de chargement des applications.</p>`;
    console.error(error);
    return;
  }

  if (!apps || apps.length === 0) {
    grid.innerHTML = `<p>Aucune application ne t'a encore été attribuée. Contacte un administrateur.</p>`;
    return;
  }

  grid.innerHTML = apps.map(app => `
    <a class="app-card" href="${app.url}" target="_blank" rel="noopener">
      <div class="app-icon">${app.icon || "🔧"}</div>
      <div class="app-name">${app.name}</div>
      <div class="app-desc">${app.description || ""}</div>
    </a>
  `).join("");
})();

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});
