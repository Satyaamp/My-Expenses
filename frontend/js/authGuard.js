const token = localStorage.getItem("token");

// ❌ Not logged in
if (!token) {
  window.location.href = "index.html";
}

// 🔐 App Lock
if (!sessionStorage.getItem("unlocked")) {
  window.location.href = "lock.html";
}


async function authenticateWithBiometric() {
  try {
    if (!window.PublicKeyCredential) {
      throw new Error("Biometric not supported");
    }

    // 🔑 Use platform authenticator
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        timeout: 60000,
        userVerification: "required",
        allowCredentials: [], // allow platform biometric
      }
    });

    if (!credential) throw new Error("Authentication failed");

    // ✅ Unlock session
    sessionStorage.setItem("biometricUnlocked", "true");

  } catch (err) {
    alert("Authentication required to continue");
    window.location.href = "index.html";
  }
}
