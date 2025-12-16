import { apiRequest } from "./api.js";

async function loadProfile() {
  const loader = document.getElementById("profileLoading");
  const container = document.getElementById("profileDetails");

  try {
    const res = await apiRequest("/auth/me", "GET");
    const user = res.data;

    const fmt = (d) => d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "N/A";

    container.innerHTML = `
      <div class="profile-grid">
        <div class="profile-card-item">
          <div class="icon-box">👤</div>
          <div class="info-box">
            <label>Full Name</label>
            <p>${user.name || "N/A"}</p>
          </div>
        </div>
        <div class="profile-card-item">
          <div class="icon-box">📧</div>
          <div class="info-box">
            <label>Email Address</label>
            <p>${user.email || "N/A"}</p>
          </div>
        </div>
        <div class="profile-card-item">
          <div class="icon-box">📅</div>
          <div class="info-box">
            <label>Joined On</label>
            <p>${fmt(user.createdAt)}</p>
          </div>
        </div>
        <div class="profile-card-item">
          <div class="icon-box">🔄</div>
          <div class="info-box">
            <label>Last Updated</label>
            <p>${fmt(user.updatedAt)}</p>
          </div>
        </div>
      </div>

      <div style="text-align: center;">
        <button class="edit-btn" onclick="enableEditMode()">✏️ Edit Profile</button>
        <button class="edit-btn" style="background: #38BDF8; color: #000; margin-left: 10px;" onclick="exportData()">📥 Export Data</button>
        <input type="file" id="importFile" style="display: none;" accept=".json" onchange="handleImport(this)" />
      </div>

      <div class="danger-zone">
        <h3>Danger Zone</h3>
        <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 15px;">Once you delete your account, there is no going back. Please be certain.</p>
        <button class="delete-btn" onclick="deleteAccount()">Delete Account</button>
      </div>
    `;

    loader.style.display = "none";
    container.style.display = "block";

  } catch (err) {
    alert("Failed to load profile: " + err.message);
    window.location.href = "dashboard.html";
  }
}

// Placeholder for future edit functionality
window.enableEditMode = function() {
  alert("Edit Profile feature coming soon!");
};

window.exportData = async function() {
  try {
    const blob = await apiRequest("/auth/export", "GET");
    
    // Create a blob and download
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `dhanrekha_backup_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Data exported successfully!", "success");
  } catch (err) {
    showToast("Failed to export data: " + err.message, "error");
  }
};

window.triggerImport = function() {
  document.getElementById("importFile").click();
};

window.handleImport = async function(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const json = JSON.parse(e.target.result);
      await apiRequest("/auth/import", "POST", json);
      showToast("Data imported successfully!", "success");
    } catch (err) {
      showToast("Failed to import data: " + err.message, "error");
    }
    input.value = ""; // Reset input
  };
  reader.readAsText(file);
};

window.deleteAccount = function() {
  document.getElementById("deleteModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
};

window.closeDeleteModal = function() {
  document.getElementById("deleteModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
};

window.confirmDelete = async function() {
  try {
    await apiRequest("/auth/me", "DELETE");
    showToast("Account deleted successfully.", "success");
    localStorage.removeItem("token");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (err) {
    showToast("Failed to delete account: " + err.message, "error");
    closeDeleteModal();
  }
};

loadProfile();

/* ===============================
   TOAST NOTIFICATION HELPER
================================ */
function showToast(message, type = "error") {
  // 1. Play Beep Sound (Short, subtle alert)
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime); // Low volume
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15); // 150ms duration
    }
  } catch (e) {
    // Ignore audio context errors
  }

  // 2. Create toast element if it doesn't exist
  let toast = document.getElementById("toast-notification");
  
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    
    // Apply styling via JS so no CSS file edit is needed
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "80px", // Just above bottom nav usually
      left: "50%",
      transform: "translateX(-50%) translateY(20px)",
      
      backdropFilter: "blur(12px)",
      webkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.25)",
      
      color: "#fff",
      padding: "12px 24px",
      borderRadius: "50px",
      fontSize: "0.95rem",
      fontWeight: "500",
      zIndex: "9999",
      opacity: "0",
      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      pointerEvents: "none",
      whiteSpace: "nowrap"
    });
    
    document.body.appendChild(toast);
  }

  // 3. Apply Dynamic Colors based on Type
  if (type === "success") {
    toast.style.background = "rgba(34, 197, 94, 0.85)"; // Green
    toast.style.boxShadow = "0 8px 32px rgba(34, 197, 94, 0.3)";
  } else {
    toast.style.background = "rgba(220, 38, 38, 0.85)"; // Red
    toast.style.boxShadow = "0 8px 32px rgba(220, 38, 38, 0.3)";
  }

  // 4. Set text and show
  toast.innerText = message;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";

  // 4. Clear existing timeout if multiple swipes happen quickly
  if (toast.hideTimeout) clearTimeout(toast.hideTimeout);

  // 5. Hide after 2 seconds
  toast.hideTimeout = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
  }, 2000);
}