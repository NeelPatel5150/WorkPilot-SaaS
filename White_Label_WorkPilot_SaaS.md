# White-Label WorkPilot SaaS (HRMS)

# Vision

Build a modern **White-Label WorkPilot Platform** that allows
any company to launch its own branded employee management system using a
single codebase.

The platform should support:

-   Multi-Tenant SaaS
-   Admin Portal
-   Employee Portal
-   Dynamic Branding
-   Modular Features
-   Notification System
-   Attendance
-   Leave Management
-   Reports
-   Role-Based Access Control

------------------------------------------------------------------------

# White Label Concept

Every customer gets:

-   Company Name
-   Logo
-   Favicon
-   Primary Color
-   Secondary Color
-   Login Background
-   Email Branding
-   Domain Mapping
-   SMTP Configuration
-   WhatsApp Number
-   Company Settings

All UI colors should be driven using CSS variables.

Example:

``` css
:root{
  --primary:#2563EB;
  --secondary:#EFF6FF;
  --background:#F8FAFC;
  --card:#FFFFFF;
  --border:#111827;
}
```

------------------------------------------------------------------------

# UI Design

Design Style

-   Neo Brutalism
-   White Cards
-   Thick Black Borders
-   Blue Primary Accent
-   Rounded Corners (16-20px)
-   Strong Typography
-   Large Buttons
-   Offset Shadows
-   Lucide Icons
-   Framer Motion Animations

------------------------------------------------------------------------

# Tech Stack

## Frontend

-   Next.js 16
-   React 19
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Framer Motion
-   React Hook Form
-   Zod
-   TanStack Table
-   Recharts

## Backend

-   Next.js Route Handlers
-   Server Actions
-   Prisma ORM
-   Better Auth
-   PostgreSQL
-   Redis
-   BullMQ

## Infrastructure

-   PostgreSQL (Recommended)
-   Redis
-   AWS S3 / Cloudflare R2
-   Resend
-   Twilio WhatsApp
-   Firebase Cloud Messaging
-   Docker
-   Vercel

------------------------------------------------------------------------

# Why PostgreSQL?

Reasons:

-   ACID Transactions
-   Strong Relations
-   Foreign Keys
-   Complex Reports
-   Payroll Ready
-   Attendance Analytics
-   Prisma Support
-   Multi-Tenant Friendly

------------------------------------------------------------------------

# Folder Structure

``` text
src/
 app/
  (admin)/
  (employee)/
  (auth)/
  api/

 components/
 features/
   attendance/
   employees/
   departments/
   leaves/
   payroll/
   reports/
   notifications/

 services/
 repositories/
 lib/
 hooks/
 jobs/
 emails/
 middleware.ts
```

------------------------------------------------------------------------

# User Roles

-   Super Admin
-   Company Admin
-   HR
-   Manager
-   Employee

------------------------------------------------------------------------

# Admin Portal Modules

-   Dashboard
-   Employee Management
-   Departments
-   Attendance
-   Leave Management
-   Holidays
-   Announcements
-   Documents
-   Payroll
-   Reports
-   Notifications
-   Audit Logs
-   Settings
-   Company Branding
-   Role & Permission Management

------------------------------------------------------------------------

# Employee Portal

-   Dashboard
-   Check-In
-   Check-Out
-   Break Timer
-   Attendance History
-   Apply Leave
-   Leave Balance
-   Documents
-   Announcements
-   Salary Slips
-   Notifications
-   Support Tickets
-   Profile
-   Settings

------------------------------------------------------------------------

# Attendance Features

-   Daily Check In
-   Check Out
-   Break Tracking
-   Working Hours
-   Overtime
-   Late Entry
-   Early Exit
-   GPS Verification
-   Office IP Restriction
-   QR Attendance
-   Selfie Capture
-   Biometric Integration
-   Shift Management

------------------------------------------------------------------------

# Leave Features

-   Casual Leave
-   Sick Leave
-   Medical Leave
-   Work From Home
-   Half Day
-   Comp Off
-   Maternity
-   Paternity
-   Multi-Level Approval
-   Attachment Upload
-   Approval Timeline
-   Leave Balance

------------------------------------------------------------------------

# Notification System

Whenever an employee performs an action:

Employee applies leave

↓

Admin receives:

-   Email
-   WhatsApp
-   Browser Push Notification
-   In-App Notification

Employee receives:

-   Leave Approved
-   Leave Rejected
-   Attendance Reminder
-   Birthday Wish
-   Company Announcement

Future integrations:

-   Slack
-   Microsoft Teams
-   Telegram
-   Discord

------------------------------------------------------------------------

# Reports

-   Daily Attendance
-   Monthly Attendance
-   Leave Reports
-   Employee Reports
-   Department Reports
-   Late Arrival Reports
-   Payroll Reports

Export:

-   CSV
-   Excel
-   PDF

------------------------------------------------------------------------

# AI Features

-   Attendance Insights
-   Leave Prediction
-   Employee Productivity Trends
-   Smart Search
-   HR Assistant Chatbot
-   Auto Announcement Generator

------------------------------------------------------------------------

# Database Tables

-   companies
-   users
-   employees
-   roles
-   permissions
-   departments
-   attendance
-   attendance_logs
-   leave_requests
-   leave_balances
-   holidays
-   announcements
-   notifications
-   documents
-   activity_logs
-   payroll
-   salary_slips
-   assets
-   settings
-   support_tickets

Each business table should include:

-   id
-   companyId
-   createdAt
-   updatedAt

------------------------------------------------------------------------

# Suggested Architecture

Internet

↓

Next.js Application

↓

Admin Portal + Employee Portal

↓

API Routes / Server Actions

↓

Service Layer

↓

Prisma ORM

↓

PostgreSQL

↓

Redis + BullMQ

↓

Email / WhatsApp / Push Notifications

------------------------------------------------------------------------

# Multi-Tenant Strategy

Every record belongs to one company using companyId.

Benefits:

-   Single codebase
-   Secure data isolation
-   Easy onboarding
-   White-label branding
-   Lower maintenance cost

------------------------------------------------------------------------

# Security

-   Better Auth
-   JWT / Session
-   Role-Based Access Control
-   Permission Matrix
-   Audit Logs
-   Rate Limiting
-   CSRF Protection
-   SQL Injection Protection
-   XSS Protection

------------------------------------------------------------------------

# Roadmap

## Phase 1

-   Authentication
-   Company Creation
-   Employee Management
-   Attendance
-   Leave

## Phase 2

-   Notifications
-   Reports
-   Branding
-   Holidays
-   Documents

## Phase 3

-   Payroll
-   Performance
-   Assets
-   Support Tickets

## Phase 4

-   AI Features
-   Mobile App
-   Public APIs
-   Third-Party Integrations

------------------------------------------------------------------------

# Future Modules

-   Recruitment
-   Interview Pipeline
-   Onboarding
-   Offboarding
-   OKRs
-   Performance Reviews
-   Expense Claims
-   Travel Requests
-   Timesheets
-   Visitor Management
-   Meeting Rooms
-   Internal Chat
-   Employee Recognition
-   Knowledge Base

------------------------------------------------------------------------

# Final Tech Stack

-   Next.js 16
-   React 19
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Framer Motion
-   Prisma ORM
-   PostgreSQL
-   Redis
-   BullMQ
-   Better Auth
-   Resend
-   Firebase Cloud Messaging
-   Twilio WhatsApp
-   AWS S3 / Cloudflare R2
-   Docker
-   Vercel
