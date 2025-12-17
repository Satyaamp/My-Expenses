import { apiRequest, showToast } from "./api.js";

const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const btn = document.getElementById("signupBtn");
  const originalText = btn.innerText;

  try {
    btn.disabled = true;
    btn.innerHTML = 'Creating your space<span class="loading-dots"></span>';

    await apiRequest("/auth/register", "POST", {
      name,
      email,
      password
    });

    showToast("Registration successful. Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (err) {
    showToast(err.message, "error");
    btn.disabled = false;
    btn.innerText = originalText;
  }
});
