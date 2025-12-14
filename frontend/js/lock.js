async function unlock() {
  try {
    // This uses system device authentication (fingerprint / face / PIN)
    if (window.isSecureContext && "credentials" in navigator) {
      await navigator.credentials.preventSilentAccess();
    }

    // ✅ Unlock session
    sessionStorage.setItem("unlocked", "true");

    // Go back to dashboard
    window.location.href = "dashboard.html";

  } catch (e) {
    alert("Authentication failed");
  }
}
