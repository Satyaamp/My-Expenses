import { apiRequest } from "./api.js";


/* ===============================
   GLOBAL ELEMENTS
================================ */
const picker = document.getElementById("monthPicker");
const mobileDayInput = document.getElementById("mobile-day-input");
const mobileListContainer = document.getElementById("mobile-transaction-list");
const mobileMonthText = document.getElementById("mobileMonthText");
const mobileMonthSwipe = document.getElementById("mobileMonthSwipe");

let currentMonthExpenses = [];

/* ===============================
   INIT
================================ */
const now = new Date();
picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

updateMobileMonthText();
loadMonthlyData();

/* Desktop Picker Change */
picker.addEventListener("change", () => {
  updateMobileMonthText();
  loadMonthlyData();
});

/* ===============================
   LOAD MONTHLY DATA
================================ */
async function loadMonthlyData() {
  const [year, month] = picker.value.split("-");

  const res = await apiRequest(
    `/expenses/summary/monthly?month=${month}&year=${year}`
  );

  document.getElementById("monthlyIncome").innerText = `₹${res.data.totalIncome}`;
  document.getElementById("monthlyExpense").innerText = `₹${res.data.totalExpense}`;
  document.getElementById("monthlyBalance").innerText = `₹${res.data.balance}`;

  renderExpenseHistogram(res.data.categories);
  await loadDateWiseExpenses(month, year);
}

/* ===============================
   CATEGORY HISTOGRAM
================================ */
function renderExpenseHistogram(categories) {
  const container = document.getElementById("expenseHistogram");
  container.innerHTML = "";

  if (!categories || categories.length === 0) {
    container.innerHTML = "<p>No data available</p>";
    return;
  }

  const totalExpense = categories.reduce((sum, c) => sum + c.total, 0);

  categories.forEach((cat, index) => {
    const percent = ((cat.total / totalExpense) * 100).toFixed(1);

    const item = document.createElement("div");
    item.className = "histogram-item";

    item.innerHTML = `
      <div class="histogram-header">
        <span class="category-name">${cat.category}</span>
        <span class="category-value">
          ₹${cat.total}
          <span class="category-percent">${percent}%</span>
        </span>
      </div>

      <div class="histogram-bar-wrapper">
        <div 
          class="histogram-bar" 
          style="--bar-width:${percent}%"
        ></div>
      </div>

      <div class="histogram-count">
        ${cat.count} transaction${cat.count !== 1 ? "s" : ""}
      </div>
    `;

    container.appendChild(item);
  });
}

/* ===============================
   DATE-WISE DATA
================================ */
async function loadDateWiseExpenses(month, year) {
  const res = await apiRequest(`/expenses/month?month=${month}&year=${year}`);
  currentMonthExpenses = res.data;

  renderCalendar(+year, +month - 1);
  setupMobileDaySearch();
}

/* ===============================
   MOBILE DAY SEARCH (ONLY ONE INPUT)
================================ */
function setupMobileDaySearch() {
  if (!mobileDayInput || !mobileListContainer) return;

  mobileDayInput.value = "";
  mobileListContainer.innerHTML =
    `<p class="text-muted">Enter a day (1–31) to see transactions</p>`;

  mobileDayInput.oninput = () => {
    const day = mobileDayInput.value.trim();

    if (!day || day < 1 || day > 31) {
      mobileListContainer.innerHTML =
        `<p class="text-muted">Enter a valid day (1–31)</p>`;
      return;
    }

    const [year, month] = picker.value.split("-");
    const dateStr = `${year}-${month}-${String(day).padStart(2, "0")}`;

    renderMobileTransactions(dateStr);
  };
}

function renderMobileTransactions(dateStr) {
  const tx = getTransactionsForDate(dateStr);

  if (!tx.length) {
    mobileListContainer.innerHTML =
      `<p class="text-muted">No transactions found for this date.</p>`;
    return;
  }

  mobileListContainer.innerHTML = tx.map(t => `
    <div class="transaction-item">
      <div class="transaction-top">
        <span class="transaction-amount expense">-₹${t.amount}</span>
        <span class="transaction-category">${t.category}</span>
      </div>
      <div class="transaction-description">
        ${t.description || "No description"}
      </div>
    </div>
  `).join("");
}

/* ===============================
   UTILITIES
================================ */
function getTransactionsForDate(dateStr) {
  return currentMonthExpenses.filter(e =>
    new Date(e.date).toISOString().split("T")[0] === dateStr
  );
}

/* ===============================
   DESKTOP CALENDAR
================================ */
function renderCalendar(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let html = `
    <div class="calendar-view">
      <div class="calendar-header">
        ${new Date(year, month).toLocaleString("default", { month: "long" })} ${year}
      </div>
      <div class="calendar-grid">
        ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
          .map(d => `<div class="calendar-day-label">${d}</div>`).join("")}
  `;

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const txCount = getTransactionsForDate(dateStr).length;
    const hasTx = txCount > 0;
    const disabled = new Date(year,month,d) > today ? "disabled" : "";

    html += `
      <div class="calendar-day 
        ${hasTx ? "day-has-tx" : "day-no-tx"} 
        ${disabled}"
        data-date="${dateStr}">
        ${d}
      </div>`;
  }

  html += `
      </div>
    </div>

    <div class="transactions-panel">
      <div class="transactions-header">
        <h4 id="selectedDateTitle">Select a date</h4>
      </div>
      <div class="transactions-list" id="transactionsList">
        <div class="empty-state">
          <p>📅</p>
          <p>Select a date</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("dateWiseList").innerHTML = html;

  document.querySelectorAll(".calendar-day:not(.empty)").forEach(cell => {
    cell.addEventListener("click", () => {
      if (cell.classList.contains("disabled")) return;
      selectDate(cell.dataset.date, cell);
    });
  });
}

/* ===============================
   DESKTOP DATE SELECT
================================ */
function selectDate(dateStr, cell) {
  document.querySelectorAll(".calendar-day.selected")
    .forEach(d => d.classList.remove("selected"));

  cell.classList.add("selected");

  const list = document.getElementById("transactionsList");
  const tx = getTransactionsForDate(dateStr);

  document.getElementById("selectedDateTitle").innerText =
    new Date(dateStr).toDateString();

  if (!tx.length) {
    list.innerHTML =
      `<div class="empty-state"><p>📭</p><p>No transactions</p></div>`;
    return;
  }

  list.innerHTML = tx.map(t => `
    <div class="transaction-item">
      <div class="transaction-top">
        <span class="transaction-amount expense">-₹${t.amount}</span>
        <span class="transaction-category">${t.category}</span>
      </div>
      <div class="transaction-description">
        ${t.description || "No description"}
      </div>
    </div>
  `).join("");
}

/* ===============================
   MOBILE MONTH SWIPE
================================ */
/* Update visible month text */
function updateMobileMonthText() {
  if (!mobileMonthText) return;

  const [year, month] = picker.value.split("-");
  const date = new Date(year, month - 1);

  mobileMonthText.innerText =
    date.toLocaleString("default", {
      month: "long",
      year: "numeric"
    });
}

let touchStartX = 0;
let touchEndX = 0;

if (mobileMonthSwipe) {
  mobileMonthSwipe.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
  });

  mobileMonthSwipe.addEventListener("touchend", e => {
    touchEndX = e.changedTouches[0].screenX;
    handleMonthSwipe();
  });
}

function handleMonthSwipe() {
  const diff = touchEndX - touchStartX;

  // Minimum swipe distance
  if (Math.abs(diff) < 50) return;

  if (diff < 0) {
    changeMonth(1);   // swipe left → next month
  } else {
    changeMonth(-1);  // swipe right → previous month
  }
}

function changeMonth(delta) {
  const [year, month] = picker.value.split("-").map(Number);
  
  // Create Date object for target month (using date 1 to avoid overflow)
  const newDate = new Date(year, month - 1 + delta, 1);
  
  // Get current date to compare against (also set to day 1 for strict month comparison)
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // BLOCKING LOGIC: If the user tries to go past the current month
  if (newDate > currentMonthStart) {
    showToast("Future data not available");
    return; // Block execution
  }

  const newMonth = String(newDate.getMonth() + 1).padStart(2, "0");
  const newYear = newDate.getFullYear();

  picker.value = `${newYear}-${newMonth}`;

  updateMobileMonthText();
  loadMonthlyData();
}

/* ===============================
   TOAST NOTIFICATION HELPER
================================ */
function showToast(message) {
  // 1. Create toast element if it doesn't exist
  let toast = document.getElementById("toast-notification");
  
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    
    // Apply styling via JS so no CSS file edit is needed
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "80px", // Just above bottom nav usually
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(33, 37, 41, 0.9)", // Dark grey/black
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "20px",
      fontSize: "0.9rem",
      zIndex: "9999",
      opacity: "0",
      transition: "opacity 0.3s ease",
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
      pointerEvents: "none"
    });
    
    document.body.appendChild(toast);
  }

  // 2. Set text and show
  toast.innerText = message;
  toast.style.opacity = "1";

  // 3. Clear existing timeout if multiple swipes happen quickly
  if (toast.hideTimeout) clearTimeout(toast.hideTimeout);

  // 4. Hide after 2 seconds
  toast.hideTimeout = setTimeout(() => {
    toast.style.opacity = "0";
  }, 2000);
}