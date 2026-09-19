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
