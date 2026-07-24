// Client Application State
let appState = {
    employees: [],
    departments: [],
    shifts: [],
    stats: {},
    activePage: 'dashboard',
    activeClockUser: null,
    clockTimer: null,
    theme: 'dark',
    currentUser: null
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// Toast Notification Helper
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'danger' || type === 'error') iconName = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// Initialize Application
async function initApp() {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    selectTheme(savedTheme);

    // Initial data fetch
    await fetchDepartments();
    await fetchEmployees();
    await fetchShifts();
    
    // Check if session exists
    checkSession();
    
    // Auto-update clock widget time
    startCurrentTimeTicker();
    
    // Initialize UI controls
    setupMobileSidebar();
    
    // Initialize Page View
    lucide.createIcons();
}

// Check session
function checkSession() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        appState.currentUser = JSON.parse(userStr);
        document.getElementById('login-overlay-page').classList.remove('active');
        applyUserRoleUI();
        if (appState.currentUser.role === 'admin') {
            openPage('dashboard');
        } else {
            openPage('profile');
        }
    } else {
        document.getElementById('login-overlay-page').classList.add('active');
    }
}

// 1. EVENT LISTENERS SETUP
function setupEventListeners() {
    // Login form submit
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Logout button click
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Routing Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const pageId = item.getAttribute('data-page');
            openPage(pageId);
        });
    });

    // Redirect KPI Click to Careers tab
    const kpiCareers = document.querySelector('.kpi-card.green-glow');
    if (kpiCareers) {
        kpiCareers.style.cursor = 'pointer';
        kpiCareers.addEventListener('click', () => {
            if (appState.currentUser && appState.currentUser.role === 'admin') {
                openPage('careers');
            }
        });
    }

    // Theme Toggle Header Button
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        selectTheme(nextTheme);
    });

    // Dropdowns (Notifications & User Settings)
    setupDropdown('notification-btn', 'notification-dropdown');
    setupDropdown('user-menu-btn', 'user-dropdown');

    // Global Search Trigger
    document.getElementById('global-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (appState.currentUser && appState.currentUser.role === 'admin') {
            openPage('employees');
            document.getElementById('employee-search-input').value = query;
            filterEmployees();
        }
    });

    // Employee filters
    document.getElementById('employee-search-input').addEventListener('input', filterEmployees);
    document.getElementById('employee-dept-filter').addEventListener('change', filterEmployees);
    document.getElementById('employee-status-filter').addEventListener('change', filterEmployees);

    // Employee view toggles
    document.getElementById('view-grid-btn').addEventListener('click', () => toggleEmployeeView('grid'));
    document.getElementById('view-list-btn').addEventListener('click', () => toggleEmployeeView('list'));

    // Employee modals
    document.getElementById('btn-open-add-employee-modal').addEventListener('click', () => openEmployeeModal(false));
    document.getElementById('employee-modal-close').addEventListener('click', closeEmployeeModal);
    document.getElementById('employee-modal-cancel').addEventListener('click', closeEmployeeModal);
    document.getElementById('employee-form').addEventListener('submit', saveEmployeeForm);
    document.getElementById('profile-modal-close').addEventListener('click', () => {
        document.getElementById('profile-modal').classList.remove('active');
    });

    // Careers Modal Triggers
    document.getElementById('btn-open-add-career-modal').addEventListener('click', () => openCareerModal(false));
    document.getElementById('career-modal-close').addEventListener('click', closeCareerModal);
    document.getElementById('career-modal-cancel').addEventListener('click', closeCareerModal);
    document.getElementById('career-form').addEventListener('submit', saveCareerForm);

    // Clock Widget simulation selectors & buttons
    document.getElementById('clock-employee-select').addEventListener('change', (e) => {
        const empId = e.target.value;
        if (empId) {
            appState.activeClockUser = appState.employees.find(emp => emp.id == empId);
            updateClockWidgetStatus();
        } else {
            appState.activeClockUser = null;
            resetClockWidget();
        }
    });

    document.getElementById('btn-clock-in').addEventListener('click', clockInActiveUser);
    document.getElementById('btn-clock-out').addEventListener('click', clockOutActiveUser);

    // Attendance View Selector
    document.getElementById('attendance-view-emp-select').addEventListener('change', (e) => {
        const empId = e.target.value;
        if (empId) {
            renderAttendanceCalendar(empId);
        }
    });

    // Leave request submission
    document.getElementById('leave-application-form').addEventListener('submit', submitLeaveForm);

    // Payroll generation
    document.getElementById('payroll-emp-select').addEventListener('change', (e) => {
        populatePayrollMonthsForEmployee(e.target.value);
    });
    document.getElementById('payroll-generation-form').addEventListener('submit', generatePayrollSlip);
    document.getElementById('btn-payroll-back').addEventListener('click', resetPayrollView);

    // Change Password Modal Event Listeners
    const closePwdBtn = document.getElementById('change-password-modal-close');
    if (closePwdBtn) closePwdBtn.addEventListener('click', closeChangePasswordModal);
    const cancelPwdBtn = document.getElementById('change-password-modal-cancel');
    if (cancelPwdBtn) cancelPwdBtn.addEventListener('click', closeChangePasswordModal);
    const pwdForm = document.getElementById('change-password-form');
    if (pwdForm) pwdForm.addEventListener('submit', submitChangePasswordForm);

    // Settings save
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        const orgName = document.getElementById('settings-org-name').value;
        showToast(`Settings saved for ${orgName}!`, 'success');
    });

    // Clear notifications trigger
    document.getElementById('clear-notifications').addEventListener('click', (e) => {
        e.preventDefault();
        const badge = document.querySelector('.notification-badge');
        if (badge) badge.classList.add('hidden');
        document.querySelectorAll('.notification-item').forEach(item => item.classList.remove('unread'));
        showToast('All notifications marked as read.', 'info');
    });
}

// Session handler functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email-input').value.trim();
    const password = document.getElementById('login-password-input').value;
    
    try {
        const response = await fetch('/api/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('currentUser', JSON.stringify(data));
            appState.currentUser = data;
            document.getElementById('login-form').reset();
            document.getElementById('login-overlay-page').classList.remove('active');
            showToast(`Logged in successfully as ${data.name}!`, 'success');
            applyUserRoleUI();
            if (data.role === 'admin') {
                openPage('dashboard');
            } else {
                openPage('profile');
            }
        } else {
            showToast(data.message || 'Login failed. Please verify credentials.', 'danger');
        }
    } catch (err) {
        showToast('Connection to backend failed.', 'danger');
        console.error(err);
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    appState.currentUser = null;
    appState.activeClockUser = null;
    document.getElementById('login-overlay-page').classList.add('active');
    resetClockWidget();
    showToast('Logged out successfully.', 'info');
}

function applyUserRoleUI() {
    const user = appState.currentUser;
    if (!user) return;
    
    // Set avatars and profile menus
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    const avatarFull = document.getElementById('current-user-avatar');
    if (avatarFull) avatarFull.innerText = initials;
    
    const avatarsSmall = document.querySelectorAll('.avatar-small');
    avatarsSmall.forEach(av => av.innerText = initials);
    
    const uName = document.querySelector('.user-name');
    if (uName) uName.innerText = user.name;
    
    const uRole = document.querySelector('.user-role');
    if (uRole) {
        if (user.role === 'admin') {
            uRole.innerText = 'Super Admin';
        } else {
            // Find their actual job title from employee cache
            const empObj = appState.employees.find(e => e.id == user.id);
            uRole.innerText = empObj ? empObj.role : 'Employee';
        }
    }
    
    // Modify Nav links visibility based on roles
    const navEmp = document.getElementById('nav-employees');
    const navPay = document.getElementById('nav-payroll');
    const navProf = document.getElementById('nav-profile');
    const navCar = document.getElementById('nav-careers');
    
    const clockSel = document.querySelector('.employee-select-wrapper');
    const approvalConsole = document.querySelector('.approval-console-card');
    const attViewSel = document.querySelector('.employee-select-card-wrapper');
    
    const kpiGrid = document.querySelector('.kpi-grid');
    const deptChartWrapper = document.getElementById('dashboard-department-chart-wrapper');
    
    if (user.role === 'admin') {
        if (navEmp) navEmp.classList.remove('hidden');
        if (navPay) navPay.classList.remove('hidden');
        if (navCar) navCar.classList.remove('hidden');
        if (navProf) navProf.classList.add('hidden');
        
        // Show simulated employee selects
        if (clockSel) clockSel.classList.remove('hidden');
        if (approvalConsole) approvalConsole.classList.remove('hidden');
        if (attViewSel) attViewSel.classList.remove('hidden');
        
        // Show KPI grid and charts
        if (kpiGrid) kpiGrid.classList.remove('hidden');
        if (deptChartWrapper) deptChartWrapper.classList.remove('hidden');
        
        // Reset simulation selections
        populateEmployeeDropdowns();
    } else {
        if (navEmp) navEmp.classList.add('hidden');
        if (navPay) navPay.classList.add('hidden');
        if (navCar) navCar.classList.add('hidden');
        if (navProf) navProf.classList.remove('hidden');
        
        // Hide simulated employee selects (regular employee cannot masquerade)
        if (clockSel) clockSel.classList.add('hidden');
        if (approvalConsole) approvalConsole.classList.add('hidden');
        if (attViewSel) attViewSel.classList.add('hidden');
        
        // Hide KPI grid and charts
        if (kpiGrid) kpiGrid.classList.add('hidden');
        if (deptChartWrapper) deptChartWrapper.classList.add('hidden');
        
        // Auto-assign active clock and view logs to themselves
        appState.activeClockUser = appState.employees.find(e => e.id == user.id);
        updateClockWidgetStatus();
    }
}


// 2. THEME AND LAYOUT MANAGER
function selectTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    appState.theme = theme;
    
    // Update theme card active status in settings
    document.querySelectorAll('.theme-card').forEach(card => {
        if (card.getAttribute('data-theme-val') === theme) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function openPage(pageId) {
    appState.activePage = pageId;
    
    // Toggle active classes on sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle pages
    document.querySelectorAll('.app-page').forEach(page => {
        if (page.id === `${pageId}-page`) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    // Close mobile menu if active
    document.querySelector('.sidebar').classList.remove('mobile-active');

    // Dynamically update headers & trigger page loaders
    const pageTitles = {
        'dashboard': { title: 'Dashboard', subtitle: "Welcome back, here's your organization overview." },
        'employees': { title: 'Employee Directory', subtitle: 'Manage organization employees, roles and compensations.' },
        'profile': { title: 'My Profile', subtitle: 'View your personal professional profile details.' },
        'leave': { title: 'Leave Management', subtitle: 'Submit, review, and approve employee leave requests.' },
        'attendance': { title: 'Attendance Tracker', subtitle: 'Monitor daily attendance logs and calendar sheets.' },
        'payroll': { title: 'Payroll Portal', subtitle: 'Calculate salaries, allowances, deductions and print payslips.' },
        'careers': { title: 'Careers Manager', subtitle: 'Post job openings, track experience requirements and active recruiting.' },
        'settings': { title: 'Settings', subtitle: 'System-wide preferences, shift schedules, and theme config.' }
    };

    const header = pageTitles[pageId] || { title: 'Smart HR', subtitle: '' };
    document.getElementById('header-title').innerText = header.title;
    document.getElementById('header-subtitle').innerText = header.subtitle;

    // Trigger tab loaders
    if (pageId === 'dashboard') {
        refreshDashboard();
    } else if (pageId === 'employees') {
        renderEmployeeDirectory();
    } else if (pageId === 'profile') {
        renderMyProfilePage();
    } else if (pageId === 'leave') {
        loadLeaveManagement();
    } else if (pageId === 'attendance') {
        loadAttendanceTracking();
    } else if (pageId === 'payroll') {
        loadPayrollPortal();
    } else if (pageId === 'careers') {
        loadCareersManagement();
    }
    
    lucide.createIcons();
}

function setupDropdown(btnId, menuId) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-menu').forEach(m => {
            if (m.id !== menuId) m.classList.remove('active');
        });
        menu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== btn) {
            menu.classList.remove('active');
        }
    });
}

function setupMobileSidebar() {
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('mobile-active');
    });

    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && sidebar.classList.contains('mobile-active')) {
            sidebar.classList.remove('mobile-active');
        }
    });
}

// 3. TOAST MESSAGES
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'danger') iconName = 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
        <button class="toast-close"><i data-lucide="x"></i></button>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Close toast trigger
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto-remove toast after 4s
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4000);
}

// 4. API FETCH UTILITIES
async function fetchDepartments() {
    try {
        const response = await fetch('/api/departments/');
        const data = await response.json();
        appState.departments = data;
        
        // Fill employee modals department dropdown
        const selectEls = ['employee-dept-filter', 'form-dept-select', 'form-career-dept'];
        selectEls.forEach(elId => {
            const el = document.getElementById(elId);
            if (el) {
                // Clear except first option
                while (el.options.length > 1) el.remove(1);
                appState.departments.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = d.name;
                    el.appendChild(opt);
                });
            }
        });
    } catch (e) {
        console.error('Failed to load departments:', e);
    }
}

async function fetchEmployees() {
    try {
        const response = await fetch('/api/employees/');
        const data = await response.json();
        appState.employees = data;
        populateEmployeeDropdowns();
    } catch (e) {
        showToast('Failed to connect to Django API', 'danger');
        console.error('Failed to load employees:', e);
    }
}

async function fetchShifts() {
    try {
        const response = await fetch('/api/shifts/');
        const data = await response.json();
        if (data.status === 'success') {
            appState.shifts = data.shifts;
            populateShiftDropdowns();
        }
    } catch (err) {
        console.error('Error fetching shifts:', err);
    }
}

function populateShiftDropdowns() {
    const select = document.getElementById('form-emp-shift');
    if (!select) return;
    select.innerHTML = '<option value="">-- Choose Shift --</option>';
    appState.shifts.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.innerText = `${s.name} (${s.start_time} - ${s.end_time})`;
        select.appendChild(opt);
    });
}

function populateEmployeeDropdowns() {
    const dropdowns = ['clock-employee-select', 'leave-emp-select', 'attendance-view-emp-select', 'payroll-emp-select'];
    dropdowns.forEach(dropdownId => {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        
        const currentValue = dropdown.value;
        // Keep first option
        dropdown.innerHTML = dropdown.options[0] ? dropdown.options[0].outerHTML : '<option value="">-- Choose Employee --</option>';
        
        appState.employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = `${emp.first_name} ${emp.last_name} (${emp.employee_id})`;
            dropdown.appendChild(opt);
        });
        
        dropdown.value = currentValue;
    });
}

// 5. DASHBOARD UTILITIES & CHARTS
async function refreshDashboard() {
    try {
        let url = '/api/stats/';
        if (appState.currentUser && appState.currentUser.role === 'employee') {
            url += `?employee_id=${appState.currentUser.id}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        appState.stats = data;
        
        // Update stats DOM
        document.getElementById('kpi-total-employees').innerText = data.total_employees;
        document.getElementById('kpi-attendance-today').innerText = `${data.present_today} / ${data.active_employees}`;
        document.getElementById('kpi-leaves-today').innerText = data.leaves_today;
        document.getElementById('kpi-pending-leaves-desc').innerText = `${data.pending_leaves} pending request(s)`;
        document.getElementById('kpi-careers-open').innerText = data.open_positions;
        
        // Render logs table, donut chart, activity feed, and notifications
        renderDashboardAttendanceLogs(data.attendance_logs);
        renderDepartmentDistributionChart(data.departments);
        renderActivityFeed(data.activities);
        renderNotifications(data.notifications);
        
    } catch (e) {
        console.error('Failed to refresh dashboard statistics:', e);
    }
}

function renderAttendanceTrendChart(trendData) {
    if (!trendData || trendData.length === 0) return;
    const chart = document.getElementById('attendance-line-chart');
    const pathLine = document.getElementById('chart-path-line');
    const pathArea = document.getElementById('chart-path-area');
    const xLabelsContainer = document.getElementById('chart-x-labels');
    const pointsContainer = document.getElementById('chart-data-points');
    
    // Width = 600, Height = 220, Grid start Y = 25, Grid end Y = 165
    // X span = 60 to 570
    const startX = 60;
    const endX = 570;
    const widthX = endX - startX;
    const startY = 165; // 0%
    const endY = 25;    // 100%
    const heightY = startY - endY;
    
    xLabelsContainer.innerHTML = '';
    pointsContainer.innerHTML = '';
    
    let pathD = '';
    let areaD = '';
    
    const stepX = widthX / (trendData.length - 1);
    
    trendData.forEach((day, index) => {
        const x = startX + (index * stepX);
        // Normalize rate between 0% and 100%
        const rate = day.rate;
        const y = startY - (rate / 100 * heightY);
        
        // Add Path Point
        if (index === 0) {
            pathD += `M ${x} ${y}`;
            areaD += `M ${x} ${startY} L ${x} ${y}`;
        } else {
            pathD += ` L ${x} ${y}`;
            areaD += ` L ${x} ${y}`;
        }
        
        if (index === trendData.length - 1) {
            areaD += ` L ${x} ${startY} Z`;
        }
        
        // Render X labels
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', 195);
        label.setAttribute('class', 'chart-x-text');
        label.textContent = day.date;
        xLabelsContainer.appendChild(label);
        
        // Render dots
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 5);
        circle.setAttribute('class', 'chart-dot');
        
        // SVG tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${day.date}: ${rate}% attendance`;
        circle.appendChild(title);
        pointsContainer.appendChild(circle);
    });
    
    pathLine.setAttribute('d', pathD);
    pathArea.setAttribute('d', areaD);
}

function renderDepartmentDistributionChart(deptData) {
    const segmentsContainer = document.getElementById('donut-segments');
    const legendContainer = document.getElementById('donut-legend');
    
    segmentsContainer.innerHTML = '';
    legendContainer.innerHTML = '';
    
    const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    
    // Total employees count for distribution ratio
    const total = deptData.reduce((acc, d) => acc + d.count, 0);
    
    if (total === 0) {
        // Fallback segment (100% empty state)
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', 18);
        circle.setAttribute('cy', 18);
        circle.setAttribute('r', 15.915);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', 'var(--border-color)');
        circle.setAttribute('stroke-width', 2.5);
        segmentsContainer.appendChild(circle);
        
        legendContainer.innerHTML = '<div class="legend-item"><span class="text-muted">No employees registered yet.</span></div>';
        return;
    }
    
    let accumulatedPercent = 0;
    
    deptData.forEach((dept, index) => {
        const percent = (dept.count / total) * 100;
        const color = colors[index % colors.length];
        
        // Circle formula: R = 15.915 results in Circumference = 100 units
        // Stroke-dasharray = percent, 100 - percent
        // Stroke-dashoffset = 100 - accumulatedPercent + 25 (if starting from top)
        const dashArray = `${percent} ${100 - percent}`;
        const dashOffset = 100 - accumulatedPercent;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        path.setAttribute('cx', 18);
        path.setAttribute('cy', 18);
        path.setAttribute('r', 15.915);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', 3);
        path.setAttribute('stroke-dasharray', dashArray);
        path.setAttribute('stroke-dashoffset', dashOffset);
        path.setAttribute('class', 'donut-segment');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${dept.name}: ${dept.count} employee(s) (${Math.round(percent)}%)`;
        path.appendChild(title);
        
        segmentsContainer.appendChild(path);
        
        // Add legend item
        const legItem = document.createElement('div');
        legItem.className = 'legend-item';
        legItem.innerHTML = `
            <span class="legend-color" style="background-color: ${color}"></span>
            <span><strong>${dept.name}</strong> (${dept.count})</span>
        `;
        legendContainer.appendChild(legItem);
        
        accumulatedPercent += percent;
    });
}

function renderActivityFeed(activities) {
    const list = document.getElementById('activity-feed-list');
    list.innerHTML = '';
    
    if (!activities || activities.length === 0) {
        list.innerHTML = '<li class="loading-state">No recent activities found.</li>';
        return;
    }
    
    activities.forEach(act => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="time">${act.time}</span>
            <p>${act.message}</p>
        `;
        list.appendChild(li);
    });
}

// 6. CLOCK IN/OUT TRACKER LOGIC
function startCurrentTimeTicker() {
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
        
        const timeWidget = document.getElementById('widget-current-time');
        const dateWidget = document.getElementById('widget-current-date');
        
        if (timeWidget) timeWidget.innerText = timeStr;
        if (dateWidget) dateWidget.innerText = dateStr;
        
        // Update live clock-in elapsed duration if running
        updateElapsedClockTimer();
    }, 1000);
}

async function updateClockWidgetStatus() {
    if (!appState.activeClockUser) return;
    
    // Check local database/logs to see if they clocked in today
    try {
        const response = await fetch(`/api/attendance/?employee_id=${appState.activeClockUser.id}`);
        const records = await response.json();
        
        const todayStr = new Date().toISOString().split('T')[0];
        const userCode = appState.activeClockUser.employee_id;
        
        const todayRecord = records.find(r => r.employee_code === userCode && r.date === todayStr);
        
        const banner = document.getElementById('clock-status-banner');
        const bannerText = document.getElementById('clock-status-text');
        const btnIn = document.getElementById('btn-clock-in');
        const btnOut = document.getElementById('btn-clock-out');
        const timerEl = document.getElementById('elapsed-timer');
        
        if (todayRecord) {
            banner.className = "clock-status-banner online";
            bannerText.innerText = `Clocked In today at ${todayRecord.clock_in} (${todayRecord.status})`;
            
            if (todayRecord.clock_out && todayRecord.clock_out !== 'Active') {
                banner.className = "clock-status-banner offline";
                bannerText.innerText = `Clocked Out at ${todayRecord.clock_out}`;
                btnIn.classList.add('hidden');
                btnOut.classList.add('hidden');
                timerEl.classList.add('hidden');
            } else {
                // Currently clocked in
                btnIn.classList.add('hidden');
                btnOut.classList.remove('hidden');
                
                // Show elapsed timer
                timerEl.classList.remove('hidden');
                // Store checkin time in state for ticker
                appState.activeClockUser.clock_in_time = todayRecord.clock_in;
            }
        } else {
            resetClockWidgetButtons();
        }
    } catch (e) {
        console.error('Failed to sync clock status:', e);
    }
}

function resetClockWidget() {
    resetClockWidgetButtons();
    document.getElementById('clock-employee-select').value = '';
}

function resetClockWidgetButtons() {
    const banner = document.getElementById('clock-status-banner');
    const bannerText = document.getElementById('clock-status-text');
    const btnIn = document.getElementById('btn-clock-in');
    const btnOut = document.getElementById('btn-clock-out');
    const timerEl = document.getElementById('elapsed-timer');
    
    banner.className = "clock-status-banner offline";
    bannerText.innerText = "Not Clocked In Today";
    btnIn.classList.remove('hidden');
    btnOut.classList.add('hidden');
    timerEl.classList.add('hidden');
}

function updateElapsedClockTimer() {
    if (!appState.activeClockUser || !appState.activeClockUser.clock_in_time || appState.activePage !== 'dashboard') return;
    
    const [h, m, s] = appState.activeClockUser.clock_in_time.split(':').map(Number);
    const checkin = new Date();
    checkin.setHours(h, m, s);
    
    const diff = new Date() - checkin;
    if (diff < 0) return; // boundary safety
    
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    
    const pad = (num) => String(num).padStart(2, '0');
    document.getElementById('elapsed-time-val').innerText = `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
}

async function clockInActiveUser() {
    if (!appState.activeClockUser) {
        showToast('Please select a simulation employee first!', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/attendance/clock/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: appState.activeClockUser.id,
                action: 'clock_in'
            })
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(`${appState.activeClockUser.first_name} clocked in successfully as ${data.attendance_status}!`, 'success');
            await updateClockWidgetStatus();
            await refreshDashboard();
        } else {
            showToast(data.message, 'danger');
        }
    } catch (e) {
        showToast('API connection error', 'danger');
    }
}

async function clockOutActiveUser() {
    if (!appState.activeClockUser) return;
    
    try {
        const response = await fetch('/api/attendance/clock/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: appState.activeClockUser.id,
                action: 'clock_out'
            })
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(`${appState.activeClockUser.first_name} clocked out successfully!`, 'success');
            await updateClockWidgetStatus();
            await refreshDashboard();
        } else {
            showToast(data.message, 'danger');
        }
    } catch (e) {
        showToast('API connection error', 'danger');
    }
}

// 7. EMPLOYEE DIRECTORY RENDERING
let currentViewMode = 'grid'; // grid or list

function toggleEmployeeView(mode) {
    currentViewMode = mode;
    
    const btnGrid = document.getElementById('view-grid-btn');
    const btnList = document.getElementById('view-list-btn');
    const viewGrid = document.getElementById('employee-cards-grid');
    const viewList = document.getElementById('employee-list-table-container');
    
    if (mode === 'grid') {
        btnGrid.classList.add('active');
        btnList.classList.remove('active');
        viewGrid.classList.add('active');
        viewList.classList.remove('active');
    } else {
        btnGrid.classList.remove('active');
        btnList.classList.add('active');
        viewGrid.classList.remove('active');
        viewList.classList.add('active');
    }
}

function renderEmployeeDirectory(filteredList = null) {
    const list = filteredList || appState.employees;
    
    // Render Grid View
    const gridContainer = document.getElementById('employee-cards-grid');
    gridContainer.innerHTML = '';
    
    // Render List View
    const tableBody = document.getElementById('employee-table-body');
    tableBody.innerHTML = '';
    
    if (list.length === 0) {
        const emptyState = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
            <i data-lucide="users" style="width:48px; height:48px; margin-bottom:12px;"></i>
            <p>No matching employees found matching the filters.</p>
        </div>`;
        gridContainer.innerHTML = emptyState;
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted)">No matching records.</td></tr>';
        lucide.createIcons();
        return;
    }
    
    list.forEach(emp => {
        const initials = `${emp.first_name[0] || ''}${emp.last_name[0] || ''}`.toUpperCase();
        
        // 1. Grid card
        const card = document.createElement('div');
        card.className = 'emp-card';
        card.innerHTML = `
            <div class="emp-card-header">
                <span class="status-badge ${emp.status.toLowerCase().replace(' ', '-')}">${emp.status}</span>
            </div>
            <div class="emp-card-avatar">${initials}</div>
            <h4 class="emp-card-name">${emp.first_name} ${emp.last_name}</h4>
            <p class="emp-card-role">${emp.role}</p>
            <div class="emp-card-dept">${emp.department_name}</div>
            
            <div class="emp-card-details">
                <div class="detail-item">
                    <span>ID Code</span>
                    <span>${emp.employee_id}</span>
                </div>
                <div class="detail-item">
                    <span>Joined</span>
                    <span>${emp.date_joined.split('-')[0]}</span>
                </div>
            </div>
            
            <div style="display:flex; justify-content:center; gap:8px;">
                <button class="btn btn-secondary btn-small" onclick="viewEmployeeProfile(${emp.id})">
                    <i data-lucide="eye" style="width:14px; height:14px;"></i> Profile
                </button>
                <button class="btn btn-secondary btn-small" onclick="openEmployeeModal(true, ${emp.id})" title="Edit Info">
                    <i data-lucide="edit-3" style="width:14px; height:14px;"></i> Edit
                </button>
            </div>
        `;
        gridContainer.appendChild(card);
        
        // 2. Table Row
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${emp.employee_id}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar" style="width:30px; height:30px; font-size:0.75rem; box-shadow:none;">${initials}</div>
                    <div>
                        <div style="font-weight:600;">${emp.first_name} ${emp.last_name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${emp.email}</div>
                    </div>
                </div>
            </td>
            <td>${emp.department_name}</td>
            <td>${emp.role}</td>
            <td>₹${parseFloat(emp.salary).toLocaleString()}</td>
            <td>${emp.date_joined}</td>
            <td><span class="status-badge ${emp.status.toLowerCase().replace(' ', '-')}">${emp.status}</span></td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="table-action-btn" onclick="viewEmployeeProfile(${emp.id})" title="View Details"><i data-lucide="eye"></i></button>
                    <button class="table-action-btn" onclick="openEmployeeModal(true, ${emp.id})" title="Edit Employee"><i data-lucide="edit-2"></i></button>
                    <button class="table-action-btn" onclick="deleteEmployee(${emp.id})" title="Delete Employee" style="hover:color:var(--danger-color)"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    
    lucide.createIcons();
}

function filterEmployees() {
    const q = document.getElementById('employee-search-input').value.toLowerCase().trim();
    const dept = document.getElementById('employee-dept-filter').value;
    const status = document.getElementById('employee-status-filter').value;
    
    let list = appState.employees;
    
    if (q) {
        list = list.filter(emp => {
            const fname = (emp.first_name || '').toLowerCase();
            const lname = (emp.last_name || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const empCode = (emp.employee_id || '').toLowerCase();
            const role = (emp.role || '').toLowerCase();
            return fname.includes(q) || lname.includes(q) || email.includes(q) || empCode.includes(q) || role.includes(q);
        });
    }
    
    if (dept) {
        list = list.filter(emp => emp.department_id == dept);
    }
    
    if (status) {
        list = list.filter(emp => emp.status === status);
    }
    
    renderEmployeeDirectory(list);
}

// Add/Edit Modals
async function openEmployeeModal(isEdit = false, empId = null) {
    const modal = document.getElementById('employee-modal');
    const title = document.getElementById('employee-modal-title');
    const form = document.getElementById('employee-form');
    
    form.reset();
    document.getElementById('form-emp-id-db').value = '';
    
    if (isEdit && empId) {
        title.innerText = 'Edit Employee Profile';
        const emp = appState.employees.find(e => e.id == empId);
        
        document.getElementById('form-emp-id-db').value = emp.id;
        document.getElementById('form-emp-code').value = emp.employee_id;
        document.getElementById('form-emp-code').disabled = true; // Code stays unique
        document.getElementById('form-emp-status').value = emp.status;
        document.getElementById('form-first-name').value = emp.first_name;
        document.getElementById('form-last-name').value = emp.last_name;
        document.getElementById('form-email').value = emp.email;
        document.getElementById('form-phone').value = emp.phone;
        document.getElementById('form-dept-select').value = emp.department_id || '';
        document.getElementById('form-role').value = emp.role;
        document.getElementById('form-salary').value = emp.salary;
        document.getElementById('form-joined').value = emp.date_joined;
        document.getElementById('form-bio').value = emp.bio || '';
        document.getElementById('form-emp-password').value = emp.password || '';
        document.getElementById('form-emp-shift').value = emp.shift_id || '';
    } else {
        title.innerText = 'Add New Employee';
        document.getElementById('form-emp-code').value = '';
        document.getElementById('form-emp-code').disabled = false;
        await fetchNextEmployeeId();
        document.getElementById('form-joined').value = new Date().toISOString().split('T')[0];
        document.getElementById('form-emp-password').value = '';
        document.getElementById('form-emp-shift').value = '';
    }
    
    modal.classList.add('active');
}

function closeEmployeeModal() {
    document.getElementById('employee-modal').classList.remove('active');
}

async function saveEmployeeForm(e) {
    e.preventDefault();
    
    const dbId = document.getElementById('form-emp-id-db').value;
    const isEdit = dbId !== '';
    
    const payload = {
        employee_id: document.getElementById('form-emp-code').value.trim(),
        first_name: document.getElementById('form-first-name').value.trim(),
        last_name: document.getElementById('form-last-name').value.trim(),
        email: document.getElementById('form-email').value.trim(),
        phone: document.getElementById('form-phone').value.trim(),
        department_id: document.getElementById('form-dept-select').value,
        role: document.getElementById('form-role').value.trim(),
        salary: parseFloat(document.getElementById('form-salary').value),
        date_joined: document.getElementById('form-joined').value,
        status: document.getElementById('form-emp-status').value,
        bio: document.getElementById('form-bio').value.trim(),
        password: document.getElementById('form-emp-password').value.trim(),
        shift_id: document.getElementById('form-emp-shift').value
    };
    
    const url = isEdit ? `/api/employees/${dbId}/` : '/api/employees/';
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(isEdit ? 'Employee profile updated!' : 'New employee registered successfully!', 'success');
            closeEmployeeModal();
            await fetchEmployees();
            renderEmployeeDirectory();
            await refreshDashboard();
        } else {
            showToast(data.message || 'Error occurred while saving.', 'danger');
        }
    } catch (err) {
        showToast('API Connection Error', 'danger');
    }
}

async function deleteEmployee(id) {
    const emp = appState.employees.find(e => e.id == id);
    if (!confirm(`Are you absolutely sure you want to delete employee ${emp.first_name} ${emp.last_name}?`)) return;
    
    try {
        const response = await fetch(`/api/employees/${id}/`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Employee profile deleted.', 'success');
            await fetchEmployees();
            renderEmployeeDirectory();
            await refreshDashboard();
        }
    } catch (e) {
        showToast('Failed to delete employee profile.', 'danger');
    }
}

async function viewEmployeeProfile(id) {
    try {
        const response = await fetch(`/api/employees/${id}/`);
        if (!response.ok) throw new Error("Failed to fetch profile detail");
        const emp = await response.json();
        
        const initials = `${emp.first_name[0] || ''}${emp.last_name[0] || ''}`.toUpperCase();
        const body = document.getElementById('profile-modal-body');
        
        const stats = emp.leave_stats || { pending: 0, paid_used: 0, sick_used: 0, parental_used: 0, unpaid_used: 0 };
        
        body.innerHTML = `
            <div class="profile-preview-header">
                <div class="profile-avatar-big">${initials}</div>
                <div class="profile-meta-main">
                    <h3>${emp.first_name} ${emp.last_name}</h3>
                    <p class="text-muted" style="font-size:0.95rem; margin-top:2px;">${emp.role} &bull; ${emp.department_name}</p>
                    <span class="status-badge ${emp.status.toLowerCase().replace(' ', '-')}">${emp.status}</span>
                </div>
            </div>
            <div class="profile-grid-details">
                <div class="profile-detail-field">
                    <span>Employee Code</span>
                    <span>${emp.employee_id}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Work Email</span>
                    <span>${emp.email}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Contact Number</span>
                    <span>${emp.phone || 'Not Provided'}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Monthly Basic Salary</span>
                    <span>₹${parseFloat(emp.salary).toLocaleString()}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Date of Joining</span>
                    <span>${emp.date_joined}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Role Tenure</span>
                    <span>${calculateTenure(emp.date_joined)}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Work Shift</span>
                    <span>${emp.shift_name} (${emp.shift_start} - ${emp.shift_end})</span>
                </div>
            </div>
            
            <div class="profile-bio-box">
                <h4 style="font-family:var(--font-heading); margin-bottom:8px; font-size:0.9rem;">Professional Biography / Skills</h4>
                <p>${emp.bio || 'No professional bio added yet.'}</p>
            </div>

            <div class="profile-leave-stats-box" style="margin-top:20px; border-top:1px solid var(--border-color); padding-top:20px;">
                <h4 style="font-family:var(--font-heading); margin-bottom:12px; font-size:0.95rem;">Leave Balances & Usage</h4>
                <div class="profile-grid-details" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
                    <div class="profile-detail-field">
                        <span>Pending Requests</span>
                        <strong>${stats.pending} Request(s)</strong>
                    </div>
                    <div class="profile-detail-field">
                        <span>Paid Leave Used</span>
                        <strong>${stats.paid_used} / 18 Days</strong>
                    </div>
                    <div class="profile-detail-field">
                        <span>Sick Leave Used</span>
                        <strong>${stats.sick_used} / 10 Days</strong>
                    </div>
                    <div class="profile-detail-field">
                        <span>Parental Leave Used</span>
                        <strong>${stats.parental_used} / 12 Days</strong>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('profile-modal').classList.add('active');
    } catch (e) {
        showToast('Failed to load employee details.', 'danger');
    }
}

function calculateTenure(joinedDateStr) {
    const joined = new Date(joinedDateStr);
    const now = new Date();
    const diff = now - joined;
    if (isNaN(diff)) return 'Unknown';
    
    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days} Days`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} Month(s)`;
    
    const yrs = Math.floor(months / 12);
    const remM = months % 12;
    return `${yrs} Year(s), ${remM} Month(s)`;
}

// 8. LEAVE MANAGEMENT TAB
async function loadLeaveManagement() {
    // Refresh employees list
    await fetchEmployees();
    populateEmployeeDropdowns();
    
    // Auto-select and lock leave applicant selector for employees
    const leaveEmpSel = document.getElementById('leave-emp-select');
    if (appState.currentUser && appState.currentUser.role === 'employee') {
        leaveEmpSel.value = appState.currentUser.id;
        leaveEmpSel.disabled = true;
    } else {
        if (leaveEmpSel) leaveEmpSel.disabled = false;
    }

    // Update dynamic leave balance cards for logged-in employees and HR Admin
    const balanceCardsRow = document.getElementById('leave-balance-cards-row');
    if (balanceCardsRow) {
        balanceCardsRow.classList.remove('hidden');
        if (appState.currentUser && appState.currentUser.role === 'employee') {
            document.getElementById('leave-card-label-1').innerText = 'Paid Leave Available';
            document.getElementById('leave-card-label-2').innerText = 'Sick Leave Available';
            document.getElementById('leave-card-label-3').innerText = 'Parental Leave Available';
            document.getElementById('leave-card-icon-1').className = 'card-icon paid';
            document.getElementById('leave-card-icon-1').innerHTML = '<i data-lucide="umbrella"></i>';
            document.getElementById('leave-card-icon-2').className = 'card-icon sick';
            document.getElementById('leave-card-icon-2').innerHTML = '<i data-lucide="thermometer"></i>';
            document.getElementById('leave-card-icon-3').className = 'card-icon parental';
            document.getElementById('leave-card-icon-3').innerHTML = '<i data-lucide="baby"></i>';
            
            try {
                const res = await fetch(`/api/employees/${appState.currentUser.id}/`);
                if (res.ok) {
                    const empDetail = await res.json();
                    const stats = empDetail.leave_stats || { paid_used: 0, sick_used: 0, parental_used: 0 };
                    const paidRem = Math.max(0, 18 - stats.paid_used);
                    const sickRem = Math.max(0, 10 - stats.sick_used);
                    const parRem = Math.max(0, 12 - stats.parental_used);

                    document.getElementById('leave-balance-paid').innerText = `${paidRem} / 18 Days`;
                    document.getElementById('leave-balance-sick').innerText = `${sickRem} / 10 Days`;
                    document.getElementById('leave-balance-parental').innerText = `${parRem} / 12 Days`;

                    const p1 = document.getElementById('leave-progress-1');
                    const p2 = document.getElementById('leave-progress-2');
                    const p3 = document.getElementById('leave-progress-3');
                    if (p1) p1.style.width = `${(paidRem / 18) * 100}%`;
                    if (p2) p2.style.width = `${(sickRem / 10) * 100}%`;
                    if (p3) p3.style.width = `${(parRem / 12) * 100}%`;
                }
            } catch (err) {
                console.error("Failed to load personal leave stats", err);
            }
        } else {
            // Admin View KPI Cards
            document.getElementById('leave-card-label-1').innerText = 'Pending Leave Requests';
            document.getElementById('leave-card-label-2').innerText = 'Employees On Leave Today';
            document.getElementById('leave-card-label-3').innerText = 'Active Workforce';
            document.getElementById('leave-card-icon-1').className = 'card-icon sick';
            document.getElementById('leave-card-icon-1').innerHTML = '<i data-lucide="clock"></i>';
            document.getElementById('leave-card-icon-2').className = 'card-icon parental';
            document.getElementById('leave-card-icon-2').innerHTML = '<i data-lucide="calendar-clock"></i>';
            document.getElementById('leave-card-icon-3').className = 'card-icon paid';
            document.getElementById('leave-card-icon-3').innerHTML = '<i data-lucide="users"></i>';

            try {
                const res = await fetch('/api/stats/');
                if (res.ok) {
                    const stats = await res.json();
                    document.getElementById('leave-balance-paid').innerText = `${stats.pending_leaves} Request(s)`;
                    document.getElementById('leave-balance-sick').innerText = `${stats.leaves_today} Employee(s)`;
                    document.getElementById('leave-balance-parental').innerText = `${stats.active_employees} Active`;

                    const p1 = document.getElementById('leave-progress-1');
                    const p2 = document.getElementById('leave-progress-2');
                    const p3 = document.getElementById('leave-progress-3');
                    if (p1) p1.style.width = `${Math.min(100, stats.pending_leaves * 25)}%`;
                    if (p2) p2.style.width = `${Math.min(100, (stats.leaves_today / (stats.total_employees || 1)) * 100)}%`;
                    if (p3) p3.style.width = `${Math.min(100, (stats.active_employees / (stats.total_employees || 1)) * 100)}%`;
                }
            } catch (err) {
                console.error("Failed to load admin leave stats", err);
            }
        }
    }
    
    // Fetch and render leave request history
    try {
        let url = '/api/leave-requests/';
        if (appState.currentUser && appState.currentUser.role === 'employee') {
            url += `?employee_id=${appState.currentUser.id}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        
        const tbody = document.getElementById('leave-history-table-body');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">No leave applications submitted yet.</td></tr>';
            return;
        }
        
        data.forEach(l => {
            let actions = '';
            if (l.status === 'Pending') {
                actions = `
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-primary btn-small" onclick="handleLeaveAction(${l.id}, 'Approved')" style="padding:4px 8px; font-size:0.72rem;">Approve</button>
                        <button class="btn btn-danger btn-small" onclick="handleLeaveAction(${l.id}, 'Rejected')" style="padding:4px 8px; font-size:0.72rem;">Reject</button>
                    </div>
                `;
            } else {
                actions = `<span style="font-size:0.78rem; color:var(--text-muted)">Archived</span>`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600;">${l.employee_name}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted)">${l.employee_code}</div>
                </td>
                <td><strong>${l.leave_type}</strong></td>
                <td>
                    <div style="font-weight:500;">${l.start_date} to ${l.end_date}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted)">${calculateDaysBetween(l.start_date, l.end_date)} day(s)</div>
                </td>
                <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${l.reason}">${l.reason}</td>
                <td><span class="status-badge ${l.status.toLowerCase()}">${l.status}</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (e) {
        console.error('Failed to load leave history:', e);
    }
}

function calculateDaysBetween(d1, d2) {
    const start = new Date(d1);
    const end = new Date(d2);
    const diff = end - start;
    if (diff < 0) return 0;
    return Math.floor(diff / 86400000) + 1;
}

async function submitLeaveForm(e) {
    e.preventDefault();
    
    const payload = {
        employee_id: document.getElementById('leave-emp-select').value,
        leave_type: document.getElementById('leave-type-select').value,
        start_date: document.getElementById('leave-start-date').value,
        end_date: document.getElementById('leave-end-date').value,
        reason: document.getElementById('leave-reason').value.trim()
    };
    
    if (new Date(payload.start_date) > new Date(payload.end_date)) {
        showToast('Start date cannot be after end date.', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/leave-requests/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('Leave request submitted successfully!', 'success');
            document.getElementById('leave-application-form').reset();
            await loadLeaveManagement();
            await refreshDashboard();
        } else {
            const data = await response.json();
            showToast(data.message || 'Submission error', 'danger');
        }
    } catch (err) {
        showToast('API Connection Error', 'danger');
    }
}

async function handleLeaveAction(reqId, status) {
    try {
        const response = await fetch(`/api/leave-requests/${reqId}/action/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status })
        });
        
        if (response.ok) {
            showToast(`Leave request ${status.toLowerCase()}!`, 'success');
            await loadLeaveManagement();
            await refreshDashboard();
            await fetchEmployees(); // reload status
        }
    } catch (e) {
        showToast('Action failed.', 'danger');
    }
}

// 9. ATTENDANCE PAGE & CALENDAR
async function loadAttendanceTracking() {
    await fetchEmployees();
    populateEmployeeDropdowns();
    
    if (appState.currentUser && appState.currentUser.role === 'employee') {
        renderAttendanceCalendar(appState.currentUser.id);
    } else {
        const select = document.getElementById('attendance-view-emp-select');
        if (!select.value && select.options.length > 1) {
            select.value = select.options[1].value;
        }
        if (select.value) {
            renderAttendanceCalendar(select.value);
        }
    }
    
    // Load daily organization log
    loadDailyOrganizationLog();
}

async function loadDailyOrganizationLog() {
    try {
        let url = '/api/attendance/';
        if (appState.currentUser && appState.currentUser.role === 'employee') {
            url += `?employee_id=${appState.currentUser.id}`;
        }
        const response = await fetch(url);
        const records = await response.json();
        
        const tbody = document.getElementById('attendance-logs-table-body');
        tbody.innerHTML = '';
        
        const todayStr = new Date().toISOString().split('T')[0];
        document.getElementById('current-log-date').innerText = todayStr;
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">No attendance records found.</td></tr>';
            return;
        }
        
        records.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${r.employee_name}</strong></td>
                <td>${r.employee_code}</td>
                <td>${r.date}</td>
                <td>${r.clock_in}</td>
                <td>${r.clock_out === 'Active' ? '<span class="pulse-ring" style="width:8px; height:8px; display:inline-block; border-radius:50%; background-color:var(--primary-color)"></span> Clocked In' : r.clock_out}</td>
                <td><span class="status-badge ${r.status.toLowerCase().replace(' ', '-')}">${r.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Failed to load organization log:', e);
    }
}

async function renderAttendanceCalendar(empId) {
    try {
        // Fetch all attendance logs
        const response = await fetch('/api/attendance/');
        const records = await response.json();
        
        const emp = appState.employees.find(e => e.id == empId);
        if (!emp) return;
        
        // Filter records for this employee
        const empRecords = records.filter(r => r.employee_code === emp.employee_id);
        
        const calendarGrid = document.getElementById('calendar-days-grid');
        calendarGrid.innerHTML = '';
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        
        // Set Month Title
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        document.getElementById('attendance-month-title').innerText = `${monthNames[month]} ${year}`;
        
        // Days count & start weekday
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        // Render Empty cells for offset
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyCell);
        }
        
        // Render Days of Month
        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Find if employee had record on this date
            const record = empRecords.find(r => r.date === cellDateStr);
            
            let statusDot = '';
            if (record) {
                // Adjust class name spacing for leaves
                const formattedStatus = record.status.replace(' ', '-');
                statusDot = `<span class="calendar-day-status-dot ${formattedStatus}" title="${record.status}: Clock In: ${record.clock_in}"></span>`;
            }
            
            cell.innerHTML = `
                ${statusDot}
                <span>${day}</span>
            `;
            calendarGrid.appendChild(cell);
        }
    } catch (e) {
        console.error('Failed to render attendance calendar:', e);
    }
}

// 10. PAYROLL PORTAL
async function loadPayrollPortal() {
    await fetchEmployees();
    populateEmployeeDropdowns();
    
    // Auto-select and lock selector for employee logins
    const payEmpSel = document.getElementById('payroll-emp-select');
    if (appState.currentUser && appState.currentUser.role === 'employee') {
        payEmpSel.value = appState.currentUser.id;
        payEmpSel.disabled = true;
        populatePayrollMonthsForEmployee(appState.currentUser.id);
    } else {
        if (payEmpSel) {
            payEmpSel.disabled = false;
            payEmpSel.value = '';
        }
        const select = document.getElementById('payroll-month');
        if (select) select.innerHTML = '<option value="">-- Choose Employee First --</option>';
    }
}

function populatePayrollMonthsForEmployee(empId) {
    const select = document.getElementById('payroll-month');
    if (!select) return;
    select.innerHTML = '';
    
    if (!empId) {
        select.innerHTML = '<option value="">-- Choose Employee First --</option>';
        return;
    }
    
    // Find selected employee
    const emp = appState.employees.find(e => e.id == empId);
    if (!emp) {
        select.innerHTML = '<option value="">-- Choose Employee First --</option>';
        return;
    }
    
    // Parse joining date
    const joinDate = new Date(emp.date_joined);
    const joinYear = joinDate.getFullYear();
    const joinMonth = joinDate.getMonth(); // 0-indexed
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const today = new Date();
    
    // Generate months from current month backwards
    let count = 0;
    for (let i = 0; i < 24; i++) { // look up to 2 years back
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthVal = date.getMonth();
        const yearVal = date.getFullYear();
        
        // If the month is before joining date, stop generating options!
        if (yearVal < joinYear || (yearVal === joinYear && monthVal < joinMonth)) {
            break;
        }
        
        const monthName = monthNames[monthVal];
        const val = `${monthName} ${yearVal}`;
        
        const opt = document.createElement('option');
        opt.value = val;
        opt.innerText = val;
        if (count === 0) opt.selected = true;
        select.appendChild(opt);
        count++;
    }
    
    if (count === 0) {
        // Fallback in case of future joining date
        const joinMonthName = monthNames[joinMonth];
        const val = `${joinMonthName} ${joinYear}`;
        select.innerHTML = `<option value="${val}">${val}</option>`;
    }
}

async function generatePayrollSlip(e) {
    e.preventDefault();
    
    const empId = document.getElementById('payroll-emp-select').value;
    if (!empId) return;
    
    const selectedMonth = document.getElementById('payroll-month').value;
    
    try {
        const response = await fetch(`/api/payroll/?employee_id=${empId}&month_year=${encodeURIComponent(selectedMonth)}`);
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('payslip-preview-empty').classList.add('hidden');
            const content = document.getElementById('payslip-content');
            content.classList.remove('hidden');
            
            content.innerHTML = `
                <div class="payslip-org-name">${document.getElementById('settings-org-name').value}</div>
                <div style="text-align:center; font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Official Earnings Statement</div>
                
                <div class="payslip-meta-row">
                    <div>
                        <div class="payslip-meta-item"><span>Employee Name:</span> <strong>${data.employee_name}</strong></div>
                        <div class="payslip-meta-item"><span>Designation / Role:</span> <span>${data.role}</span></div>
                        <div class="payslip-meta-item"><span>Department:</span> <span>${data.department}</span></div>
                    </div>
                    <div style="border-left: 1px solid var(--border-color); padding-left:16px;">
                        <div class="payslip-meta-item"><span>Employee ID:</span> <strong>${data.employee_id}</strong></div>
                        <div class="payslip-meta-item"><span>Pay Statement Month:</span> <span>${data.month_year}</span></div>
                        <div class="payslip-meta-item"><span>Bank Account:</span> <span>SBI ************</span></div>
                    </div>
                </div>
                
                <div class="payslip-details-grid">
                    <div>
                        <h4>Earnings & Allowances</h4>
                        <table class="payslip-table">
                            <tr><td>Basic Salary:</td><td>₹${data.basic_salary.toLocaleString()}</td></tr>
                            <tr><td>House Rent Allowance (12%):</td><td>₹${data.allowances.house_rent.toLocaleString()}</td></tr>
                            <tr><td>Medical Allowance (5%):</td><td>₹${data.allowances.medical.toLocaleString()}</td></tr>
                            <tr><td>Conveyance Allowance (8%):</td><td>₹${data.allowances.conveyance.toLocaleString()}</td></tr>
                            <tr style="border-top:1px solid var(--border-color); font-weight:600;">
                                <td>Gross Earnings (A):</td><td>₹${data.gross_earnings.toLocaleString()}</td></tr>
                        </table>
                    </div>
                    <div>
                        <h4>Deductions & Taxes</h4>
                        <table class="payslip-table">
                            <tr><td>Provident Fund (PF - 12%):</td><td>₹${data.deductions.provident_fund.toLocaleString()}</td></tr>
                            <tr><td>Professional Tax (flat):</td><td>₹${data.deductions.professional_tax.toLocaleString()}</td></tr>
                            <tr><td>Income Tax withholding:</td><td>₹${data.deductions.income_tax.toLocaleString()}</td></tr>
                            <tr style="border-top:1px solid var(--border-color); font-weight:600;">
                                <td>Total Deductions (B):</td><td>₹${data.total_deductions.toLocaleString()}</td></tr>
                        </table>
                    </div>
                </div>
                
                <div class="payslip-footer-row">
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Net Salary Disbursed (A - B)</div>
                        <div class="payslip-net-amount">₹${data.net_pay.toLocaleString()}</div>
                    </div>
                    <div style="text-align:right; font-size:0.75rem; color:var(--text-muted);">
                        <span>Status: <strong>Deposited</strong></span>
                        <div style="margin-top:4px;">Signature: <em>Authorized HR Office</em></div>
                    </div>
                </div>
            `;
            
            // Hide selection panel and expand payslip to full view
            document.querySelector('.selection-card').classList.add('hidden');
            document.querySelector('.payroll-body-layout').style.gridTemplateColumns = '1fr';
            document.getElementById('btn-payroll-back').classList.remove('hidden');
            
            showToast(`Payslip generated for ${data.employee_name}!`, 'success');
        } else {
            showToast(data.message, 'danger');
        }
    } catch (e) {
        showToast('Error generating payslip', 'danger');
    }
}

// Reset full-screen payroll view back to selection panel
function resetPayrollView() {
    document.querySelector('.selection-card').classList.remove('hidden');
    document.querySelector('.payroll-body-layout').style.gridTemplateColumns = '';
    document.getElementById('btn-payroll-back').classList.add('hidden');
    
    // Clear payslip content and reset empty state
    document.getElementById('payslip-content').classList.add('hidden');
    document.getElementById('payslip-preview-empty').classList.remove('hidden');
    document.getElementById('payroll-generation-form').reset();
}

// Render regular employee profile page tab
async function renderMyProfilePage() {
    const user = appState.currentUser;
    if (!user) return;
    
    try {
        const response = await fetch(`/api/employees/${user.id}/`);
        const emp = await response.json();
        
        const container = document.getElementById('my-profile-page-content');
        if (!container) return;
        
        const initials = `${emp.first_name[0] || ''}${emp.last_name[0] || ''}`.toUpperCase();
        
        container.innerHTML = `
            <div class="profile-preview-header">
                <div class="profile-avatar-big">${initials}</div>
                <div class="profile-meta-main">
                    <h3>${emp.first_name} ${emp.last_name}</h3>
                    <p class="text-muted" style="font-size:0.95rem; margin-top:2px;">${emp.role} &bull; ${emp.department_name}</p>
                    <span class="status-badge ${emp.status.toLowerCase().replace(' ', '-')}">${emp.status}</span>
                </div>
            </div>
            <div class="profile-grid-details">
                <div class="profile-detail-field">
                    <span>Employee Code</span>
                    <span>${emp.employee_id}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Work Email</span>
                    <span>${emp.email}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Contact Number</span>
                    <span>${emp.phone || 'Not Provided'}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Monthly Basic Salary</span>
                    <span>₹${parseFloat(emp.salary).toLocaleString()}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Date of Joining</span>
                    <span>${emp.date_joined}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Role Tenure</span>
                    <span>${calculateTenure(emp.date_joined)}</span>
                </div>
                <div class="profile-detail-field">
                    <span>Work Shift</span>
                    <span>${emp.shift_name} (${emp.shift_start} - ${emp.shift_end})</span>
                </div>
            </div>
            <div class="profile-bio-box">
                <h4 style="font-family:var(--font-heading); margin-bottom:8px; font-size:0.9rem;">Professional Biography / Skills</h4>
                <p>${emp.bio || 'No professional bio added yet.'}</p>
            </div>
        `;
    } catch (e) {
        console.error('Failed to load profile details:', e);
    }
}

// Fetch next available unique employee ID from backend
async function fetchNextEmployeeId() {
    try {
        const response = await fetch('/api/employees/next-id/');
        const data = await response.json();
        const input = document.getElementById('form-emp-code');
        if (input) {
            input.value = data.next_id;
        }
    } catch (e) {
        console.error('Failed to fetch next employee ID:', e);
    }
}

// Render dynamic notifications dropdown list
function renderNotifications(notifications) {
    const listContainer = document.querySelector('.dropdown-content');
    const badge = document.querySelector('.notification-badge');
    
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    if (!notifications || notifications.length === 0) {
        listContainer.innerHTML = '<div class="dropdown-empty-state" style="padding:16px; text-align:center; color:var(--text-muted); font-size:0.8rem;">No new notifications.</div>';
        if (badge) {
            badge.innerText = '0';
            badge.classList.add('hidden');
        }
        return;
    }
    
    // Set badge count
    if (badge) {
        badge.innerText = notifications.length;
        badge.classList.remove('hidden');
    }
    
    notifications.forEach(n => {
        const item = document.createElement('div');
        item.className = 'notification-item unread';
        
        let iconHtml = '<i data-lucide="bell"></i>';
        if (n.type === 'leave') {
            iconHtml = '<i data-lucide="calendar"></i>';
        } else if (n.type === 'attendance') {
            iconHtml = '<i data-lucide="clock"></i>';
        }
        
        item.innerHTML = `
            <div class="notif-icon ${n.type || 'info'}">${iconHtml}</div>
            <div class="notif-body">
                <p>${n.message}</p>
                <span>${n.time}</span>
            </div>
        `;
        listContainer.appendChild(item);
    });
    
    lucide.createIcons();
}

// Render dynamic recent check-in/out logs on the dashboard
function renderDashboardAttendanceLogs(logs) {
    const tbody = document.getElementById('dashboard-attendance-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted)">No check-in logs found.</td></tr>';
        return;
    }
    
    logs.forEach(l => {
        const tr = document.createElement('tr');
        let clockOutText = l.clock_out;
        if (l.clock_out === 'Active') {
            clockOutText = '<span class="pulse-ring" style="width:8px; height:8px; display:inline-block; border-radius:50%; background-color:var(--primary-color)"></span> Clocked In';
        }
        
        tr.innerHTML = `
            <td>
                <div style="font-weight:600;">${l.employee_name}</div>
                <div style="font-size:0.72rem; color:var(--text-muted)">${l.employee_code}</div>
            </td>
            <td>${l.date}</td>
            <td><strong>${l.clock_in}</strong></td>
            <td><strong>${clockOutText}</strong></td>
            <td>${l.duration}</td>
            <td><span class="status-badge ${l.status.toLowerCase().replace(' ', '-')}">${l.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- CAREERS MANAGER MODULE ---
async function loadCareersManagement() {
    try {
        const response = await fetch('/api/careers/');
        const data = await response.json();
        appState.careers = data;
        
        // Populate department dropdown inside career modal
        const deptSelect = document.getElementById('form-career-dept');
        if (deptSelect && deptSelect.options.length <= 1) {
            deptSelect.innerHTML = '<option value="">-- Choose Department --</option>';
            appState.departments.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = d.name;
                deptSelect.appendChild(opt);
            });
        }
        
        renderCareersTable(data);
    } catch (e) {
        showToast('Failed to load careers registry.', 'danger');
    }
}

function renderCareersTable(careers) {
    const tbody = document.getElementById('careers-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!careers || careers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted)">No recruitment postings active.</td></tr>';
        return;
    }
    
    careers.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.title}</strong></td>
            <td>${c.department_name}</td>
            <td>${c.experience}</td>
            <td><span class="status-badge ${c.status.toLowerCase()}">${c.status}</span></td>
            <td>
                <button class="table-action-btn" onclick="openCareerModal(true, ${c.id})" title="Edit Opening"><i data-lucide="edit-3"></i></button>
                <button class="table-action-btn" onclick="deleteCareer(${c.id})" title="Delete Posting" style="color:var(--danger-color)"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function openCareerModal(isEdit, careerId) {
    const modal = document.getElementById('career-modal');
    if (!modal) return;
    
    const title = document.getElementById('career-modal-title');
    const form = document.getElementById('career-form');
    form.reset();
    document.getElementById('form-career-id-db').value = '';
    
    if (isEdit && careerId) {
        title.innerText = 'Modify Job Opening';
        const job = appState.careers.find(c => c.id == careerId);
        if (job) {
            document.getElementById('form-career-id-db').value = job.id;
            document.getElementById('form-career-title').value = job.title;
            document.getElementById('form-career-dept').value = job.department_id || '';
            document.getElementById('form-career-exp').value = job.experience;
            document.getElementById('form-career-status').value = job.status;
        }
    } else {
        title.innerText = 'Add Job Opening';
    }
    
    modal.classList.add('active');
}

function closeCareerModal() {
    const modal = document.getElementById('career-modal');
    if (modal) modal.classList.remove('active');
}

async function saveCareerForm(e) {
    e.preventDefault();
    const dbId = document.getElementById('form-career-id-db').value;
    const isEdit = dbId !== '';
    
    const payload = {
        title: document.getElementById('form-career-title').value.trim(),
        department_id: document.getElementById('form-career-dept').value,
        experience: document.getElementById('form-career-exp').value.trim(),
        status: document.getElementById('form-career-status').value
    };
    
    const url = isEdit ? `/api/careers/${dbId}/` : '/api/careers/';
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(isEdit ? 'Position updated successfully!' : 'New job position posted successfully!', 'success');
            closeCareerModal();
            await loadCareersManagement();
            await refreshDashboard();
        } else {
            showToast(data.message || 'Error saving recruitment opening.', 'danger');
        }
    } catch (err) {
        showToast('Connection error to recruitment API.', 'danger');
    }
}

async function deleteCareer(id) {
    if (!confirm('Are you sure you want to delete this job opening?')) return;
    
    try {
        const response = await fetch(`/api/careers/${id}/`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Job opening removed.', 'success');
            await loadCareersManagement();
            await refreshDashboard();
        }
    } catch (e) {
        showToast('Failed to delete job opening.', 'danger');
    }
}

// --- PASSWORD MANAGEMENT MODULE ---
function openChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        document.getElementById('change-password-form').reset();
        modal.classList.add('active');
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.classList.remove('active');
}

async function submitChangePasswordForm(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('change-pwd-old').value;
    const newPassword = document.getElementById('change-pwd-new').value;
    const confirmPassword = document.getElementById('change-pwd-confirm').value;
    
    if (newPassword.length < 4) {
        showToast('New password must be at least 4 characters long.', 'warning');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Confirm password does not match.', 'warning');
        return;
    }
    
    const user = appState.currentUser;
    if (!user) return;
    const targetId = (user.id !== undefined && user.id !== null) ? user.id : 0;
    
    try {
        const response = await fetch(`/api/employees/${targetId}/change-password/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
                is_admin: user.role === 'admin'
            })
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast('Password changed successfully!', 'success');
            closeChangePasswordModal();
        } else {
            showToast(data.message || 'Error updating password.', 'danger');
        }
    } catch (err) {
        showToast('API Connection Error', 'danger');
    }
}

