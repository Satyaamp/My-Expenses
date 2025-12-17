
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
let yearlyChart = null;
let dayOfWeekChart = null;
let currentSlide = 0;


/* ===============================
   CAROUSEL LOGIC
================================ */
function setupCarousel() {
  const container = document.querySelector(".carousel-container");
  const track = document.getElementById("analyticsTrack");
  const dotsContainer = document.getElementById("carouselDots");
  const slides = document.querySelectorAll(".carousel-slide");
  
  if (!track || slides.length === 0) return;

  // Create dots
  dotsContainer.innerHTML = "";
  slides.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.className = `dot ${i === 0 ? "active" : ""}`;
    dot.onclick = () => goToSlide(i);
    dotsContainer.appendChild(dot);
  });

  let startX = 0;
  let isDragging = false;

  // Touch events for swipe
  track.addEventListener("touchstart", (e) => {
    // Prevent carousel swipe if user is scrolling a chart horizontally
    if (e.target.closest('.chart-scroll-wrapper')) {
      return; 
    }

    startX = e.touches[0].clientX;
    isDragging = true;
  });

  track.addEventListener("touchend", (e) => {
    if (!isDragging) return;
    isDragging = false;
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  });

  // Resize Observer to adjust height dynamically
  const resizeObserver = new ResizeObserver(() => {
    const activeSlide = slides[currentSlide];
    if (activeSlide && container) {
      container.style.height = activeSlide.offsetHeight + "px";
    }
  });
  slides.forEach(slide => resizeObserver.observe(slide));

  function updateCarousel() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    document.querySelectorAll(".dot").forEach((d, i) => {
      d.classList.toggle("active", i === currentSlide);
    });
  }

  function nextSlide() {
    if (currentSlide < slides.length - 1) {
      currentSlide++;
      updateCarousel();
    }
  }

  function prevSlide() {
    if (currentSlide > 0) {
      currentSlide--;
      updateCarousel();
    }
  }

  function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
  }
}

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
   NO DATA HELPER
================================ */
function handleChartDataState(canvasId, hasData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const wrapper = canvas.parentElement;
  let noDataMsg = wrapper.querySelector(".no-data-message");

  if (!hasData) {
    canvas.style.display = "none";
    if (!noDataMsg) {
      noDataMsg = document.createElement("div");
      noDataMsg.className = "no-data-message";
      noDataMsg.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: rgba(255,255,255,0.6); width: 100%; pointer-events: none;";
      noDataMsg.innerHTML = "<p style='font-size: 2rem; margin-bottom: 10px;'>📉</p><p>No data available</p>";
      wrapper.appendChild(noDataMsg);
    }
  } else {
    canvas.style.display = "block";
    if (noDataMsg) noDataMsg.remove();
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

    const income = res.data.totalIncome || 0;
    const expense = res.data.totalExpense || 0;
    const balance = res.data.remainingBalance || 0;

    // Update Text
    document.getElementById("balance").innerText = `₹${balance}`;
    document.getElementById("totalIncome").innerText = `₹${income}`;
    document.getElementById("totalExpense").innerText = `₹${expense}`;

    // Calculate Liquid Fill Percentages (Income is baseline)
    const base = income > 0 ? income : (expense > 0 ? expense : 1);
    
    // Visual Fill (Capped at 100%)
    const expenseFill = Math.min((expense / base) * 100, 100);
    const balanceFill = Math.min((balance / base) * 100, 100);

    // Apply Heights
    document.getElementById("fillIncome").style.height = "100%"; // Income is the limit
    document.getElementById("fillExpense").style.height = `${expenseFill}%`;
    document.getElementById("fillBalance").style.height = `${Math.max(0, balanceFill)}%`;

    // Dynamic Wave Speed based on Fill Level (Higher fill = Faster waves)
    const setWaveSpeed = (id, pct) => {
      const el = document.getElementById(id);
      if (!el) return;
      // Map 0% -> 12s (Slow), 100% -> 3s (Fast)
      const duration = 12 - (pct / 100 * 9); 
      el.style.setProperty('--wave-speed', `${duration}s`);
      el.style.setProperty('--wave-speed-reverse', `${duration * 1.6}s`);
    };

    setWaveSpeed("fillIncome", 100);
    setWaveSpeed("fillExpense", expenseFill);
    setWaveSpeed("fillBalance", Math.max(0, balanceFill));

    // Update Hover Percentages
    document.getElementById("pctIncome").innerText = "100%";
    document.getElementById("pctExpense").innerText = `${((expense / base) * 100).toFixed(1)}%`;
    document.getElementById("pctBalance").innerText = `${((balance / base) * 100).toFixed(1)}%`;
    
  } catch (err) {
    showToast(err.message, "error");
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
    showToast("Amount, category and date are required", "error");
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
    showToast("Expense added successfully", "success");

  } catch (err) {
    showToast(err.message, "error");
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
    showToast("Amount and date are required", "error");
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
    showToast("Income added successfully", "success");

  } catch (err) {
    showToast(err.message, "error");
  }
};

/* ===============================
   RECENT EXPENSES 
================================ */

async function loadRecentExpenses() {
  try {
    const res = await apiRequest("/expenses/weekly");
    const tbody = document.getElementById("expenseTableBody");
    tbody.innerHTML = "";

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding: 20px;'>No recent expenses</td></tr>";
      return;
    }

    res.data.forEach(exp => {
      const tr = document.createElement("tr");

      const d = new Date(exp.date);
      const date = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

      tr.innerHTML = `
        <td style="white-space: nowrap;">${date}</td>
        <td style="font-weight: 600; color: #34d399;">₹${exp.amount}</td>
        <td>${exp.category}</td>
        <td style="opacity: 0.7;">${exp.description || "—"}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    showToast(err.message, "error");
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

    if (!res.data || res.data.length === 0) {
      handleChartDataState("categoryChart", false);
      if (categoryChart) categoryChart.destroy();
      return;
    }
    handleChartDataState("categoryChart", true);

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
          hoverOffset: 15
        }]
      },
      options: {
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#fff",
              padding: 20,
              font: { size: 12, family: "'Segoe UI', sans-serif" },
              usePointStyle: true
            }
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 1500,
          easing: 'easeOutBounce'
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

    if (!res.data || res.data.length === 0) {
      handleChartDataState("weeklyChart", false);
      if (weeklyChart) weeklyChart.destroy();
      return;
    }
    handleChartDataState("weeklyChart", true);

    const grouped = {};
    res.data.forEach(e => {
      const day = new Date(e.date).toLocaleDateString("en-IN", {
        weekday: "short"
      });
      grouped[day] = (grouped[day] || 0) + e.amount;
    });

    const ctx = document.getElementById("weeklyChart").getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(124, 124, 255, 0.5)");
    gradient.addColorStop(1, "rgba(124, 124, 255, 0.0)");

    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: Object.keys(grouped),
        datasets: [{
          label: "Spending (₹)",
          data: Object.values(grouped),
          borderColor: chartColors.primary,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: chartColors.primary,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8,
            displayColors: false
          }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { display: false } },
          y: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.05)", borderDash: [5, 5] } }
        },
        animation: {
          y: {
            duration: 2000,
            easing: 'easeOutQuart'
          }
        }
      }
    });
  } catch (err) {
    console.error("Failed to load weekly chart", err);
  } finally {
    toggleChartLoading("weeklyChart", false);
  }
}



async function loadMonthlyHistogram() {
  toggleChartLoading("monthlyChart", true);
  try {
    // Fetch ALL expenses to build the year list and allow full history navigation
    const res = await apiRequest("/expenses", "GET", null, { skipLoader: true });

    if (!res.data || res.data.length === 0) {
      handleChartDataState("monthlyChart", false);
      if (monthlyChart) monthlyChart.destroy();
      
      // Clear range if no data
      const navRange = document.getElementById("navbarDateRange");
      const mobRange = document.getElementById("mobileDateRange");
      if (navRange) navRange.innerText = "";
      if (mobRange) mobRange.style.display = 'none';
      
      return;
    }

    // CALCULATE OVERALL DATE RANGE
    const dates = res.data.map(e => new Date(e.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const fmt = { month: 'short', year: 'numeric' };
    const startStr = minDate.toLocaleDateString('en-US', fmt);
    const endStr = maxDate.toLocaleDateString('en-US', fmt);
    const rangeText = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
    
    const navRange = document.getElementById("navbarDateRange");
    const mobRange = document.getElementById("mobileDateRange");
    
    if (navRange) navRange.innerText = rangeText;
    if (mobRange) {
      mobRange.innerText = rangeText;
      // Ensure it's visible (might be hidden by CSS on desktop, but block on mobile)
      // We don't force display:block here to respect CSS media queries, 
      // but we ensure content is set.
    }

    // 1. Extract Available Years
    const years = new Set();
    res.data.forEach(e => {
      const y = new Date(e.date).getFullYear();
      years.add(y);
    });
    const sortedYears = Array.from(years).sort((a, b) => b - a); // Descending (Newest first)

    // 2. Populate Year Dropdown
    const yearSelect = document.getElementById("monthlyChartYear");
    let selectedYear = yearSelect ? yearSelect.value : null;

    if (yearSelect) {
      // Default to current year if nothing selected
      if (!selectedYear) selectedYear = new Date().getFullYear().toString();

      yearSelect.innerHTML = "";
      sortedYears.forEach(y => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        opt.style.color = "#333"; // Ensure text is visible on white background
        if (String(y) === String(selectedYear)) opt.selected = true;
        yearSelect.appendChild(opt);
      });

      // If selected year isn't in data (e.g. new year), select the most recent available
      if (!sortedYears.includes(Number(selectedYear)) && sortedYears.length > 0) {
        selectedYear = sortedYears[0];
        yearSelect.value = selectedYear;
      }
    }

    // 3. Filter Data by Selected Year
    const filteredData = res.data.filter(e => new Date(e.date).getFullYear() == selectedYear);

    // Calculate Total for Selected Year
    const totalYearly = filteredData.reduce((sum, e) => sum + e.amount, 0);
    const totalEl = document.getElementById("monthlyYearTotal");
    if (totalEl) totalEl.innerText = `Total: ₹${totalYearly.toFixed(2)}`;

    if (filteredData.length === 0) {
      handleChartDataState("monthlyChart", false);
      if (monthlyChart) monthlyChart.destroy();
      return;
    }
    handleChartDataState("monthlyChart", true);

    // 4. Group by Month (Initialize all 12 months)
    const grouped = new Array(12).fill(0);
    filteredData.forEach(e => {
      const m = new Date(e.date).getMonth(); // 0-11
      grouped[m] += e.amount;
    });

    // Round values to 2 decimal places
    const roundedGrouped = grouped.map(val => Number(val.toFixed(2)));

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const ctx = document.getElementById("monthlyChart").getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(34, 197, 94, 0.8)");
    gradient.addColorStop(1, "rgba(34, 197, 94, 0.2)");

    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: monthLabels,
        datasets: [{
          label: "Monthly Spend (₹)",
          data: roundedGrouped,
          backgroundColor: gradient,
          borderRadius: 6,
          barThickness: 15,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { display: false } },
          y: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.05)", borderDash: [5, 5] } }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
          delay: (c) => c.dataIndex * 150
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
   YEARLY OVERVIEW CHART
================================ */
async function loadYearlyChart(startDate = "", endDate = "") {
  toggleChartLoading("yearlyChart", true);
  try {
    let query = "";
    if (startDate || endDate) {
      query = `?startDate=${startDate}&endDate=${endDate}`;
    }

    // Fetch both Expenses and Income
    // Assuming GET /income supports date filtering similar to /expenses
    const [expRes, incRes] = await Promise.all([
      apiRequest("/expenses" + query, "GET", null, { skipLoader: true }),
      apiRequest("/income" + query, "GET", null, { skipLoader: true })
    ]);

    const expenses = expRes.data || [];
    const incomes = incRes.data || [];
    const years = new Set();
    const yearlyData = {};

    if (expenses.length === 0 && incomes.length === 0) {
      handleChartDataState("yearlyChart", false);
      if (yearlyChart) yearlyChart.destroy();
      return;
    }
    handleChartDataState("yearlyChart", true);

    // Aggregate Income
    incomes.forEach(inc => {
      const y = new Date(inc.date).getFullYear();
      years.add(y);
      if (!yearlyData[y]) yearlyData[y] = { income: 0, expense: 0 };
      yearlyData[y].income += inc.amount;
    });

    // Aggregate Expenses
    expenses.forEach(exp => {
      const y = new Date(exp.date).getFullYear();
      years.add(y);
      if (!yearlyData[y]) yearlyData[y] = { income: 0, expense: 0 };
      yearlyData[y].expense += exp.amount;
    });

    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const incomeData = sortedYears.map(y => yearlyData[y].income);
    const expenseData = sortedYears.map(y => yearlyData[y].expense);
    const savingsData = sortedYears.map(y => yearlyData[y].income - yearlyData[y].expense);

    const ctx = document.getElementById("yearlyChart").getContext("2d");
    if (yearlyChart) yearlyChart.destroy();

    yearlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedYears,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: chartColors.success,
            borderRadius: 4
          },
          {
            label: 'Expense',
            data: expenseData,
            backgroundColor: chartColors.danger,
            borderRadius: 4
          },
          {
            label: 'Savings',
            data: savingsData,
            backgroundColor: chartColors.info,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#fff' } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { display: false } },
          y: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.1)", borderDash: [5, 5] } }
        }
      }
    });
  } catch (err) {
    console.error("Failed to load yearly chart", err);
  } finally {
    toggleChartLoading("yearlyChart", false);
  }
}

/* ===============================
   DAY OF WEEK CHART
================================ */
async function loadDayOfWeekChart(startDate = "", endDate = "") {
  toggleChartLoading("dayOfWeekChart", true);
  try {
    let url = "/expenses";
    if (startDate || endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    const res = await apiRequest(url, "GET", null, { skipLoader: true });

    if (!res.data || res.data.length === 0) {
      handleChartDataState("dayOfWeekChart", false);
      if (dayOfWeekChart) dayOfWeekChart.destroy();
      return;
    }
    handleChartDataState("dayOfWeekChart", true);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals = new Array(7).fill(0);

    res.data.forEach(e => {
      const d = new Date(e.date).getDay();
      totals[d] += e.amount;
    });

    const ctx = document.getElementById("dayOfWeekChart").getContext("2d");
    if (dayOfWeekChart) dayOfWeekChart.destroy();

    dayOfWeekChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Total Spending',
          data: totals,
          backgroundColor: chartColors.violet,
          borderRadius: 6,
          barThickness: 25
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (c) => ` ₹${c.raw}`
            }
          }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { display: false } },
          y: { ticks: { color: "rgba(255,255,255,0.7)" }, grid: { color: "rgba(255,255,255,0.1)", borderDash: [5, 5] } }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
          delay: (c) => c.dataIndex * 100
        }
      }
    });
  } catch (err) {
    console.error("Failed to load day of week chart", err);
  } finally {
    toggleChartLoading("dayOfWeekChart", false);
  }
}

/* ===============================
   FILTER LOGIC
================================ */
window.filterCharts = function() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  
  if (start && end && new Date(start) > new Date(end)) {
    showToast("Start date cannot be after end date", "error");
    return;
  }

  loadCategoryChart(start, end);
  loadWeeklyTrend(start, end);
  loadYearlyChart(start, end);
  loadDayOfWeekChart(start, end);
};

window.resetFilters = function() {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  loadCategoryChart();
  loadWeeklyTrend();
  loadYearlyChart();
  loadDayOfWeekChart();
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
loadYearlyChart();
loadDayOfWeekChart();
setupCarousel();

// Event Listener for Year Filter
document.getElementById("monthlyChartYear")?.addEventListener("change", () => {
  loadMonthlyHistogram();
});

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

/* ===============================
   BACK TO TOP LOGIC
================================ */
const backToTopBtn = document.getElementById("backToTopBtn");
if (backToTopBtn) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add("show");
    } else {
      backToTopBtn.classList.remove("show");
    }
  });

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
