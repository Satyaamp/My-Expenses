// ================================
// AUTH + APP LOCK GUARD
// ================================

// Check login
const token = localStorage.getItem("token");

// ❌ User not logged in → go to home
if (!token) {
  window.location.replace("index.html");
}

// 🔐 App lock enabled?
const appLockEnabled = localStorage.getItem("appLockEnabled");

// 🔒 Session unlocked?
const unlocked = sessionStorage.getItem("unlocked");

// If app lock is enabled and session is NOT unlocked → go to lock screen
if (token && appLockEnabled === "true" && !unlocked) {
  // Avoid redirect loop
  if (!window.location.pathname.includes("lock.html")) {
    window.location.replace("lock.html");
  }
}
