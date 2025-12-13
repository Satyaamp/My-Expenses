import { apiRequest } from "./api.js";

const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await apiRequest("/auth/register", "POST", {
      name,
      email,
      password
    });

    alert("Registration successful. Please login.");
    window.location.href = "index.html";
  } catch (err) {
    alert(err.message);
  }
});
