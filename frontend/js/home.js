// If user already logged in → go to dashboard
if (localStorage.getItem("token")) {
  window.location.href = "dashboard.html";
}
