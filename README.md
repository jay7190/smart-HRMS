# Smart HR - Intelligent Human Resource Management System (HRMS)

![Smart HR Banner](https://img.shields.io/badge/Smart%20HR-v1.0.0-blue?style=for-the-badge&logo=django)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)
![Django](https://img.shields.io/badge/Django-4.2%2B-green?style=for-the-badge&logo=django)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

**Smart HR** is an enterprise-grade, modern, and responsive Human Resource Management System (HRMS) designed to streamline employee lifecycle management, attendance tracking, leave request workflows, payroll statement generation, and recruitment processes.

---

## 🌟 Key Features

### 1. 📊 Executive Dashboard Analytics
- Real-time KPI summary cards (Total Workforce, Present Today, Pending Leave Requests, Open Roles).
- Interactive Department Distribution analytics chart.
- Quick action shortcuts for employee check-in and leave processing.

### 2. 👥 Employee Management
- Comprehensive employee directory with grid card views.
- Dynamic employee ID auto-generation (`EMP011`+).
- Detailed employee profile drawer including contact info, department, role, salary, and active work shift.
- Role-based permissions (HR Admin vs. Standard Employee).

### 3. 🏖️ Leave Management & Approval Console
- Dynamic leave balance tracking (Paid Leave, Sick Leave, Parental Leave) with animated gradient progress bars.
- Split-screen request submission form & HR Approval console.
- Automated status reversion (employees automatically revert to `Active` once approved leave periods expire).

### 4. ⏱️ Attendance & Shift Tracking
- Daily Check-in / Check-out logging with timestamp recording.
- Multi-shift management (*Regular, Morning, Evening, Night*).
- Monthly attendance grid with color-coded status badges (*Present, Late, Absent*).

### 5. 💳 Payroll Portal & Payslip Generator
- Salary distribution tracking by department.
- Interactive payslip statement generator with printable earnings breakdown.

### 6. 💼 Recruitment & Careers Manager
- Open position job listings with department tags, experience requirements, and status tracking.
- Application submission console for candidate tracking.

### 7. 🎨 Dynamic Themes & Full Mobile Responsiveness
- **5 Enterprise Color Palettes**: Smart HR Sapphire, HROne Coral & Blue, BambooHR Emerald, Royal Violet, and Tech Coral.
- **Responsive Layout**: Touch-optimized drawer menu and mobile tables for seamless access across desktop, laptop, tablet, and mobile devices.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Django Web Framework, SQLite (with automatic MySQL fallback).
- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System with CSS Variables & Glassmorphic UI), JavaScript (ES6+), Lucide Icons.
- **Testing**: Django Test Suite (10 unit & API integration tests).

---

## 🔐 Default Login Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **HR Administrator** | `admin@smarthr.com` | `admin` |
| **Employee** | `tony@starkindustries.com` | `EMP001` |

---

## 🚀 Quick Start & Local Setup Guide

### Prerequisites
Make sure you have **Python 3.9+** and **Git** installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/jay7190/smart-HRMS.git
cd smart-HRMS
```

### 2. Set Up Virtual Environment (Recommended)
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install django
```

### 4. Apply Database Migrations
```bash
python manage.py migrate
```

### 5. Seed Initial Database Records
Populate departments, shifts, demo employees, leave requests, attendance logs, and recruitment jobs:
```bash
python manage.py seed_db
```

### 6. Run Development Server
```bash
python manage.py runserver
```

Open your browser and navigate to: **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**

---

## 🧪 Automated Testing

Run the Django test suite to verify all API endpoints and business logic:
```bash
python manage.py test
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/employees/` | List all employees |
| `POST` | `/api/employees/` | Create a new employee |
| `GET` | `/api/employees/<id>/` | Fetch employee details |
| `PUT` | `/api/employees/<id>/` | Update employee information |
| `GET` | `/api/departments/` | Fetch all department records |
| `GET` | `/api/leave-requests/` | Fetch leave application history |
| `POST` | `/api/leave-requests/` | Submit a leave application |
| `PUT` | `/api/leave-requests/<id>/` | Approve or reject a leave request |
| `GET` | `/api/attendance/` | Fetch attendance logs |
| `POST` | `/api/attendance/` | Clock-in / Clock-out timestamp |
| `GET` | `/api/stats/` | Fetch dashboard analytics metrics |
| `GET` | `/api/shifts/` | List work shift schedules |
| `GET` | `/api/careers/` | List recruitment positions |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).