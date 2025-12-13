import { apiRequest } from "./api.js";

/* ===============================
   DARK MODE TOGGLE
================================ */
const darkModeToggle = document.getElementById("darkModeToggle");
const isLightMode = localStorage.getItem("theme") === "light";

if (isLightMode) {
  document.body.classList.add("light-mode");
  if (darkModeToggle) darkModeToggle.innerText = "🌙";
} else {
  if (darkModeToggle) darkModeToggle.innerText = "☀️";
}

window.toggleDarkMode = function () {
  document.body.classList.toggle("light-mode");
  const isLight = document.body.classList.contains("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  const toggleBtn = document.getElementById("darkModeToggle");
  if (toggleBtn) toggleBtn.innerText = isLight ? "🌙" : "☀️";
};

const picker = document.getElementById("monthPicker");
let selectedDate = null;
let currentMonthExpenses = [];

// Inject styles for disabled dates
const style = document.createElement('style');
style.textContent = `
  .calendar-day.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

picker.addEventListener("change", loadMonthlyData);

// default = current month
const now = new Date();
picker.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
loadMonthlyData();

async function loadMonthlyData() {
  const [year, month] = picker.value.split("-");

  const res = await apiRequest(
    `/expenses/summary/monthly?month=${month}&year=${year}`
  );

  document.getElementById("monthlyIncome").innerText =
    `₹${res.data.totalIncome}`;

  document.getElementById("monthlyExpense").innerText =
    `₹${res.data.totalExpense}`;

  document.getElementById("monthlyBalance").innerText =
    `₹${res.data.balance}`;

  renderExpenses(res.data.categories);

  await loadDateWiseExpenses(month, year);
}

function renderExpenses(categories) {
  const list = document.getElementById("monthlyExpenseList");
  list.innerHTML = "";

  categories.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${item.category}</strong><br>
      ₹${item.total} (${item.count} transactions)</span>
    `;
    list.appendChild(li);
  });
}

async function loadDateWiseExpenses(month, year) {
  const res = await apiRequest(
    `/expenses/month?month=${month}&year=${year}`
  );

  currentMonthExpenses = res.data;
  renderCalendar(parseInt(year), parseInt(month) - 1);
}

// Utility functions
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getTransactionsForDate(dateStr) {
  return currentMonthExpenses.filter(exp => {
    const expDate = new Date(exp.date).toISOString().split('T')[0];
    return expDate === dateStr;
  });
}

function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

// Render calendar
function renderCalendar(year, month) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isMobile = window.innerWidth <= 768;
  
  let calendarHTML = '';
  
  if (isMobile) {
    // Mobile: Tab-based layout
    calendarHTML = `
      <div class="mobile-tabs">
        <div class="mobile-tab active" data-tab="calendar">📅 Calendar</div>
        <div class="mobile-tab" data-tab="transactions">📋 Details</div>
      </div>
      
      <div class="mobile-tab-content active" data-content="calendar">
        <div class="calendar-view">
          <div class="calendar-header">${monthNames[month]} ${year}</div>
          <div class="calendar-grid">
            ${dayLabels.map(day => `<div class="calendar-day-label">${day}</div>`).join('')}
    `;
    
    // Add empty cells
    for (let i = 0; i < firstDay; i++) {
      calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const transactions = getTransactionsForDate(dateStr);
      const hasTransactions = transactions.length > 0 ? 'has-transactions' : '';
      
      const cellDate = new Date(year, month, day);
      const disabledClass = cellDate > today ? 'disabled' : '';
      
      calendarHTML += `<div class="calendar-day ${hasTransactions} ${disabledClass}" data-date="${dateStr}">${day}</div>`;
    }
    
    calendarHTML += `
          </div>
        </div>
      </div>
      
      <div class="mobile-tab-content" data-content="transactions">
        <div class="transactions-panel">
          <div class="transactions-header">
            <h4 id="selectedDateTitle">Select a date</h4>
            <p id="selectedDateSubtitle">Tap on a date in calendar to view transactions</p>
          </div>
          <div class="transactions-list" id="transactionsList">
            <div class="empty-state">
              <p>📅</p>
              <p>Select a date from calendar</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Desktop: Side-by-side layout
    calendarHTML = `
      <div class="calendar-view">
        <div class="calendar-header">${monthNames[month]} ${year}</div>
        <div class="calendar-grid">
          ${dayLabels.map(day => `<div class="calendar-day-label">${day}</div>`).join('')}
    `;
    
    // Add empty cells
    for (let i = 0; i < firstDay; i++) {
      calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const transactions = getTransactionsForDate(dateStr);
      const hasTransactions = transactions.length > 0 ? 'has-transactions' : '';

      const cellDate = new Date(year, month, day);
      const disabledClass = cellDate > today ? 'disabled' : '';
      
      calendarHTML += `<div class="calendar-day ${hasTransactions} ${disabledClass}" data-date="${dateStr}">${day}</div>`;
    }
    
    calendarHTML += `
        </div>
      </div>
      <div class="transactions-panel">
        <div class="transactions-header">
          <h4 id="selectedDateTitle">Select a date</h4>
          <p id="selectedDateSubtitle">Click on a date to view transactions</p>
        </div>
        <div class="transactions-list" id="transactionsList">
          <div class="empty-state">
            <p>📅</p>
            <p>Select a date to view transactions</p>
          </div>
        </div>
      </div>
    `;
  }
  
  document.getElementById("dateWiseList").innerHTML = calendarHTML;
  
  // Add click handlers to calendar days
  document.querySelectorAll('.calendar-day:not(.empty)').forEach(dayCell => {
    dayCell.addEventListener('click', () => {
      if (dayCell.classList.contains('disabled')) return;
      const dateStr = dayCell.getAttribute('data-date');
      selectDate(dateStr, dayCell);
    });
  });
  
  // Add mobile tab switching
  if (isMobile) {
    document.querySelectorAll('.mobile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        
        // Switch active tab
        document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Switch active content
        document.querySelectorAll('.mobile-tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.mobile-tab-content[data-content="${tabName}"]`).classList.add('active');
      });
    });
  }
}

// Select date and show transactions
function selectDate(dateStr, dayCell) {
  // Remove previous selection
  document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
  dayCell.classList.add('selected');
  
  selectedDate = dateStr;
  const transactions = getTransactionsForDate(dateStr);
  const date = new Date(dateStr + 'T00:00:00');
  
  document.getElementById('selectedDateTitle').textContent = date.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  document.getElementById('selectedDateSubtitle').textContent = 
    `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} • Total: ${formatCurrency(totalAmount)}`;
  
  const list = document.getElementById('transactionsList');
  
  if (transactions.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>📭</p><p>No transactions on this date</p></div>';
  } else {
    list.innerHTML = transactions.map(t => `
      <div class="transaction-item">
        <div class="transaction-top">
          <span class="transaction-amount expense">-${formatCurrency(t.amount)}</span>
          <span class="transaction-category">${t.category}</span>
        </div>
        <div class="transaction-description">${t.description || 'No description'}</div>
      </div>
    `).join('');
  }
  
  // On mobile, automatically switch to transactions tab
  if (window.innerWidth <= 768) {
    document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.mobile-tab[data-tab="transactions"]').classList.add('active');
    
    document.querySelectorAll('.mobile-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.mobile-tab-content[data-content="transactions"]').classList.add('active');
  }

}

  const header = document.querySelector('.glass-header');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

/* ===============================
   SWIPE GESTURE SUPPORT
================================ */
const calendarContainer = document.getElementById("dateWiseList");
let touchStartX = 0;
let touchEndX = 0;

if (calendarContainer) {
  calendarContainer.addEventListener('touchstart', e => {
    // Only allow swipe on the calendar part
    if (!e.target.closest('.calendar-view')) return;
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  calendarContainer.addEventListener('touchend', e => {
    if (!e.target.closest('.calendar-view')) return;
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
}

function handleSwipe() {
  const threshold = 50; // Minimum distance to trigger swipe
  if (touchEndX < touchStartX - threshold) changeMonth(1); // Swipe Left -> Next Month
  if (touchEndX > touchStartX + threshold) changeMonth(-1); // Swipe Right -> Prev Month
}

function changeMonth(offset) {
  const [year, month] = picker.value.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  picker.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  loadMonthlyData();
}