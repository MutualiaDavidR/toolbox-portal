// Si déjà connecté, on va directement au dashboard
(async () => {
  const { data: { session } } = await sbClient.auth.getSession();
  if (session) window.location.href = "dashboard.html";
})();

const form = document.getElementById("login-form");
const errorBox = document.getElementById("error-box");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await sbClient.auth.signInWithPassword({ email, password });

  if (error) {
    errorBox.textContent = "Identifiants incorrects ou compte inconnu.";
    return;
  }

  window.location.href = "dashboard.html";
});

// ---------- Mot de passe oublié ----------
const forgotForm = document.getElementById("forgot-form");
const forgotError = document.getElementById("forgot-error");
const forgotSuccess = document.getElementById("forgot-success");
const forgotSubmit = document.getElementById("forgot-submit");

document.getElementById("forgot-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("forgot-email").value = document.getElementById("email").value.trim();
  forgotError.textContent = "";
  forgotSuccess.textContent = "";
  form.classList.add("hidden");
  forgotForm.classList.remove("hidden");
});

document.getElementById("back-to-login").addEventListener("click", (e) => {
  e.preventDefault();
  forgotForm.classList.add("hidden");
  form.classList.remove("hidden");
});

forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  forgotError.textContent = "";
  forgotSuccess.textContent = "";
  forgotSubmit.disabled = true;

  const email = document.getElementById("forgot-email").value.trim();
  // Supabase n'envoie le mail que si le compte existe. On affiche le même
  // message dans tous les cas pour ne pas révéler quels emails sont inscrits.
  const redirectTo = new URL("reset-password.html", window.location.href).href;
  const { error } = await sbClient.auth.resetPasswordForEmail(email, { redirectTo });

  forgotSubmit.disabled = false;

  if (error) {
    forgotError.textContent = error.status === 429
      ? "Trop de demandes, réessaie dans quelques minutes."
      : "Impossible d'envoyer le lien pour le moment.";
    return;
  }

  forgotSuccess.textContent = "Si cet email correspond à un compte, un lien de réinitialisation vient de t'être envoyé.";
});
