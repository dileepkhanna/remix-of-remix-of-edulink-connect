# 🎓 Smart EduConnect — School Management System

A comprehensive, role-based school management platform built with modern web technologies. Smart EduConnect streamlines academic operations by connecting **administrators**, **teachers**, and **parents** through a unified, real-time interface.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Module Breakdown](#module-breakdown)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication & Security](#authentication--security)
- [Design System](#design-system)

---

## Overview

Smart EduConnect is a full-stack school ERP that digitizes day-to-day school operations — from attendance tracking and exam management to fee collection and parent communication. It features three distinct dashboards tailored to each user role, with real-time data synchronization and a responsive, mobile-friendly design.

---

## ✨ Features

### 🔑 Core Capabilities
- **Role-based access control** — Admin, Teacher, and Parent portals with distinct permissions
- **Real-time data sync** — Live updates across all connected users
- **Responsive design** — Works seamlessly on desktop, tablet, and mobile
- **Dark mode support** — Full light/dark theme with semantic design tokens
- **Export & reporting** — CSV and PDF export for attendance, marks, and more

### 📊 Admin Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Overview stats, quick actions, and system health |
| **Teachers** | Add, edit, and manage teacher profiles and assignments |
| **Students** | Student registry with admission numbers, class assignments, and profiles |
| **Classes** | Create classes with sections and assign class teachers |
| **Subjects** | Manage subject catalog with codes |
| **Timetable** | Build and publish weekly timetables per class |
| **Attendance Reports** | View, filter, search, and export attendance data across all classes |
| **Exams** | Create exams, manage schedules, and view results |
| **Leads (CRM)** | Track admission inquiries with status pipeline, follow-ups, and inline status updates |
| **Announcements** | Broadcast announcements to specific audiences |
| **Leave Requests** | Approve or reject leave applications from teachers and students |
| **Certificates** | Process certificate requests (bonafide, transfer, etc.) |
| **Complaints** | Handle and respond to complaints |
| **Fees** | Manage fee structures, track payments, and generate receipts |
| **Messages** | Direct messaging system |
| **Settings** | App configuration, module toggles, and lead permissions |

### 👩‍🏫 Teacher Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Class overview, upcoming tasks, and quick stats |
| **My Classes** | View assigned classes and sections |
| **Students** | Browse students in assigned classes |
| **Attendance** | Mark daily attendance with Present/Absent/Late buttons, quick "Mark All" actions, search, and sticky action bar |
| **Homework** | Assign and manage homework with due dates |
| **Exam Marks** | Enter and manage exam scores with grading |
| **Reports** | Create behavioral and academic reports for students |
| **Announcements** | View school-wide announcements |
| **Leave Request** | Submit personal leave applications |
| **Leads** | Manage admission leads with inline status dropdown (when enabled by admin) |
| **Messages** | Communicate with parents and admin |
| **Timetable** | View personal teaching schedule |

### 👨‍👩‍👧 Parent Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Child's overview with attendance, upcoming exams, and alerts |
| **My Child** | Detailed child profile and academic info |
| **Attendance** | View 30-day attendance history with stats, progress bar, and day-of-week details |
| **Timetable** | View child's weekly class schedule |
| **Homework** | Track assigned homework and due dates |
| **Exam Results** | View marks, grades, and performance analysis |
| **Progress** | Track academic progress and trends |
| **Announcements** | Read school announcements |
| **Leave Request** | Apply for child's leave |
| **Messages** | Communicate with teachers |
| **Certificates** | Request certificates for child |
| **Pay Fees** | View fee details and payment status |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI primitives |
| **State Management** | TanStack React Query, React Context |
| **Routing** | React Router v6 |
| **Backend** | Lovable Cloud (Supabase) — PostgreSQL, Auth, Edge Functions, Storage |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod validation |
| **Date Handling** | date-fns |
| **Icons** | Lucide React |
| **Spreadsheets** | SheetJS (xlsx) for Excel import/export |
| **Animations** | CSS animations, Tailwind transitions |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (SPA)                 │
│  React + TypeScript + Tailwind + shadcn/ui       │
├─────────────────────────────────────────────────┤
│              React Router (Client)               │
│  /admin/*  │  /teacher/*  │  /parent/*  │ /auth  │
├─────────────────────────────────────────────────┤
│         Supabase JS Client + React Query         │
├─────────────────────────────────────────────────┤
│              Lovable Cloud Backend               │
│  ┌───────────┬──────────┬───────────────────┐   │
│  │  Auth     │  DB      │  Edge Functions    │   │
│  │  (JWT)    │  (PgSQL) │  (Deno Runtime)    │   │
│  └───────────┴──────────┴───────────────────┘   │
│              Row Level Security (RLS)            │
└─────────────────────────────────────────────────┘
```

---

## 👥 User Roles

| Role | Access Level | Description |
|------|-------------|-------------|
| **Admin** | Full | Complete system control — manage users, settings, all modules |
| **Teacher** | Scoped | Access to assigned classes, mark attendance, enter marks, manage leads (if permitted) |
| **Parent** | Read-heavy | View child's data, submit leave requests, pay fees, communicate with teachers |

Role assignment is stored in the `user_roles` table and checked on every authenticated request via RLS policies.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── layouts/               # DashboardLayout with sidebar
│   ├── exams/                 # Exam wizard, marks entry, schedule builder
│   ├── leads/                 # Lead forms, call logs, Excel import, settings
│   ├── messaging/             # Messaging interface
│   ├── AttendanceSummary.tsx   # Reusable attendance widget
│   ├── NavLink.tsx            # Navigation link component
│   └── StatCard.tsx           # Dashboard stat card
├── config/
│   ├── adminSidebar.tsx       # Admin navigation config
│   ├── teacherSidebar.tsx     # Teacher navigation config (dynamic leads toggle)
│   └── parentSidebar.tsx      # Parent navigation config
├── hooks/
│   ├── useAuth.tsx            # Authentication context & provider
│   ├── useLeadPermissions.ts  # Teacher lead access check
│   ├── useTeacherSidebar.ts   # Dynamic teacher sidebar builder
│   └── use-toast.ts           # Toast notification hook
├── pages/
│   ├── admin/                 # 16 admin pages
│   ├── teacher/               # 12 teacher pages
│   ├── parent/                # 12 parent pages
│   ├── Auth.tsx               # Login / signup page
│   ├── Index.tsx              # Landing page
│   └── NotFound.tsx           # 404 page
├── integrations/
│   └── supabase/
│       ├── client.ts          # Auto-generated Supabase client
│       └── types.ts           # Auto-generated TypeScript types
├── utils/
│   ├── attendanceDownload.ts  # CSV & PDF export for attendance
│   └── timetableDownload.ts   # Timetable export utilities
├── lib/
│   └── utils.ts               # Tailwind merge utility
├── index.css                  # Design tokens, theme, component classes
└── App.tsx                    # Root component with all routes

supabase/
├── config.toml                # Project configuration
└── functions/
    ├── create-student/        # Edge function: create student with auth
    ├── create-user/           # Edge function: create user accounts
    ├── full-reset/            # Edge function: reset demo data
    └── seed-demo-users/       # Edge function: seed demo accounts
```

---

## 🗄 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (name, email, phone, photo) |
| `user_roles` | Role assignments (admin, teacher, parent) |
| `teachers` | Teacher-specific data (qualification, subjects, joining date) |
| `students` | Student registry (admission no, class, DOB, parent info) |
| `parents` | Parent accounts linked to auth users |
| `student_parents` | Many-to-many: student ↔ parent relationships |
| `classes` | Class definitions with sections and class teachers |
| `subjects` | Subject catalog |
| `teacher_classes` | Teacher ↔ class assignments |

### Academic Tables

| Table | Purpose |
|-------|---------|
| `attendance` | Daily attendance records per student |
| `homework` | Homework assignments per class/subject |
| `exams` | Exam definitions (name, date, max marks, class, subject) |
| `exam_marks` | Student marks per exam with grades |
| `timetable` | Weekly timetable entries (day, period, subject, teacher) |
| `student_reports` | Behavioral/academic reports |

### Administrative Tables

| Table | Purpose |
|-------|---------|
| `fees` | Fee records with payment tracking |
| `leave_requests` | Leave applications for teachers and students |
| `announcements` | School-wide announcements with audience targeting |
| `complaints` | Complaint tickets with response tracking |
| `certificate_requests` | Certificate request processing |
| `messages` | Direct messaging between users |
| `app_settings` | Application configuration key-value store |
| `settings_audit_log` | Audit trail for settings changes |

### CRM Tables (Leads Module)

| Table | Purpose |
|-------|---------|
| `leads` | Admission inquiry tracking with full student/parent details |
| `lead_call_logs` | Call history per lead |
| `lead_status_history` | Status change audit trail |
| `teacher_lead_permissions` | Per-teacher lead module access control |

---

## 🔐 Authentication & Security

- **Email/password authentication** via Lovable Cloud Auth
- **Row Level Security (RLS)** on all tables — users can only access data they're authorized to see
- **Role-based route protection** — each page checks user role before rendering
- **Edge Functions** for privileged operations (creating users, seeding data)
- **Audit logging** for sensitive operations (settings changes, lead status updates)

---

## 🎨 Design System

Smart EduConnect uses a **teal-based color palette** with semantic design tokens:

- **Primary**: Deep Teal (`hsl(180 47% 33%)`)
- **Secondary**: Mint Green (`hsl(145 45% 51%)`)
- **Accent**: Amber Gold (`hsl(38 89% 65%)`)
- **Role Colors**: Admin (Teal), Teacher (Green), Parent (Amber)

**Typography**: Plus Jakarta Sans (headings) + Inter (body text)

**Component Library**: shadcn/ui with custom variants and design tokens defined in `index.css` and `tailwind.config.ts`.

**Utility Classes**:
- `card-elevated` — Elevated card with hover shadow
- `card-stat` — Dashboard stat card with hover animation
- `gradient-primary`, `gradient-admin`, `gradient-teacher`, `gradient-parent` — Role-specific gradient backgrounds
- `status-active`, `status-pending`, `status-approved`, `status-rejected` — Status badge styles

---

## 🚀 Getting Started

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open** `http://localhost:5173` in your browser

4. **Sign up** as an admin to get started, then create teacher and parent accounts from the admin panel

---

## 📄 License

This project is proprietary. All rights reserved.

---

<p align="center">
  Built with ❤️ using <strong>Lovable</strong>
</p>
