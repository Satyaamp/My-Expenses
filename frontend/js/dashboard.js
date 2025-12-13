
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
  document.getElementById("expenseModal").classList.remove("hidden");
};

window.closeExpense = function () {
  document.getElementById("expenseModal").classList.add("hidden");
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
    loadRecentExpenses(); // ✅ refresh recent list
    alert("Expense added successfully");

  } catch (err) {
    alert(err.message);
  }
};

/* ===============================
   INCOME MODAL
================================ */

window.openIncome = function () {
  document.getElementById("incomeModal").classList.remove("hidden");
};

window.closeIncome = function () {
  document.getElementById("incomeModal").classList.add("hidden");
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
   RECENT EXPENSES (LAST 7 DAYS)
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

      li.innerHTML = `
        <span>₹${exp.amount} - ${exp.category}</span>
    
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

/* ===============================
   DELETE EXPENSE
================================ */

window.deleteExpense = async function (id) {
  if (!confirm("Delete this expense?")) return;

  try {
    await apiRequest(`/expenses/${id}`, "DELETE");
    loadRecentExpenses();
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
};



async function loadCategoryChart() {
  const res = await apiRequest("/expenses/summary/category");

  const labels = res.data.map(i => i._id);
  const values = res.data.map(i => i.total);

  new Chart(document.getElementById("categoryChart"), {
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
}



async function loadWeeklyTrend() {
  const res = await apiRequest("/expenses/weekly");

  const grouped = {};
  res.data.forEach(e => {
    const day = new Date(e.date).toLocaleDateString("en-IN", {
      weekday: "short"
    });
    grouped[day] = (grouped[day] || 0) + e.amount;
  });

  new Chart(document.getElementById("weeklyChart"), {
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
}



async function loadMonthlyHistogram() {
  const res = await apiRequest("/expenses");

  const grouped = {};
  res.data.forEach(e => {
    const key = `${e.month}/${e.year}`;
    grouped[key] = (grouped[key] || 0) + e.amount;
  });

  new Chart(document.getElementById("monthlyChart"), {
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
}


/* ===============================
   INITIAL PAGE LOAD
================================ */

loadDashboard();
loadRecentExpenses();

loadCategoryChart();
loadWeeklyTrend();
loadMonthlyHistogram();
