import { apiRequest } from "./api.js";


/* ===============================
   GLOBAL ELEMENTS
================================ */
const mobileDayScroll = document.getElementById("mobile-day-scroll");
const mobileListContainer = document.getElementById("mobile-transaction-list");
const mobileMonthText = document.getElementById("mobileMonthText");
const mobileMonthSwipe = document.getElementById("mobileMonthSwipe");
const pageMonthTitle = document.getElementById("pageMonthTitle");
const calendarViewMonthTitle = document.getElementById("calendarViewMonthTitle");
const backToTopBtn = document.getElementById("backToTopBtn");
const histogramSort = document.getElementById("histogramSort");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const monthSelectModal = document.getElementById("monthSelectModal");
const modalYearDisplay = document.getElementById("modalYearDisplay");
const modalMonthGrid = document.getElementById("modalMonthGrid");
const monthTxCount = document.getElementById("monthTxCount");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

let currentMonthExpenses = [];
let currentMonthCategories = [];
let dailyChart = null;
let cumulativeChart = null;
let categoryPieChart = null;
let currentSlide = 0;
let modalCurrentYear = new Date().getFullYear();
let currentMonth = "";

/* ===============================
   INIT
================================ */
const now = new Date();
currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

updateMobileMonthText();
loadMonthlyData();
setupCarousel();

/* Resize Listener for Chart Responsiveness */
window.addEventListener("resize", () => {
  const [year, month] = currentMonth.split("-");
  if (currentMonthExpenses && currentMonthExpenses.length > 0) {
    renderDailyChart(currentMonthExpenses, +year, +month);
    renderCumulativeChart(currentMonthExpenses, +year, +month);
  }
});

/* Back to Top Logic */
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

/* Histogram Sort Listener */
if (histogramSort) {
  histogramSort.addEventListener("change", applyHistogramSort);
}

/* Month Navigation Buttons */
if (prevMonthBtn) prevMonthBtn.addEventListener("click", () => changeMonth(-1));
if (nextMonthBtn) nextMonthBtn.addEventListener("click", () => changeMonth(1));

/* Title Click -> Open Modal */
if (pageMonthTitle) {
  pageMonthTitle.addEventListener("click", () => {
    openMonthModal();
  });
}

/* Transaction Count Badge Click -> Scroll to List */
if (monthTxCount) {
  monthTxCount.style.cursor = "pointer";
  monthTxCount.addEventListener("click", () => {
    const isMobile = window.innerWidth <= 768;
    const target = isMobile 
      ? document.querySelector(".mobile-date-view") 
      : document.querySelector(".date-wise");

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

/* Download PDF Listener */
if (downloadPdfBtn) {
  downloadPdfBtn.addEventListener("click", downloadMonthlyReport);
}

/* ===============================
   LOAD MONTHLY DATA
================================ */
async function loadMonthlyData() {
  const [year, month] = currentMonth.split("-");

  const res = await apiRequest(
    `/expenses/summary/monthly?month=${month}&year=${year}`
  );

  const income = res.data.totalIncome || 0;
  const expense = res.data.totalExpense || 0;
  const balance = res.data.balance || 0;

  document.getElementById("monthlyIncome").innerText = `₹${income}`;
  document.getElementById("monthlyExpense").innerText = `₹${expense}`;
  document.getElementById("monthlyBalance").innerText = `₹${balance}`;

  // Calculate Liquid Fill Percentages (Income is baseline)
  const base = income > 0 ? income : (expense > 0 ? expense : 1);
  
  // Visual Fill (Capped at 100%)
  const expenseFill = Math.min((expense / base) * 100, 100);
  const balanceFill = Math.min((balance / base) * 100, 100);

  // Apply Heights
  document.getElementById("fillBudget").style.height = "100%"; // Budget is the limit (full)
  document.getElementById("fillExpense").style.height = `${expenseFill}%`;
  document.getElementById("fillBalance").style.height = `${Math.max(0, balanceFill)}%`;

  // Update Hover Percentages (Uncapped for text)
  document.getElementById("pctIncome").innerText = "100%";
  document.getElementById("pctExpense").innerText = `${((expense / base) * 100).toFixed(1)}%`;
  document.getElementById("pctBalance").innerText = `${((balance / base) * 100).toFixed(1)}%`;

  currentMonthCategories = res.data.categories;
  applyHistogramSort();
  renderCategoryPie(res.data.categories);
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
   SORT LOGIC
================================ */
function applyHistogramSort() {
  if (!currentMonthCategories) return;
  
  const sortType = histogramSort ? histogramSort.value : "high-low";
  let sorted = [...currentMonthCategories];

  if (sortType === "high-low") {
    sorted.sort((a, b) => b.total - a.total);
  } else if (sortType === "low-high") {
    sorted.sort((a, b) => a.total - b.total);
  } else if (sortType === "a-z") {
    sorted.sort((a, b) => a.category.localeCompare(b.category));
  }

  renderExpenseHistogram(sorted);
}

/* ===============================
   CATEGORY PIE CHART (NEW)
================================ */
function renderCategoryPie(categories) {
  const ctx = document.getElementById("categoryPieChart");
  if (!ctx) return;

  if (categoryPieChart) categoryPieChart.destroy();

  if (!categories || categories.length === 0) return;

  const labels = categories.map(c => c.category);
  const data = categories.map(c => c.total);
  
  // Vibrant colors
  const colors = [
    "#7C7CFF", "#22C55E", "#FACC15", "#EF4444", "#38BDF8", "#A78BFA", "#FB923C", "#EC4899"
  ];

  categoryPieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateScale: true,
        animateRotate: true
      },
      plugins: {
        legend: {
          position: "right",
          labels: { color: "#fff", boxWidth: 12, font: { size: 11 } }
        }
      }
    }
  });
}

/* ===============================
   DATE-WISE DATA
================================ */
async function loadDateWiseExpenses(month, year) {
  const res = await apiRequest(`/expenses/month?month=${month}&year=${year}`);
  currentMonthExpenses = res.data;

  // Update Transaction Count with Animation
  if (monthTxCount) {
    monthTxCount.style.transform = "scale(1.2)";
    monthTxCount.innerHTML = `<span>📊</span> ${currentMonthExpenses.length} Txns`;
    setTimeout(() => monthTxCount.style.transform = "scale(1)", 200);
  }

  renderCalendar(+year, +month - 1);
  renderDailyChart(currentMonthExpenses, +year, +month);
  renderCumulativeChart(currentMonthExpenses, +year, +month);
  setupMobileDaySearch();
}

/* ===============================
   MOBILE DAY SEARCH (ONLY ONE INPUT)
================================ */
function setupMobileDaySearch() {
  if (!mobileDayScroll || !mobileListContainer) return;

  mobileDayScroll.innerHTML = "";
  mobileListContainer.innerHTML =
    `<p class="text-muted" style="text-align:center; padding: 20px;">Select a day above to view details</p>`;

  const [year, month] = currentMonth.split("-");
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${month}-${String(d).padStart(2, "0")}`;
    const hasTx = getTransactionsForDate(dateStr).length > 0;

    const bubble = document.createElement("div");
    bubble.className = `day-bubble ${hasTx ? "has-data" : ""}`;
    bubble.dataset.day = d;
    bubble.innerHTML = `
      <span class="day-num">${d}</span>
      <span class="day-dot"></span>
    `;

    bubble.onclick = () => {
      document.querySelectorAll(".day-bubble").forEach(b => b.classList.remove("active"));
      bubble.classList.add("active");
      renderMobileTransactions(dateStr);
      bubble.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };

    mobileDayScroll.appendChild(bubble);
  }
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

  const totalAmount = tx.reduce((sum, t) => sum + Number(t.amount), 0);
  const dateText = new Date(dateStr).toDateString();
  const badgeStyle = "margin-left: 10px; background: rgba(250, 204, 21, 0.15); border: 1px solid rgba(250, 204, 21, 0.3); color: #fef9c3; border-radius: 12px; padding: 4px 10px; font-size: 0.8rem; vertical-align: middle;";
  document.getElementById("selectedDateTitle").innerHTML = `${dateText} <span style="${badgeStyle}">${tx.length} Txns</span> <span style="${badgeStyle}">Total: ₹${totalAmount}</span>`;

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
  const [year, month] = currentMonth.split("-");
  const date = new Date(year, month - 1);
  const text = date.toLocaleString("default", {
      month: "long",
      year: "numeric"
    });

  if (mobileMonthText) mobileMonthText.innerText = text;
  if (pageMonthTitle) pageMonthTitle.innerText = text;
  if (calendarViewMonthTitle) calendarViewMonthTitle.innerText = text;

  // Update Watermark CSS Variable
  document.documentElement.style.setProperty('--watermark-text', `"${text}"`);
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
  const [year, month] = currentMonth.split("-").map(Number);
  
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

  currentMonth = `${newYear}-${newMonth}`;

  updateMobileMonthText();
  loadMonthlyData();
}

/* ===============================
   MONTH SELECTION MODAL
================================ */
function openMonthModal() {
  const [year] = currentMonth.split("-");
  modalCurrentYear = parseInt(year);
  renderMonthModal();
  monthSelectModal.classList.remove("hidden");
}

function renderMonthModal() {
  if (!modalYearDisplay || !modalMonthGrid) return;

  modalYearDisplay.innerText = modalCurrentYear;
  modalMonthGrid.innerHTML = "";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const today = new Date();
  const currentRealYear = today.getFullYear();
  const currentRealMonth = today.getMonth(); // 0-11

  months.forEach((m, index) => {
    const btn = document.createElement("button");
    btn.className = "month-tile";
    btn.innerText = m;

    // Highlight currently selected month in picker
    const [pickerYear, pickerMonth] = currentMonth.split("-");
    if (parseInt(pickerYear) === modalCurrentYear && (parseInt(pickerMonth) - 1) === index) {
      btn.classList.add("selected");
    }

    // Disable future months
    if (modalCurrentYear > currentRealYear || (modalCurrentYear === currentRealYear && index > currentRealMonth)) {
      btn.disabled = true;
    }

    btn.onclick = () => {
      const newMonth = String(index + 1).padStart(2, "0");
      currentMonth = `${modalCurrentYear}-${newMonth}`;
      updateMobileMonthText();
      loadMonthlyData();
      monthSelectModal.classList.add("hidden");
    };

    modalMonthGrid.appendChild(btn);
  });

  // Setup Year Navigation inside Modal
  document.getElementById("modalPrevYear").onclick = () => {
    modalCurrentYear--;
    renderMonthModal();
  };

  document.getElementById("modalNextYear").onclick = () => {
    // Prevent going to future years
    if (modalCurrentYear >= currentRealYear) {
      showToast("Future data not available");
      return;
    }
    modalCurrentYear++;
    renderMonthModal();
  };
}

/* ===============================
   DAILY CHART
================================ */
function renderDailyChart(expenses, year, month) {
  const ctx = document.getElementById("dailyExpenseChart");
  if (!ctx) return;

  // Destroy existing chart to avoid overlaps/errors
  if (dailyChart) {
    dailyChart.destroy();
  }

  // 1. Prepare Data
  const daysInMonth = new Date(year, month, 0).getDate();
  const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const data = new Array(daysInMonth).fill(0);
  const details = Array.from({ length: daysInMonth }, () => []);

  expenses.forEach((e) => {
    const day = new Date(e.date).getDate();
    if (day >= 1 && day <= daysInMonth) {
      data[day - 1] += e.amount;
      const desc = e.description || e.category;
      details[day - 1].push(`${desc}: ₹${e.amount}`);
    }
  });

  // 2. Determine Chart Type & Style
  const isMobile = window.innerWidth <= 768;
  const chartType = isMobile ? "bar" : "line";

  const dataset = {
    label: "Daily Expense",
    data: data,
    borderColor: "#34d399",
    borderWidth: isMobile ? 1 : 2,
    backgroundColor: isMobile ? "rgba(52, 211, 153, 0.7)" : "rgba(52, 211, 153, 0.2)",
  };

  if (isMobile) {
    dataset.borderRadius = 4;
  } else {
    dataset.tension = 0.4;
    dataset.fill = true;
    dataset.pointRadius = 3;
    dataset.pointHoverRadius = 6;
  }

  // 3. Render Chart
  dailyChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [dataset]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart',
        delay: (context) => {
          if (context.type === 'data' && context.mode === 'default') {
            return context.dataIndex * 50; // Delay each point by 50ms
          }
          return 0;
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Total: ₹${context.raw}`,
            afterBody: (context) => {
              return details[context[0].dataIndex];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          ticks: { color: "rgba(255, 255, 255, 0.7)" }
        },
        x: {
          grid: { display: false },
          ticks: { color: "rgba(255, 255, 255, 0.7)" }
        }
      },
      onClick: (e, elements) => {
        if (!elements.length) return;

        const index = elements[0].index;
        const day = labels[index];
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (window.innerWidth <= 768) {
          const bubble = document.querySelector(`.day-bubble[data-day="${day}"]`);
          if (bubble) {
            bubble.click(); // Trigger the click logic defined in setupMobileDaySearch
            document.querySelector(".mobile-date-view").scrollIntoView({ behavior: "smooth" });
          }
        } else {
          const cell = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
          if (cell && !cell.classList.contains("disabled")) {
            selectDate(dateStr, cell);
          }
        }
      }
    }
  });
}

/* ===============================
   CUMULATIVE CHART
================================ */
function renderCumulativeChart(expenses, year, month) {
  const ctx = document.getElementById("cumulativeChart");
  if (!ctx) return;

  if (cumulativeChart) cumulativeChart.destroy();

  const daysInMonth = new Date(year, month, 0).getDate();
  const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // 1. Calculate Daily Totals
  const daily = new Array(daysInMonth).fill(0);
  expenses.forEach(e => {
    const d = new Date(e.date).getDate();
    if (d >= 1 && d <= daysInMonth) daily[d-1] += e.amount;
  });

  // 2. Calculate Cumulative
  const cumulative = [];
  let sum = 0;
  for (let x of daily) {
    sum += x;
    cumulative.push(sum);
  }

  // 3. Adjust for Current Month (Stop line at today/last transaction)
  const now = new Date();
  let chartData = cumulative;

  if (now.getFullYear() === year && now.getMonth() + 1 === month) {
    const today = now.getDate();
    let lastTxDay = 0;
    expenses.forEach(e => {
      const d = new Date(e.date).getDate();
      if (d > lastTxDay) lastTxDay = d;
    });
    const cutoff = Math.max(today, lastTxDay);
    chartData = cumulative.slice(0, cutoff);
  }

  // 4. Render Chart
  cumulativeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cumulative Spending',
        data: chartData,
        borderColor: '#FACC15',
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Total: ₹${context.raw}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.1)" },
          ticks: { color: "rgba(255, 255, 255, 0.7)" }
        },
        x: {
          grid: { display: false },
          ticks: { color: "rgba(255, 255, 255, 0.7)" }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeOutQuart'
      }
    }
  });
}

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

  // Resize Observer: Adjust height if content changes (e.g. data loads)
  const resizeObserver = new ResizeObserver(() => {
    updateHeight();
  });
  slides.forEach(slide => resizeObserver.observe(slide));

  function updateHeight() {
    const activeSlide = slides[currentSlide];
    if (activeSlide && container) {
      container.style.height = activeSlide.offsetHeight + "px";
    }
  }

  function updateCarousel() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    document.querySelectorAll(".dot").forEach((d, i) => {
      d.classList.toggle("active", i === currentSlide);
    });

    slides.forEach((slide, i) => {
      slide.classList.toggle("active-slide", i === currentSlide);
    });

    // Re-render charts to trigger animation when slide becomes active
    const [year, month] = currentMonth.split("-");
    if (currentSlide === 0 && currentMonthExpenses.length > 0) {
      renderDailyChart(currentMonthExpenses, +year, +month);
    } else if (currentSlide === 1 && currentMonthCategories.length > 0) {
      renderCategoryPie(currentMonthCategories);
    } else if (currentSlide === 2 && currentMonthExpenses.length > 0) {
      renderCumulativeChart(currentMonthExpenses, +year, +month);
    }

    updateHeight();
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

  // Initial height set
  updateCarousel();
}

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
      
      // Glassy Red Warning Style
      background: "rgba(220, 38, 38, 0.75)", 
      backdropFilter: "blur(12px)",
      webkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.25)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      
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

  // Update style based on type
  if (type === "success") {
    toast.style.background = "rgba(34, 197, 94, 0.85)";
  } else {
    toast.style.background = "rgba(220, 38, 38, 0.75)";
  }

  // 3. Set text and show
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
   PDF GENERATION – MONTHLY REPORT
================================ */

/**
 * Convert image URL to Base64 for jsPDF
 */
async function toDataURL(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function downloadMonthlyReport() {
  if (!currentMonthExpenses || currentMonthExpenses.length === 0) {
    showToast("No transactions to download");
    return;
  }

  showToast("Downloading report...");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  /* ===============================
     HELPERS
  ================================ */

  const formatAmount = (val) =>
    Number.isInteger(val) ? val : val.toFixed(2);

  /* ===============================
     HEADER / BANNER
  ================================ */

  doc.setFillColor(15, 32, 39);
  doc.rect(0, 0, 210, 40, "F");

  // Logo
  try {
    const logo = await toDataURL("assets/logo1.png");
    doc.addImage(logo, "PNG", 14, 8, 24, 24);
  } catch {}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(34, 197, 94);
  doc.text("DhanRekha", 44, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(255);
  doc.text("Monthly Report", 44, 30);

  const [year, month] = currentMonth.split("-");
  const dateObj = new Date(year, month - 1);
  const monthName = dateObj.toLocaleString("en-IN", { month: "long" });

  doc.setFontSize(16);
  doc.text(`${monthName} ${year}`, 196, 25, { align: "right" });

  /* ===============================
     SUMMARY
  ================================ */

  const incomeText = document.getElementById("monthlyIncome").innerText.replace(/₹/g, "");
  const expenseText = document.getElementById("monthlyExpense").innerText.replace(/₹/g, "");
  const balanceText = document.getElementById("monthlyBalance").innerText.replace(/₹/g, "");

  const balanceValue = parseFloat(balanceText);

  doc.setFontSize(11);
  doc.setTextColor(0);

  doc.text(`Total Income: Rs. ${incomeText}`, 14, 50);
  doc.text(`Total Expense: Rs. ${expenseText}`, 80, 50);

  doc.setTextColor(balanceValue < 0 ? 220 : 22, balanceValue < 0 ? 38 : 163, balanceValue < 0 ? 38 : 74);
  doc.text(`Balance: Rs. ${balanceText}`, 150, 50);
  doc.setTextColor(0);

  /* ===============================
     PREPARED FOR (7)
  ================================ */

  let userName = "User";
  try {
    const userRes = await apiRequest('/auth/me', 'GET', null, { skipLoader: true });
    if (userRes.data && userRes.data.name) {
      userName = userRes.data.name;
    }
  } catch (err) {
    console.warn("Could not fetch user name for PDF report.", err);
  }
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Prepared for: ${userName}`, 14, 56);
  doc.setTextColor(0);

  /* ===============================
     HIGHEST & LOWEST EXPENSE (3)
  ================================ */

  let highest = null;
  let lowest = null;

  currentMonthExpenses.forEach(tx => {
    if (!highest || tx.amount > highest.amount) highest = tx;
    if (!lowest || tx.amount < lowest.amount) lowest = tx;
  });

  doc.setFont("helvetica", "bold");
  doc.text("Spending Highlights", 14, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (highest) {
    doc.text(
      `Highest: ${highest.category} – Rs. ${formatAmount(highest.amount)} (${new Date(highest.date).toLocaleDateString("en-IN")})`,
      14,
      70
    );
  }

  if (lowest) {
    doc.text(
      `Lowest: ${lowest.category} – Rs. ${formatAmount(lowest.amount)} (${new Date(lowest.date).toLocaleDateString("en-IN")})`,
      14,
      76
    );
  }

  /* ===============================
     CATEGORY SUMMARY (8)
  ================================ */

  const categoryTotals = {};
  currentMonthExpenses.forEach(tx => {
    categoryTotals[tx.category] =
      (categoryTotals[tx.category] || 0) + tx.amount;
  });

  const categoryTable = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a) // Sort by amount, descending
    .map(([cat, amt]) => [
      cat, `Rs. ${formatAmount(amt)}`
    ]);

  doc.autoTable({
    startY: 82,
    head: [["Category", "Total"]],
    body: categoryTable,
    theme: "striped",
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    styles: { fontSize: 10 }
  });

  /* ===============================
     TRANSACTIONS TABLE
  ================================ */

  const tableData = currentMonthExpenses.map(tx => [
    new Date(tx.date).toLocaleDateString("en-IN"),
    tx.category,
    tx.description || "-",
    `Rs. ${formatAmount(tx.amount)}`
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [["Date", "Category", "Description", "Amount"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [20, 83, 45], textColor: 255 },
    columnStyles: {
      3: { halign: "right", fontStyle: "bold", textColor: [220, 38, 38] }
    },

    /* ===============================
       PAGE HEADER + FOOTER (6)
    ================================ */

    didDrawPage: data => {
      const h = doc.internal.pageSize.getHeight();
      const w = doc.internal.pageSize.getWidth();



      // Footer
      doc.setFontSize(8);
      doc.text(
        "DhanRekha • Where Your Money Tells a Story",
        w / 2,
        h - 5,
        { align: "center" }
      );

      doc.text(`Page ${data.pageNumber}`, w - 14, h - 10, { align: "right" });
      doc.text(new Date().toLocaleString("en-IN"), 14, h - 10);
    }
  });

  /* ===============================
     SAVE FILE
  ================================ */

  doc.save(`DhanRekha_Monthly_Report_${monthName}_${year}.pdf`);
  showToast("Report downloaded successfully!", "success");
}
