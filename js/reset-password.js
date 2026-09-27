// Le lien reçu par mail ouvre une session temporaire de "récupération" :
// supabase-js la lit automatiquement dans l'URL au chargement.
const resetForm = document.getElementById("reset-form");
const resetError = document.getElementById("reset-error");
const resetSubmit = document.getElementById("reset-submit");

function showForm() {
  document.getElementById("loading-msg").classList.add("hidden");
  resetForm.classList.remove("hidden");
}

function showInvalid() {
  document.getElementById("loading-msg").classList.add("hidden");
  document.getElementById("invalid-link").classList.remove("hidden");
}

sbClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") showForm();
});

(async () => {
  // Erreur renvoyée par Supabase dans l'URL (lien expiré, déjà utilisé...)
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  if (params.get("error")) return showInvalid();

  const { data: { session } } = await sbClient.auth.getSession();
  if (session) showForm();
  else showInvalid();
})();

resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  resetError.textContent = "";

  const password = document.getElementById("new-password").value;
  const confirm = document.getElementById("confirm-password").value;

  if (password !== confirm) {
    resetError.textContent = "Les deux mots de passe ne correspondent pas.";
    return;
  }

  resetSubmit.disabled = true;
  const { error } = await sbClient.auth.updateUser({ password });
  resetSubmit.disabled = false;

  if (error) {
    resetError.textContent = error.code === "same_password"
      ? "Le nouveau mot de passe doit être différent de l'ancien."
      : "Impossible de changer le mot de passe : " + error.message;
    return;
  }

  alert("Mot de passe modifié ✅");
  window.location.href = "dashboard.html";
});
