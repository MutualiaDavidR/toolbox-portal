let session = null;
let allRoles = [];
let allApps = [];
let allProfiles = [];       // profils (id, email)
let userRolesMap = {};      // userId -> Set(roleId)
let userAppAccessMap = {};  // userId -> Set(appId)   (accès direct)
let roleAppAccessMap = {};  // roleId -> Set(appId)

const usersTbody = document.getElementById("users-tbody");
const roleAccessTbody = document.getElementById("role-access-tbody");
const roleAccessThead = document.querySelector("#role-access-table thead tr");

// ---------- Init ----------
(async () => {
  const { data } = await sbClient.auth.getSession();
  session = data.session;

  if (!session) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("user-label").textContent = session.user.email;

  const isAdmin = await checkIsAdmin(session.user.id);
  if (!isAdmin) {
    document.getElementById("access-denied").classList.remove("hidden");
    return;
  }
  document.getElementById("admin-content").classList.remove("hidden");

  await loadAll();
  renderUsersTable();
  renderRoleAccessTable();
})();

document.getElementById("logout-btn").addEventListener("click", async () => {
  await sbClient.auth.signOut();
  window.location.href = "index.html";
});

async function checkIsAdmin(userId) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);
  if (error) return false;
  return (data || []).some(r => r.roles?.name === "Admin");
}

// ---------- Chargement des données ----------
async function loadAll() {
  const [rolesRes, appsRes, profilesRes, userRolesRes, appAccessUserRes, appAccessRoleRes] = await Promise.all([
    sbClient.from("roles").select("*").order("name"),
    sbClient.from("apps").select("*").order("name"),
    sbClient.from("profiles").select("*").order("email"),
    sbClient.from("user_roles").select("*"),
    sbClient.from("app_access_user").select("*"),
    sbClient.from("app_access_role").select("*"),
  ]);

  allRoles = rolesRes.data || [];
  allApps = appsRes.data || [];
  allProfiles = profilesRes.data || [];

  userRolesMap = {};
  (userRolesRes.data || []).forEach(r => {
    (userRolesMap[r.user_id] ??= new Set()).add(r.role_id);
  });

  userAppAccessMap = {};
  (appAccessUserRes.data || []).forEach(a => {
    (userAppAccessMap[a.user_id] ??= new Set()).add(a.app_id);
  });

  roleAppAccessMap = {};
  (appAccessRoleRes.data || []).forEach(a => {
    (roleAppAccessMap[a.role_id] ??= new Set()).add(a.app_id);
  });
}

// ---------- Rendu : tableau utilisateurs ----------
function renderUsersTable() {
  if (allProfiles.length === 0) {
    usersTbody.innerHTML = `<tr><td colspan="4">Aucun utilisateur.</td></tr>`;
    return;
  }

  usersTbody.innerHTML = allProfiles.map(profile => {
    const userId = profile.id;
    const currentRoles = userRolesMap[userId] || new Set();
    const currentApps = userAppAccessMap[userId] || new Set();

    const rolesHtml = allRoles.map(role => `
      <label class="role-tag">
        <input type="checkbox" data-role-toggle data-user="${userId}" data-role="${role.id}"
          ${currentRoles.has(role.id) ? "checked" : ""}>
        ${role.name}
      </label>
    `).join("");

    const appsHtml = allApps.map(app => `
      <label>
        <input type="checkbox" data-app-toggle data-user="${userId}" data-app="${app.id}"
          ${currentApps.has(app.id) ? "checked" : ""}>
        ${app.icon || ""} ${app.name}
      </label>
    `).join("");

    return `
      <tr data-user-row="${userId}">
        <td>${profile.email || "(sans email)"}</td>
        <td><div class="role-toggle-list">${rolesHtml || '<span class="muted">Aucun rôle défini</span>'}</div></td>
        <td><div class="app-toggle-list">${appsHtml || '<span class="muted">Aucune app</span>'}</div></td>
        <td class="row-actions">
          <button data-edit-user="${userId}">Éditer</button>
          <button data-delete-user="${userId}" class="danger">Supprimer</button>
        </td>
      </tr>
    `;
  }).join("");

  // Rôles : cocher/décocher
  usersTbody.querySelectorAll("[data-role-toggle]").forEach(cb => {
    cb.addEventListener("change", async () => {
      const userId = cb.dataset.user;
      const roleId = parseInt(cb.dataset.role);
      if (cb.checked) {
        await sbClient.from("user_roles").insert({ user_id: userId, role_id: roleId });
        (userRolesMap[userId] ??= new Set()).add(roleId);
      } else {
        await sbClient.from("user_roles").delete().eq("user_id", userId).eq("role_id", roleId);
        userRolesMap[userId]?.delete(roleId);
      }
    });
  });

  // Accès direct aux apps : cocher/décocher
  usersTbody.querySelectorAll("[data-app-toggle]").forEach(cb => {
    cb.addEventListener("change", async () => {
      const userId = cb.dataset.user;
      const appId = parseInt(cb.dataset.app);
      if (cb.checked) {
        await sbClient.from("app_access_user").insert({ user_id: userId, app_id: appId });
        (userAppAccessMap[userId] ??= new Set()).add(appId);
      } else {
        await sbClient.from("app_access_user").delete().eq("user_id", userId).eq("app_id", appId);
        userAppAccessMap[userId]?.delete(appId);
      }
    });
  });

  usersTbody.querySelectorAll("[data-edit-user]").forEach(btn => {
    btn.addEventListener("click", () => openUserModal(btn.dataset.editUser));
  });

  usersTbody.querySelectorAll("[data-delete-user]").forEach(btn => {
    btn.addEventListener("click", () => deleteUser(btn.dataset.deleteUser));
  });
}

// ---------- Rendu : tableau accès par rôle ----------
function renderRoleAccessTable() {
  roleAccessThead.innerHTML = `<th>Rôle</th>` + allApps.map(a => `<th>${a.icon || ""} ${a.name}</th>`).join("");

  if (allRoles.length === 0) {
    roleAccessTbody.innerHTML = `<tr><td>Aucun rôle.</td></tr>`;
    return;
  }

  roleAccessTbody.innerHTML = allRoles.map(role => {
    const current = roleAppAccessMap[role.id] || new Set();
    const cells = allApps.map(app => `
      <td style="text-align:center">
        <input type="checkbox" data-role-app-toggle data-role="${role.id}" data-app="${app.id}"
          ${current.has(app.id) ? "checked" : ""}>
      </td>
    `).join("");
    return `<tr><td><strong>${role.name}</strong></td>${cells}</tr>`;
  }).join("");

  roleAccessTbody.querySelectorAll("[data-role-app-toggle]").forEach(cb => {
    cb.addEventListener("change", async () => {
      const roleId = parseInt(cb.dataset.role);
      const appId = parseInt(cb.dataset.app);
      if (cb.checked) {
        await sbClient.from("app_access_role").insert({ role_id: roleId, app_id: appId });
        (roleAppAccessMap[roleId] ??= new Set()).add(appId);
      } else {
        await sbClient.from("app_access_role").delete().eq("role_id", roleId).eq("app_id", appId);
        roleAppAccessMap[roleId]?.delete(appId);
      }
    });
  });
}

// ---------- Création / édition / suppression d'utilisateur (via API sécurisée) ----------
const userModal = document.getElementById("user-modal");
const modalTitle = document.getElementById("user-modal-title");
const modalEmail = document.getElementById("modal-email");
const modalPassword = document.getElementById("modal-password");
const modalPasswordLabel = document.getElementById("modal-password-label");
const modalError = document.getElementById("modal-error");
let editingUserId = null;

document.getElementById("new-user-btn").addEventListener("click", () => openUserModal(null));
document.getElementById("modal-cancel-btn").addEventListener("click", closeUserModal);

function openUserModal(userId) {
  editingUserId = userId;
  modalError.textContent = "";
  modalPassword.value = "";

  if (userId) {
    const profile = allProfiles.find(p => p.id === userId);
    modalTitle.textContent = "Éditer l'utilisateur";
    modalEmail.value = profile?.email || "";
    modalPasswordLabel.textContent = "Nouveau mot de passe (optionnel)";
  } else {
    modalTitle.textContent = "Nouvel utilisateur";
    modalEmail.value = "";
    modalPasswordLabel.textContent = "Mot de passe";
  }
  userModal.classList.remove("hidden");
}

function closeUserModal() {
  userModal.classList.add("hidden");
}

document.getElementById("modal-save-btn").addEventListener("click", async () => {
  modalError.textContent = "";
  const email = modalEmail.value.trim();
  const password = modalPassword.value;

  if (!email) {
    modalError.textContent = "L'email est requis.";
    return;
  }
  if (!editingUserId && !password) {
    modalError.textContent = "Le mot de passe est requis pour un nouvel utilisateur.";
    return;
  }

  const action = editingUserId ? "update" : "create";
  const payload = editingUserId
    ? { userId: editingUserId, email, password: password || undefined }
    : { email, password };

  try {
    await callAdminApi(action, payload);
    closeUserModal();
    await loadAll();
    renderUsersTable();
    renderRoleAccessTable();
  } catch (err) {
    modalError.textContent = err.message || "Une erreur est survenue.";
  }
});

async function deleteUser(userId) {
  if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
  try {
    await callAdminApi("delete", { userId });
    await loadAll();
    renderUsersTable();
    renderRoleAccessTable();
  } catch (err) {
    alert(err.message || "Erreur lors de la suppression.");
  }
}

async function callAdminApi(action, payload) {
  const res = await fetch("/api/admin-users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur.");
  return data;
}
