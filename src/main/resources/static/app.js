// Utility Selectors
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const initials = n => n ? n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() : '??';

const palette = ['blue', 'purple', 'green', 'amber'];

// Global State
let activePortal = 'admin'; // 'admin' or Employee ID (Number)
let activeTab = 'overview'; // active tab name
let employeesList = [];
let leavesList = [];
let searchFilters = { directory: '' };

// Date Formatting Helper
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Currency Formatting Helper
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Work Duration Calculation Helper
function calculateWorkDuration(inStr, outStr) {
  if (!inStr || !outStr) return '—';
  const [inH, inM] = inStr.split(':').map(Number);
  const [outH, outM] = outStr.split(':').map(Number);
  let diffMin = (outH * 60 + outM) - (inH * 60 + inM);
  if (diffMin < 0) diffMin += 24 * 60; // handle overnight shifts
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hrs}h ${mins}m`;
}

// CSV Exporter Helper
function downloadCsv(filename, headers, rows) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${val !== null && val !== undefined ? val : ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ----------------------------------------------------
// Core Initialization & Lifecycle
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLiveClock();
  setupEventListeners();
  loadData(true); // Load data and initialize portal dropdown
});

// Theme Initialization
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const btn = $('#themeToggleBtn');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    if (btn) btn.textContent = '☾';
  } else {
    document.body.classList.remove('dark-theme');
    if (btn) btn.textContent = '☀';
  }
}

// Digital Clock in Employee Portal
function initLiveClock() {
  const updateClock = () => {
    const timeEl = $('#liveTime');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme Toggle Button
  const themeBtn = $('#themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      themeBtn.textContent = isDark ? '☾' : '☀';
    });
  }

  // Portal Selector Change
  $('#portalSelect').addEventListener('change', (e) => {
    switchPortal(e.target.value);
  });

  // Tab Navigation Links
  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link');
    if (navLink) {
      e.preventDefault();
      const tabName = navLink.getAttribute('data-tab');
      switchTab(tabName);
    }
  });

  // Search input in directory
  const searchInput = $('#directorySearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchFilters.directory = e.target.value.toLowerCase().trim();
      renderDirectoryTable();
    });
  }

  // Modals: Add Employee Open
  $('#addEmployeeBtn').addEventListener('click', () => {
    openEmployeeModal();
  });

  // Modals: Close Handlers
  $('#closeEmployeeModalBtn').addEventListener('click', closeEmployeeModal);
  $('#cancelEmployeeModalBtn').addEventListener('click', closeEmployeeModal);
  
  // Modals: Form Submit (Create/Update Employee)
  $('#employeeForm').addEventListener('submit', handleEmployeeFormSubmit);

  // Employee: Clock In Submit
  $('#clockInBtn').addEventListener('click', () => {
    const mode = $('input[name="clockMode"]:checked').value;
    handleClockIn(mode);
  });

  // Employee: Clock Out Submit
  $('#clockOutBtn').addEventListener('click', handleClockOut);

  // Employee Header Quick Actions
  $('#clockInQuickBtn').addEventListener('click', () => {
    handleClockIn('OFFICE');
  });
  $('#clockOutQuickBtn').addEventListener('click', handleClockOut);

  // Employee: Apply Leave Submit
  const leaveForm = $('#applyLeaveForm');
  if (leaveForm) {
    leaveForm.addEventListener('submit', handleApplyLeaveSubmit);
    
    // Set dynamic date picker minimum constraints
    const todayIso = new Date().toISOString().split('T')[0];
    const leaveStartEl = $('#leaveStart');
    const leaveEndEl = $('#leaveEnd');
    if (leaveStartEl && leaveEndEl) {
      leaveStartEl.setAttribute('min', todayIso);
      leaveEndEl.setAttribute('min', todayIso);
      leaveStartEl.addEventListener('change', (e) => {
        leaveEndEl.setAttribute('min', e.target.value);
      });
    }

    const updateLeaveDuration = () => {
      const startVal = $('#leaveStart').value;
      const endVal = $('#leaveEnd').value;
      const wrap = $('#leaveDurationAlertWrap');
      const txt = $('#leaveDurationText');
      const warn = $('#leaveBalanceWarningText');
      
      if (startVal && endVal) {
        const start = new Date(startVal);
        const end = new Date(endVal);
        if (start <= end) {
          // Calculate weekday duration
          let weekdays = 0;
          let cur = new Date(start);
          while (cur <= end) {
            const day = cur.getDay();
            if (day !== 0 && day !== 6) {
              weekdays++;
            }
            cur.setDate(cur.getDate() + 1);
          }

          // Check overlap
          let hasOverlap = false;
          if (activePortal !== 'admin') {
            const targetStartStr = startVal;
            const targetEndStr = endVal;
            hasOverlap = leavesList.some(l => 
              l.employee.id === activePortal && 
              l.status !== 'REJECTED' && 
              (targetStartStr <= l.endDate && targetEndStr >= l.startDate)
            );
          }

          txt.textContent = `Total Working Days: ${weekdays} ${weekdays === 1 ? 'day' : 'days'} (excluding weekends)`;
          wrap.style.display = 'block';
          
          // check balance of active employee
          const emp = employeesList.find(e => e.id === activePortal);
          if (weekdays === 0) {
            warn.textContent = `⚠️ Error: You cannot request leave only on weekends!`;
            warn.style.display = 'block';
            warn.style.color = 'var(--red)';
          } else if (emp && weekdays > emp.leaveBalance) {
            warn.textContent = `⚠️ Warning: Exceeds your available leave balance (${emp.leaveBalance} days)`;
            warn.style.display = 'block';
            warn.style.color = 'var(--red)';
          } else if (hasOverlap) {
            warn.textContent = `⚠️ Warning: Overlaps with an existing leave request in your schedule!`;
            warn.style.display = 'block';
            warn.style.color = 'var(--amber)';
          } else {
            warn.style.display = 'none';
          }
        } else {
          wrap.style.display = 'none';
        }
      } else {
        wrap.style.display = 'none';
      }
    };
    
    $('#leaveStart').addEventListener('change', updateLeaveDuration);
    $('#leaveEnd').addEventListener('change', updateLeaveDuration);
  }

  // Profile: Toggle Salary Blur
  const toggleSalary = $('#toggleSalaryBtn');
  if (toggleSalary) {
    toggleSalary.addEventListener('click', () => {
      const salaryVal = $('#profileSalary');
      if (salaryVal.classList.contains('blurred')) {
        salaryVal.classList.remove('blurred');
        toggleSalary.textContent = 'Hide';
      } else {
        salaryVal.classList.add('blurred');
        toggleSalary.textContent = 'Show';
      }
    });
  }

  // Admin Reports: Export Workforce CSV
  const expDirBtn = $('#exportDirectoryCsvBtn');
  if (expDirBtn) {
    expDirBtn.addEventListener('click', () => {
      const headers = ['Name', 'Email', 'Department', 'Job Title', 'Salary', 'Engagement Score', 'Attrition Risk', 'Status', 'Skills'];
      const rows = employeesList.map(e => [
        e.name, e.email, e.department, e.title, e.annualSalary, e.engagementScore, e.attritionRisk, e.status, e.skills
      ]);
      downloadCsv('Workforce_Directory.csv', headers, rows);
    });
  }

  // Admin Reports: Export Payroll CSV
  const expPayBtn = $('#exportPayrollCsvBtn');
  if (expPayBtn) {
    expPayBtn.addEventListener('click', () => {
      const headers = ['Name', 'Department', 'Job Title', 'Annual Salary'];
      const rows = employeesList.map(e => [
        e.name, e.department, e.title, e.annualSalary
      ]);
      downloadCsv('Payroll_Roster.csv', headers, rows);
    });
  }

  // AI Chat Assistant: Form Submit
  const chatForm = $('#chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }

  // AI Chat Assistant: Suggestion Chips Click
  const suggestionsDiv = $('#chatSuggestions');
  if (suggestionsDiv) {
    suggestionsDiv.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip');
      if (chip) {
        const prompt = chip.textContent;
        $('#chatInput').value = prompt;
        // Trigger submit
        chatForm.dispatchEvent(new Event('submit'));
      }
    });
  }
}

// ----------------------------------------------------
// Data Loading & API Calls
// ----------------------------------------------------
async function loadData(firstTimeLoad = false) {
  try {
    const [employees, leaves] = await Promise.all([
      fetch('/api/v1/employees').then(r => r.json()),
      fetch('/api/v1/leaves').then(r => r.json())
    ]);

    employeesList = employees;
    leavesList = leaves;

    if (firstTimeLoad) {
      populatePortalSelector();
    }

    renderCurrentState();
  } catch (error) {
    console.error('Error fetching data from API:', error);
  }
}

// Populate the Portal Dropdown Selector
function populatePortalSelector() {
  const selector = $('#portalSelect');
  // Clear any existing employee options (keep only the first one, which is Admin)
  while (selector.options.length > 1) {
    selector.remove(1);
  }

  employeesList.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `Employee: ${emp.name}`;
    selector.appendChild(opt);
  });
}

// ----------------------------------------------------
// Portal & Tab Switching
// ----------------------------------------------------
function switchPortal(portalVal) {
  if (portalVal === 'admin') {
    activePortal = 'admin';
    activeTab = 'overview';
    
    // UI toggles
    $('#adminNav').style.display = 'grid';
    $('#employeeNav').style.display = 'none';
    $('#adminPortal').style.display = 'flex';
    $('#employeePortal').style.display = 'none';
    $('#aiAssistantPortal').style.display = 'none';
    
    $('#addEmployeeBtn').style.display = 'block';
    $('#employeeClockBtnWrap').style.display = 'none';
    
    // Update active nav styling
    updateNavLinksState('#adminNav', activeTab);
    
    // Active User Card bottom
    $('#activeUserAvatar').textContent = 'SM';
    $('#activeUserAvatar').className = 'avatar violet';
    $('#activeUserName').textContent = 'Saanvi Menon';
    $('#activeUserRole').textContent = 'HR Administrator';
  } else {
    activePortal = parseInt(portalVal);
    activeTab = 'emp-overview';
    
    // UI Toggles
    $('#adminNav').style.display = 'none';
    $('#employeeNav').style.display = 'grid';
    $('#adminPortal').style.display = 'none';
    $('#employeePortal').style.display = 'flex';
    $('#aiAssistantPortal').style.display = 'none';
    
    $('#addEmployeeBtn').style.display = 'none';
    $('#employeeClockBtnWrap').style.display = 'block';
    
    // Update active nav styling
    updateNavLinksState('#employeeNav', activeTab);
  }

  switchTab(activeTab);
  renderCurrentState();
}

function switchTab(tabName) {
  activeTab = tabName;
  
  // Deactivate all tab-panes
  $$('.tab-pane').forEach(pane => pane.classList.remove('active'));
  
  // Toggles for portals
  if (tabName === 'ai-assistant') {
    $('#adminPortal').style.display = 'none';
    $('#employeePortal').style.display = 'none';
    $('#aiAssistantPortal').style.display = 'flex';
    
    const chatPane = $('#tab-ai-assistant');
    if (chatPane) chatPane.classList.add('active');
  } else {
    $('#aiAssistantPortal').style.display = 'none';
    if (activePortal === 'admin') {
      $('#adminPortal').style.display = 'flex';
    } else {
      $('#employeePortal').style.display = 'flex';
    }
    
    const selectedPane = $(`#tab-${tabName}`);
    if (selectedPane) {
      selectedPane.classList.add('active');
    }
  }

  // Sync nav link highlight
  const navContainerId = activePortal === 'admin' ? '#adminNav' : '#employeeNav';
  updateNavLinksState(navContainerId, tabName);

  renderCurrentState();
}

function updateNavLinksState(navContainerSelector, tabName) {
  $$(`${navContainerSelector} .nav-link`).forEach(link => {
    if (link.getAttribute('data-tab') === tabName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ----------------------------------------------------
// Rendering Logic
// ----------------------------------------------------
function renderCurrentState() {
  if (activePortal === 'admin') {
    renderAdminPortal();
  } else {
    renderEmployeePortal();
  }
}

// RENDER ADMIN PORTAL
async function renderAdminPortal() {
  try {
    // 1. Fetch live metrics from dashboard endpoint
    const dash = await fetch('/api/v1/dashboard').then(r => r.json());
    const attendance = await fetch('/api/v1/attendance/today').then(r => r.json());

    // Update Overview Stats
    $('#totalEmployees').textContent = dash.totalEmployees;
    $('#activeEmployees').textContent = dash.activeEmployees;
    $('#engagementScore').textContent = `${dash.engagementScore}/100`;
    
    const attendanceRate = dash.totalEmployees > 0 
      ? Math.round((attendance.present / dash.totalEmployees) * 100) 
      : 0;
    
    $('#attendanceRate').textContent = `${attendanceRate}%`;
    $('#attendanceRate2').textContent = `${attendanceRate}%`;

    // Today's Attendance Breakdowns
    $('#presentCount').textContent = attendance.present - attendance.remote;
    $('#remoteCount').textContent = attendance.remote;
    $('#leaveCount').textContent = attendance.onLeave;
    
    // Dynamic donut fill based on check-ins
    const totalStaff = dash.totalEmployees || 1;
    const presentOfficePct = Math.round(((attendance.present - attendance.remote) / totalStaff) * 100);
    const remotePct = Math.round((attendance.remote / totalStaff) * 100);
    const leavePct = Math.round((attendance.onLeave / totalStaff) * 100);
    
    const donutEl = $('.donut');
    if (donutEl) {
      donutEl.style.background = `conic-gradient(
        var(--blue) 0% ${presentOfficePct}%, 
        var(--purple) ${presentOfficePct}% ${presentOfficePct + remotePct}%, 
        var(--amber) ${presentOfficePct + remotePct}% ${presentOfficePct + remotePct + leavePct}%,
        var(--line) ${presentOfficePct + remotePct + leavePct}% 100%
      )`;
    }

    // Leave badge count
    const pendingCount = leavesList.filter(l => l.status === 'PENDING').length;
    const leaveBadge = $('#leaveBadge');
    leaveBadge.textContent = pendingCount;
    if (pendingCount > 0) {
      leaveBadge.classList.add('red-badge');
    } else {
      leaveBadge.classList.remove('red-badge');
    }

    // AI Talent Signals
    $('#riskEmployees').innerHTML = dash.riskEmployees.map((emp, i) => `
      <div class="risk-row">
        <div class="avatar ${palette[i % 4]}">${initials(emp.name)}</div>
        <div class="employee">
          <strong>${emp.name}</strong>
          <small>${emp.title} · ${emp.department}</small>
        </div>
        <div style="text-align: right; margin-right: 8px;">
          <span class="risk-pill ${emp.attritionRisk > 20 ? 'high' : (emp.attritionRisk > 10 ? 'moderate' : 'low')}">
            ${emp.attritionRisk > 20 ? 'High' : (emp.attritionRisk > 10 ? 'Moderate' : 'Low')} Risk
          </span>
          <small class="score">${emp.attritionRisk}% attrition risk</small>
        </div>
      </div>
    `).join('') || '<p class="empty-list">No risk notifications.</p>';

    // Prescriptive AI Retention Recommendations
    const highRiskTalent = dash.riskEmployees.filter(e => e.attritionRisk > 15);
    $('#aiRecommendationsList').innerHTML = highRiskTalent.map(emp => `
      <div class="recommendation-card">
        <span class="recommendation-title">Retention Sync: ${emp.name}</span>
        <span class="recommendation-text">Attrition risk is currently <strong>${emp.attritionRisk}%</strong>. Recommend scheduling a 1-on-1 feedback session to review workload and skills alignment.</span>
        <button class="recommendation-action-btn" onclick="openEmployeeModal(${emp.id})">Review Profile Details →</button>
      </div>
    `).join('') || '<p class="empty-list" style="font-size:12px; color:var(--muted); padding:10px 0;">No high attrition risks detected. Workforce stability is optimal.</p>';

    // Pending Leaves review list
    const pendingRequests = leavesList.filter(l => l.status === 'PENDING');
    $('#leaveRequests').innerHTML = pendingRequests.map((l, i) => `
      <div class="leave-row">
        <div class="avatar ${palette[(i + 1) % 4]}">${initials(l.employee.name)}</div>
        <div class="employee">
          <strong>${l.employee.name}</strong>
          <small>${l.type} · ${formatDate(l.startDate)} - ${formatDate(l.endDate)}</small>
          <span style="font-size: 10px; color: var(--blue); font-style: italic; margin-top: 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${l.reason || 'No reason provided'}">Reason: "${l.reason || 'No reason provided'}"</span>
        </div>
        <div class="leave-actions">
          <button class="approve" onclick="handleLeaveStatus(${l.id}, 'MANAGER_APPROVED')" title="Approve">✓</button>
          <button class="reject" onclick="handleLeaveStatus(${l.id}, 'REJECTED')" title="Reject">×</button>
        </div>
      </div>
    `).join('') || '<p class="empty-list">Nothing awaiting review.</p>';

    // Department headcount bars
    const maxVal = Math.max(...Object.values(dash.departmentHeadcount), 1);
    $('#departments').innerHTML = Object.entries(dash.departmentHeadcount).map(([name, count], i) => `
      <div class="dept-row">
        <div><span class="mini ${palette[i % 4]}-dot"></span>${name}</div>
        <b>${count}</b>
        <div class="bar">
          <i class="${palette[i % 4]}" style="width: ${(count / maxVal) * 100}%"></i>
        </div>
      </div>
    `).join('');

    // Render other tabs if currently selected
    if (activeTab === 'people') renderDirectoryTable();
    if (activeTab === 'leaves') renderLeavesTable();
    if (activeTab === 'attendance') renderAttendanceLogsTable();
    if (activeTab === 'payroll') renderPayrollOverview(dash);

  } catch (error) {
    console.error('Error rendering admin overview:', error);
  }
}

// RENDER ADMIN PORTAL -> DIRECTORY TAB
function renderDirectoryTable() {
  const body = $('#directoryTableBody');
  if (!body) return;

  const filtered = employeesList.filter(emp => {
    const term = searchFilters.directory;
    return !term || 
      emp.name.toLowerCase().includes(term) ||
      emp.title.toLowerCase().includes(term) ||
      emp.department.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term);
  });

  body.innerHTML = filtered.map(emp => `
    <tr>
      <td>
        <div class="emp-name-cell">
          <div class="avatar blue">${initials(emp.name)}</div>
          <div class="emp-details">
            <strong>${emp.name}</strong>
            <small>${emp.email}</small>
          </div>
        </div>
      </td>
      <td><strong>${emp.department}</strong></td>
      <td>${emp.title}</td>
      <td><strong>${formatCurrency(emp.annualSalary)}</strong></td>
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-weight:700;">${emp.engagementScore}</span>
          <span style="color:var(--muted); font-size:10px;">/100</span>
        </div>
      </td>
      <td>
        <span class="risk-pill ${emp.attritionRisk > 20 ? 'high' : (emp.attritionRisk > 10 ? 'moderate' : 'low')}">
          ${emp.attritionRisk}%
        </span>
      </td>
      <td>
        <span class="status-pill ${emp.status.toLowerCase()}">${emp.status}</span>
      </td>
      <td>
        <div class="table-actions">
          <button class="action-btn" onclick="openEmployeeModal(${emp.id})" title="Edit Employee">✎</button>
          <button class="action-btn delete" onclick="handleDeleteEmployee(${emp.id})" title="Delete Employee">🗑</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="text-center" style="padding:40px; text-align:center; color:var(--muted);">No matching employee records found.</td></tr>';
}

// RENDER ADMIN PORTAL -> LEAVES LIST TAB
function renderLeavesTable() {
  const body = $('#allLeavesTableBody');
  if (!body) return;

  body.innerHTML = leavesList.map(l => {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return `
      <tr>
        <td>
          <div class="emp-name-cell">
            <div class="avatar purple">${initials(l.employee.name)}</div>
            <div class="emp-details">
              <strong>${l.employee.name}</strong>
              <small>${l.employee.email}</small>
            </div>
          </div>
        </td>
        <td>
          <strong>${l.type}</strong>
          <small style="display:block; color:var(--muted); font-style:italic; font-size:11px; margin-top:2px;" title="${l.reason || ''}">Reason: "${l.reason || 'No reason'}"</small>
        </td>
        <td>${formatDate(l.startDate)}</td>
        <td>${formatDate(l.endDate)}</td>
        <td><strong>${diffDays} ${diffDays === 1 ? 'day' : 'days'}</strong></td>
        <td>
          <span class="status-pill ${l.status.toLowerCase()}">${l.status === 'MANAGER_APPROVED' ? 'Approved' : l.status}</span>
        </td>
        <td>
          ${l.status === 'PENDING' ? `
            <div class="leave-actions">
              <button class="approve" onclick="handleLeaveStatus(${l.id}, 'MANAGER_APPROVED')">Approve</button>
              <button class="reject" onclick="handleLeaveStatus(${l.id}, 'REJECTED')">×</button>
            </div>
          ` : '—'}
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7" style="padding:40px; text-align:center; color:var(--muted);">No leave requests recorded.</td></tr>';
}

// RENDER ADMIN PORTAL -> ATTENDANCE LOGS
function renderAttendanceLogsTable() {
  const body = $('#attendanceLogsTableBody');
  if (!body) return;

  body.innerHTML = employeesList.map(emp => {
    const statusText = emp.checkedIn ? 'Checked In' : 'Checked Out';
    const statusClass = emp.checkedIn ? 'active' : 'inactive';
    const modeText = emp.checkedIn ? (emp.checkInType === 'OFFICE' ? 'Office' : 'Remote') : '—';
    const timeText = emp.checkedIn && emp.checkInTime ? emp.checkInTime.slice(0, 5) : '—';

    return `
      <tr>
        <td>
          <div class="emp-name-cell">
            <div class="avatar blue">${initials(emp.name)}</div>
            <div class="emp-details">
              <strong>${emp.name}</strong>
              <small>${emp.email}</small>
            </div>
          </div>
        </td>
        <td><strong>${emp.department}</strong></td>
        <td>
          <span class="status-pill ${statusClass}">${statusText}</span>
        </td>
        <td><strong>${modeText}</strong></td>
        <td>${timeText}</td>
      </tr>
    `;
  }).join('');
}

// RENDER ADMIN PORTAL -> PAYROLL
function renderPayrollOverview(dash) {
  const cost = dash.annualPayroll || 0;
  const count = employeesList.length;
  const avg = count > 0 ? Math.round(cost / count) : 0;
  const max = employeesList.reduce((maxVal, emp) => Math.max(maxVal, emp.annualSalary || 0), 0);

  $('#payrollAnnualCost').textContent = formatCurrency(cost);
  $('#payrollAvgSalary').textContent = formatCurrency(avg);
  $('#payrollMaxSalary').textContent = formatCurrency(max);

  const body = $('#payrollTableBody');
  if (!body) return;

  body.innerHTML = employeesList.map(emp => `
    <tr>
      <td>
        <div class="emp-name-cell">
          <div class="avatar green">${initials(emp.name)}</div>
          <div class="emp-details">
            <strong>${emp.name}</strong>
            <small>${emp.email}</small>
          </div>
        </div>
      </td>
      <td><strong>${emp.department}</strong></td>
      <td>${emp.title}</td>
      <td><strong>${formatCurrency(emp.annualSalary)}</strong></td>
    </tr>
  `).join('');
}

// RENDER EMPLOYEE PORTAL
async function renderEmployeePortal() {
  try {
    const emp = employeesList.find(e => e.id === activePortal);
    if (!emp) return;

    // Update active user profile bottom left
    $('#activeUserAvatar').textContent = initials(emp.name);
    $('#activeUserAvatar').className = 'avatar blue';
    $('#activeUserName').textContent = emp.name;
    $('#activeUserRole').textContent = `${emp.title} (${emp.department})`;

    // Welcome text
    $('#welcomeGreeting').innerHTML = `Welcome back, ${emp.name.split(' ')[0]} <span>✦</span>`;
    $('#welcomeSubtitle').textContent = `Here's your personal employee portal.`;

    // Dynamic quick actions headers
    if (emp.checkedIn) {
      $('#clockInQuickBtn').style.display = 'none';
      $('#clockOutQuickBtn').style.display = 'block';
    } else {
      $('#clockInQuickBtn').style.display = 'block';
      $('#clockOutQuickBtn').style.display = 'none';
    }

    // Individual Overview KPIs
    $('#empLeaveBalance').textContent = `${emp.leaveBalance} days`;
    $('#empEngagement').textContent = `${emp.engagementScore}/100`;
    $('#empAttritionRisk').textContent = `${emp.attritionRisk}%`;

    // Work Status KPI
    if (emp.checkedIn) {
      $('#empClockStatus').textContent = 'Checked In';
      $('#empClockStatus').parentElement.querySelector('.kpi-icon').className = 'kpi-icon green';
      $('#empClockDetails').textContent = `Active in ${emp.checkInType === 'OFFICE' ? 'Office' : 'Remote'} mode`;
      
      // Clock Box
      $('#clockInSection').style.display = 'none';
      $('#clockOutSection').style.display = 'block';
      $('#clockInTimeSpan').textContent = emp.checkInTime ? emp.checkInTime.slice(0, 5) : '09:00';
      $('#clockModeSpan').textContent = emp.checkInType === 'OFFICE' ? 'Office' : 'Remote';
    } else {
      $('#empClockStatus').textContent = 'Checked Out';
      $('#empClockStatus').parentElement.querySelector('.kpi-icon').className = 'kpi-icon red';
      $('#empClockDetails').textContent = 'Not active today';
      
      // Clock Box
      $('#clockInSection').style.display = 'block';
      $('#clockOutSection').style.display = 'none';
    }

    // Render other tabs depending on selected activeTab
    if (activeTab === 'emp-overview') {
      // My Team list
      const team = employeesList.filter(e => e.department === emp.department && e.id !== emp.id);
      $('#teamMembersList').innerHTML = team.map((member, i) => `
        <div class="risk-row">
          <div class="avatar ${palette[i % 4]}">${initials(member.name)}</div>
          <div class="employee">
            <strong>${member.name}</strong>
            <small>${member.title}</small>
          </div>
          <div>
            <span class="status-pill ${member.checkedIn ? 'active' : 'inactive'}">
              ${member.checkedIn ? (member.checkInType === 'OFFICE' ? 'Office' : 'Remote') : 'Offline'}
            </span>
          </div>
        </div>
      `).join('') || '<p class="empty-list">No other members in your department.</p>';

      // Fetch Attendance History logs
      const attLogs = await fetch(`/api/v1/employees/${emp.id}/attendance`).then(r => r.json());
      const attBody = $('#empClockHistoryBody');
      if (attBody) {
        attBody.innerHTML = attLogs.map(log => {
          const dateStr = formatDate(log.date);
          const inTime = log.checkInTime ? log.checkInTime.slice(0, 5) : '—';
          const outTime = log.checkOutTime ? log.checkOutTime.slice(0, 5) : 'Active';
          const duration = log.checkOutTime ? calculateWorkDuration(log.checkInTime, log.checkOutTime) : '—';
          const mode = log.type === 'OFFICE' ? 'Office' : 'Remote';
          
          return `
            <tr>
              <td><strong>${dateStr}</strong></td>
              <td>${inTime}</td>
              <td><span class="status-pill ${log.checkOutTime ? 'approved' : 'pending'}">${outTime}</span></td>
              <td><strong>${mode}</strong></td>
              <td>${duration}</td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted)">No check-in history logs registered.</td></tr>';
      }
    }

    if (activeTab === 'emp-leaves') {
      // Fetch leaves for this employee
      const personalLeaves = await fetch(`/api/v1/employees/${emp.id}/leaves`).then(r => r.json());
      const body = $('#empLeavesTableBody');
      if (body) {
        body.innerHTML = personalLeaves.map(l => `
          <tr>
            <td>
              <strong>${l.type}</strong>
              <small style="display:block; color:var(--muted); font-style:italic; font-size:11px; margin-top:2px;">Reason: "${l.reason || 'No reason'}"</small>
            </td>
            <td>${formatDate(l.startDate)} - ${formatDate(l.endDate)}</td>
            <td>
              <span class="status-pill ${l.status.toLowerCase()}">${l.status === 'MANAGER_APPROVED' ? 'Approved' : l.status}</span>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--muted);">No leave applications.</td></tr>';
      }
    }

    if (activeTab === 'emp-profile') {
      // Profile Tab
      $('#profileAvatarLarge').textContent = initials(emp.name);
      $('#profileName').textContent = emp.name;
      $('#profileTitle').textContent = `${emp.title} · ${emp.department}`;
      $('#profileEmail').textContent = emp.email;
      $('#profileDepartment').textContent = emp.department;
      $('#profileJoinDate').textContent = formatDate(emp.hireDate);
      $('#profileSalary').textContent = formatCurrency(emp.annualSalary);
      $('#profileBioText').textContent = emp.bio || 'No bio description provided.';
      
      // Skills tags
      const tagsWrap = $('#profileSkillsTags');
      if (tagsWrap) {
        const list = emp.skills ? emp.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
        tagsWrap.innerHTML = list.map(tag => `<span class="skill-tag">${tag}</span>`).join('') || '<span class="detail-value" style="color:var(--muted)">No skills added.</span>';
      }

      // Reset salary visibility toggle to blur
      $('#profileSalary').classList.add('blurred');
      $('#toggleSalaryBtn').textContent = 'Show';
    }

  } catch (error) {
    console.error('Error rendering employee portal:', error);
  }
}

// ----------------------------------------------------
// Handlers: Attendance (Clock In / Clock Out)
// ----------------------------------------------------
async function handleClockIn(mode) {
  if (activePortal === 'admin') return;
  try {
    const res = await fetch(`/api/v1/employees/${activePortal}/clock-in?type=${mode}`, {
      method: 'POST'
    });
    if (res.ok) {
      // Reload details
      await loadData();
    }
  } catch (error) {
    console.error('Clock-in failed:', error);
  }
}

async function handleClockOut() {
  if (activePortal === 'admin') return;
  try {
    const res = await fetch(`/api/v1/employees/${activePortal}/clock-out`, {
      method: 'POST'
    });
    if (res.ok) {
      await loadData();
    }
  } catch (error) {
    console.error('Clock-out failed:', error);
  }
}

// ----------------------------------------------------
// Handlers: Leaves Actions
// ----------------------------------------------------
async function handleLeaveStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/v1/leaves/${id}/status?value=${newStatus}`, {
      method: 'PATCH'
    });
    if (res.ok) {
      await loadData();
    }
  } catch (error) {
    console.error('Failed to update leave status:', error);
  }
}

async function handleApplyLeaveSubmit(e) {
  e.preventDefault();
  if (activePortal === 'admin') return;

  const type = $('#leaveType').value;
  const startDate = $('#leaveStart').value;
  const endDate = $('#leaveEnd').value;
  const reason = $('#leaveReason').value;

  if (new Date(startDate) > new Date(endDate)) {
    alert('Start date cannot be after end date.');
    return;
  }

  // Calculate weekday duration
  const start = new Date(startDate);
  const end = new Date(endDate);
  let weekdays = 0;
  let cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      weekdays++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  if (weekdays === 0) {
    alert('Error: You cannot request leave only on weekends.');
    return;
  }

  // Check balance of active employee
  const emp = employeesList.find(x => x.id === activePortal);
  if (emp && weekdays > emp.leaveBalance) {
    alert(`Error: Insufficient leave balance. You requested ${weekdays} working days, but only have ${emp.leaveBalance} days remaining.`);
    return;
  }

  // Check overlap
  const targetStartStr = startDate;
  const targetEndStr = endDate;
  const hasOverlap = leavesList.some(l => 
    l.employee.id === activePortal && 
    l.status !== 'REJECTED' && 
    (targetStartStr <= l.endDate && targetEndStr >= l.startDate)
  );

  if (hasOverlap) {
    alert('Error: You already have a pending or approved leave request during this date range.');
    return;
  }

  try {
    const res = await fetch(`/api/v1/employees/${activePortal}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, startDate, endDate, reason })
    });

    if (res.ok) {
      // Reset form
      $('#applyLeaveForm').reset();
      $('#leaveDurationAlertWrap').style.display = 'none';
      // Reload and render
      await loadData();
      alert('Leave application submitted successfully for manager review.');
    } else {
      const err = await res.json();
      alert(`Failed: ${err.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Submit leave request failed:', error);
  }
}

// ----------------------------------------------------
// Handlers: Employee CRUD (Add / Edit / Delete)
// ----------------------------------------------------
function openEmployeeModal(empId = null) {
  const modal = $('#employeeModal');
  const title = $('#modalTitle');
  const form = $('#employeeForm');
  
  form.reset();

  if (empId) {
    title.textContent = 'Edit Employee';
    const emp = employeesList.find(e => e.id === empId);
    if (emp) {
      $('#editEmployeeId').value = emp.id;
      $('#empFormName').value = emp.name;
      $('#empFormEmail').value = emp.email;
      $('#empFormDept').value = emp.department;
      $('#empFormTitle').value = emp.title;
      $('#empFormStatus').value = emp.status;
      $('#empFormSalary').value = emp.annualSalary;
      $('#empFormLeave').value = emp.leaveBalance;
      $('#empFormEngagement').value = emp.engagementScore;
      $('#empFormRisk').value = emp.attritionRisk;
      $('#empFormSkills').value = emp.skills || '';
      $('#empFormBio').value = emp.bio || '';
    }
  } else {
    title.textContent = 'Add Employee';
    $('#editEmployeeId').value = '';
    // default seed parameters
    $('#empFormStatus').value = 'ACTIVE';
    $('#empFormSalary').value = '1000000';
    $('#empFormLeave').value = '15';
    $('#empFormEngagement').value = '80';
    $('#empFormRisk').value = '10';
    $('#empFormSkills').value = '';
    $('#empFormBio').value = '';
  }

  modal.classList.add('active');
}

function closeEmployeeModal() {
  $('#employeeModal').classList.remove('active');
}

async function handleEmployeeFormSubmit(e) {
  e.preventDefault();

  const id = $('#editEmployeeId').value;
  const payload = {
    name: $('#empFormName').value,
    email: $('#empFormEmail').value,
    department: $('#empFormDept').value,
    title: $('#empFormTitle').value,
    status: $('#empFormStatus').value,
    annualSalary: parseFloat($('#empFormSalary').value),
    leaveBalance: parseInt($('#empFormLeave').value),
    engagementScore: parseInt($('#empFormEngagement').value),
    attritionRisk: parseInt($('#empFormRisk').value),
    skills: $('#empFormSkills').value,
    bio: $('#empFormBio').value
  };

  try {
    let res;
    if (id) {
      // Update
      res = await fetch(`/api/v1/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Create
      res = await fetch('/api/v1/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeEmployeeModal();
      // Reload data and dropdown options (since there might be new employees or name updates)
      await loadData(true);
    } else {
      const err = await res.json();
      alert(`Error saving employee: ${err.message || 'Verify validation constraints'}`);
    }
  } catch (error) {
    console.error('Error saving employee:', error);
  }
}

async function handleDeleteEmployee(id) {
  if (!confirm('Are you sure you want to delete this employee? This will permanently delete their records.')) {
    return;
  }

  try {
    const res = await fetch(`/api/v1/employees/${id}`, {
      method: 'DELETE'
    });
    if (res.status === 204 || res.ok) {
      await loadData(true);
    } else {
      alert('Failed to delete employee.');
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
  }
}

// ----------------------------------------------------
// Handlers: AI Chatbot Assistant
// ----------------------------------------------------
function appendChatMessage(sender, text) {
  const container = $('#chatMessages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${sender}`;
  msgDiv.innerHTML = `<div class="chat-bubble">${text}</div>`;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function handleChatSubmit(e) {
  e.preventDefault();
  const input = $('#chatInput');
  const text = input.value.trim();
  if (!text) return;

  // Append user message
  appendChatMessage('user', text);
  input.value = '';

  // Append typing bubble
  const container = $('#chatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message bot typing-indicator';
  typingDiv.innerHTML = '<div class="chat-bubble">Thinking...</div>';
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;

  // Simulate delay
  setTimeout(() => {
    // Remove typing indicator
    typingDiv.remove();
    
    // Parse response
    const query = text.toLowerCase();
    let reply = '';

    if (query.includes('remote')) {
      const remotes = employeesList.filter(emp => emp.checkedIn && emp.checkInType === 'REMOTE');
      if (remotes.length > 0) {
        reply = `There is currently ${remotes.length} remote employee active today:\n` +
          remotes.map(e => `• ${e.name} (${e.title} · ${e.department})`).join('\n');
      } else {
        reply = `No employees are currently checked in as Remote today.`;
      }
    } else if (query.includes('payroll') || query.includes('cost') || query.includes('salary')) {
      const totalCost = employeesList.reduce((sum, e) => sum + (e.annualSalary || 0), 0);
      reply = `Our current annual payroll budget is ${formatCurrency(totalCost)} across ${employeesList.length} employees.\n` +
        `The average salary is ${formatCurrency(Math.round(totalCost / (employeesList.length || 1)))}.`;
    } else if (query.includes('leave') || query.includes('pending')) {
      const pendings = leavesList.filter(l => l.status === 'PENDING');
      if (pendings.length > 0) {
        reply = `There are currently ${pendings.length} pending leave requests awaiting approval:\n` +
          pendings.map(l => `• ${l.employee.name} (${l.type}: ${formatDate(l.startDate)} to ${formatDate(l.endDate)} · Reason: "${l.reason || 'No reason'}")`).join('\n');
      } else {
        reply = `Zero pending leave requests! Your inbox is completely clean.`;
      }
    } else if (query.includes('health') || query.includes('satisfaction') || query.includes('summarize')) {
      const avgEng = employeesList.reduce((sum, e) => sum + e.engagementScore, 0) / (employeesList.length || 1);
      const highRisk = employeesList.filter(e => e.attritionRisk > 20);
      reply = `Workforce Health Summary:\n` +
        `• Average Engagement Score: ${Math.round(avgEng)}/100\n` +
        `• High Attrition Risk Profiles: ${highRisk.length} employees needing attention (${highRisk.map(e => e.name).join(', ') || 'None'}).`;
    } else {
      // Check if it's an employee name search
      const found = employeesList.find(e => query.includes(e.name.split(' ')[0].toLowerCase()));
      if (found) {
        reply = `Employee Details for ${found.name}:\n` +
          `• Designation: ${found.title} (${found.department})\n` +
          `• Status: ${found.status} · Checked In: ${found.checkedIn ? `Yes (${found.checkInType} mode at ${found.checkInTime ? found.checkInTime.slice(0,5) : '09:00'})` : 'No (Offline)'}\n` +
          `• Leave Balance: ${found.leaveBalance} days\n` +
          `• Salary: ${formatCurrency(found.annualSalary)}\n` +
          `• Skills: ${found.skills || 'None registered'}\n` +
          `• Attrition Risk: ${found.attritionRisk}% · Engagement Score: ${found.engagementScore}/100\n` +
          `• Bio: "${found.bio || 'No bio registered.'}"`;
      } else {
        // Default help menu
        reply = `I couldn't find a direct query matching "${text}". Try asking me one of the following:\n` +
          `• "Who is remote today?"\n` +
          `• "What is our total payroll cost?"\n` +
          `• "Show pending leave requests"\n` +
          `• "Summarize workforce health"\n` +
          `• Or ask about a specific employee, e.g., "Tell me about Aarav"`;
      }
    }

    appendChatMessage('bot', reply);
  }, 600);
}

// Attach functions to window so inline onclick handlers in table rows work correctly
window.handleLeaveStatus = handleLeaveStatus;
window.openEmployeeModal = openEmployeeModal;
window.handleDeleteEmployee = handleDeleteEmployee;
