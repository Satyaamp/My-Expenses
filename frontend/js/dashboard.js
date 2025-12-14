
const chartColors = {
  primary: "#7C7CFF",
  success: "#22C55E",
  warning: "#FACC15",
  danger: "#EF4444",
  info: "#38BDF8",
  violet: "#A78BFA",
  bg: "rgba(255,255,255,0.08)"
};



import { apiRequest } from "./api.js";

// Categories from backend/src/models/expense.model.js
const EXPENSE_CATEGORIES = [
  'Food', 
  'Transport', 
  'Groceries', 
  'Rent', 
  'Stationery', 
  'Personal Care',
  'Electric Bill',  
  'Water Bill',  
  'Cylinder',  
  'Internet Bill',  
  'EMI',            
  'Recharge',      
  'Other'
];

// Global Chart Instances
let categoryChart = null;
let weeklyChart = null;
let monthlyChart = null;


/* ===============================
   LOADING HELPER
================================ */
function toggleChartLoading(canvasId, isLoading) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  
  if (isLoading) {
    const loader = document.createElement("div");
    loader.className = "chart-loading";
    loader.innerHTML = '<div class="spinner"></div>';
    parent.appendChild(loader);
  } else {
    const loader = parent.querySelector(".chart-loading");
    if (loader) loader.remove();
  }
}

/* ===============================
   POPULATE CATEGORIES
================================ */
function populateCategorySelect() {
  const select = document.getElementById("expenseCategory");
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>Select Category</option>';
  
  EXPENSE_CATEGORIES.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/* ===============================
   DASHBOARD SUMMARY (BALANCE)
================================ */

async function loadDashboard() {
  try {
    const res = await apiRequest("/expenses/balance");

    document.getElementById("balance").innerText =
      `₹${res.data.remainingBalance}`;

    document.getElementById("totalIncome").innerText =
      `₹${res.data.totalIncome}`;

    document.getElementById("totalExpense").innerText =
      `₹${res.data.totalExpense}`;

  } catch (err) {
    alert(err.message);
  }
}

/* ===============================
   AUTH / LOGOUT
================================ */

window.logout = function () {
  localStorage.removeItem("token");
  window.location.href = "index.html";
};

/* ===============================
   EXPENSE MODAL
================================ */


window.openExpense = function () {
  const modal = document.getElementById("expenseModal");

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open"); 
};

window.closeExpense = function () {
  const modal = document.getElementById("expenseModal");

  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
};


window.addExpense = async function () {
  const amount = document.getElementById("expenseAmount").value;
  const category = document.getElementById("expenseCategory").value;
  const date = document.getElementById("expenseDate").value;
  const description = document.getElementById("expenseDesc").value;

  if (!amount || !category || !date) {
    alert("Amount, category and date are required");
    return;
  }

  try {
    await apiRequest("/expenses", "POST", {
      amount,
      category,
      date,
      description
    });

    closeExpense();
    loadDashboard();
    loadRecentExpenses(); 
    alert("Expense added successfully");

  } catch (err) {
    alert(err.message);
  }
};

/* ===============================
   INCOME MODAL
================================ */

window.openIncome = function () {
  const modal = document.getElementById("incomeModal");
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
};

window.closeIncome = function () {
  const modal = document.getElementById("incomeModal");
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
};


window.addIncome = async function () {
  const amount = document.getElementById("incomeAmount").value;
  const source = document.getElementById("incomeSource").value;
  const date = document.getElementById("incomeDate").value;

  if (!amount || !date) {
    alert("Amount and date are required");
    return;
  }

  try {
    await apiRequest("/income", "POST", {
      amount,
      source,
      date
    });

    closeIncome();
    loadDashboard();
    alert("Income added successfully");

  } catch (err) {
    alert(err.message);
  }
};

/* ===============================
   RECENT EXPENSES 
================================ */

async function loadRecentExpenses() {
  try {
    const res = await apiRequest("/expenses/weekly");
    const list = document.getElementById("expenseList");
    list.innerHTML = "";

    if (!res.data || res.data.length === 0) {
      list.innerHTML = "<li>No recent expenses</li>";
      return;
    }

    res.data.forEach(exp => {
      const li = document.createElement("li");

      const date = new Date(exp.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short"
      });

      li.innerHTML = `
        <div class="expense-row">
          <span class="exp-date">${date}</span>
          <span class="exp-amount">₹${exp.amount}</span>
          <span class="exp-category">${exp.category}</span>
          <span class="exp-desc">
            ${exp.description || "—"}
          </span>
        </div>
      `;

      list.appendChild(li);
    });

  } catch (err) {
    alert(err.message);
  }
}


/* ===============================
   VIEW ALL EXPENSES
================================ */

window.loadAllExpenses = function () {
  window.location.href = "monthly.html";
};


async function loadCategoryChart(startDate = "", endDate = "") {
  toggleChartLoading("categoryChart", true);
  try {
    let url = "/expenses/summary/category";
    if (startDate || endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await apiRequest(url, "GET", null, { skipLoader: true });

    const labels = res.data.map(i => i._id);
    const values = res.data.map(i => i.total);

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(document.getElementById("categoryChart"), {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            chartColors.primary,
            chartColors.success,
            chartColors.warning,
            chartColors.danger,
            chartColors.info,
            chartColors.violet
          ],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#fff",
              padding: 15,
              font: { size: 12 }
            }
          }
        },
        animation: {
          animateScale: true
        }
      }
    });
  } catch (err) {
    console.error("Failed to load category chart", err);
  } finally {
    toggleChartLoading("categoryChart", false);
  }
}



async function loadWeeklyTrend(startDate = "", endDate = "") {
  toggleChartLoading("weeklyChart", true);
  try {
    let url = "/expenses/weekly";
    if (startDate || endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    } else {
      // If no range selected, default to last 7 days to ensure chart gets data
      // (Backend default limits to 3 items which is bad for charts)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      url += `?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`;
    }
    
    const res = await apiRequest(url, "GET", null, { skipLoader: true });

    const grouped = {};
    res.data.forEach(e => {
      const day = new Date(e.date).toLocaleDateString("en-IN", {
        weekday: "short"
      });
      grouped[day] = (grouped[day] || 0) + e.amount;
    });

    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(document.getElementById("weeklyChart"), {
      type: "line",
      data: {
        labels: Object.keys(grouped),
        datasets: [{
          label: "Spending (₹)",
          data: Object.values(grouped),
          borderColor: chartColors.primary,
          backgroundColor: "rgba(124,124,255,0.2)",
          fill: true,
          tension: 0.45,
          pointRadius: 4,
          pointBackgroundColor: "#fff"
        }]
      },
      options: {
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: "#ddd" }, grid: { display: false } },
          y: { ticks: { color: "#ddd" }, grid: { color: "rgba(255,255,255,0.05)" } }
        }
      }
    });
  } catch (err) {
    console.error("Failed to load weekly chart", err);
  } finally {
    toggleChartLoading("weeklyChart", false);
  }
}



async function loadMonthlyHistogram(startDate = "", endDate = "") {
  toggleChartLoading("monthlyChart", true);
  try {
    let url = "/expenses";
    if (startDate || endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await apiRequest(url, "GET", null, { skipLoader: true });

    const grouped = {};
    res.data.forEach(e => {
      const key = `${e.month}/${e.year}`;
      grouped[key] = (grouped[key] || 0) + e.amount;
    });

    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(document.getElementById("monthlyChart"), {
      type: "bar",
      data: {
        labels: Object.keys(grouped),
        datasets: [{
          label: "Monthly Spend (₹)",
          data: Object.values(grouped),
          backgroundColor: chartColors.success,
          borderRadius: 8,
          barThickness: 28
        }]
      },
      options: {
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: "#ddd" }, grid: { display: false } },
          y: { ticks: { color: "#ddd" }, grid: { color: "rgba(255,255,255,0.05)" } }
        }
      }
    });
  } catch (err) {
    console.error("Failed to load monthly chart", err);
  } finally {
    toggleChartLoading("monthlyChart", false);
  }
}

/* ===============================
   FILTER LOGIC
================================ */
window.filterCharts = function() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  
  loadCategoryChart(start, end);
  loadWeeklyTrend(start, end);
  loadMonthlyHistogram(start, end);
};

window.resetFilters = function() {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  loadCategoryChart();
  loadWeeklyTrend();
  loadMonthlyHistogram();
};

/* ===============================
   INITIAL PAGE LOAD
================================ */

loadDashboard();
loadRecentExpenses();
populateCategorySelect();

loadCategoryChart();
loadWeeklyTrend();
loadMonthlyHistogram();
