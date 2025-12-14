// =====================================
// SERVICE WORKER REGISTRATION
// =====================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => console.log("✅ Service Worker registered"))
      .catch(err => console.log("❌ Service Worker registration failed:", err));
  });
}

// =====================================
// PWA INSTALL BUTTON LOGIC
// =====================================
let deferredPrompt;
const installBtn = document.getElementById("installBtn");

// Detect install availability
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install button after delay
  setTimeout(() => {
    if (!isAppInstalled()) {
      installBtn.style.display = "inline-block";
    }
  }, 5000);
});

// Install button click handler
window.installApp = async function () {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    installBtn.style.display = "none";
    localStorage.setItem("appInstalled", "yes");
  }

  deferredPrompt = null;
};

// =====================================
// CHECK IF APP IS ALREADY INSTALLED
// =====================================
function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    localStorage.getItem("appInstalled") === "yes"
  );
}

// Hide install button if already installed
if (isAppInstalled()) {
  installBtn.style.display = "none";
}

// =====================================
// SAFE AUTO LOGIN (BIOMETRIC FRIENDLY)
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (token) {
    // Allow browser to detect installability first
    setTimeout(() => {
      // Dashboard + authGuard will handle biometric
      window.location.href = "dashboard.html";
    }, 4000);
  }
});
