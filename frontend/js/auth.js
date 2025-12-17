import { apiRequest, showToast } from "./api.js";

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await apiRequest("/auth/login", "POST", {
      email,
      password
    });

    // Save JWT
    localStorage.setItem("token", res.data);

    // Redirect to dashboard
    window.location.href = "dashboard.html";
  } catch (err) {
    showToast(err.message, "error");
  }
});
