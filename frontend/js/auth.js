import { apiRequest } from "./api.js";

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

    // 🔐 Ask to enable biometric
    if (window.PublicKeyCredential) {
      const enableBio = confirm(
        "Enable fingerprint / face unlock for faster login next time?"
      );

      if (enableBio) {
        localStorage.setItem("biometricEnabled", "true");
      }
    }

    // Redirect to dashboard
    window.location.href = "dashboard.html";
  } catch (err) {
    alert(err.message);
  }
});
