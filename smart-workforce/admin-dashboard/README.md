AI Management System

Enterprise workforce management platform — GPS/QR/face attendance, leave management, shift scheduling, payroll, and notifications.

Tech Stack
Layer	Tech
Frontend	React 19 + Vite + TypeScript + Tailwind CSS
Backend	Node.js + Express + TypeScript + MongoDB
Mobile	Flutter (attendance, payslips, leaves)
Auth	JWT + refresh tokens (httpOnly cookies)
Hosting	Vercel (frontend) + Render (backend)
Project Structure
smart-workforce/
├── backend/          REST API (Node/Express/TypeScript/MongoDB)
├── admin-dashboard/  Web console (React/Vite/TypeScript)
└── mobile-app/       Employee app (Flutter)
Getting Started
bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:5173 (requires backend on :5000)
Key Features
Module	Who	What
Dashboard	All	KPIs (headcount, attendance, late arrivals, on leave)
Employees	HR/Manager/Admin	List, create, edit, deactivate
Attendance	HR/Manager	Review, correct, approve corrections
Leaves	All	Apply, view balance; HR/Manager approves
Shifts	All	View my shifts; HR/Manager assigns
Payroll	All	View payslips; HR/Manager runs payroll
Notifications	All	Inbox, unread count; HR broadcasts
AI Insights	HR/Manager/Admin	Late-risk, absenteeism forecast, anomalies
Scripts
bash
npm run dev              # Dev server
npm run build            # Production build
npm run lint / lint:fix  # ESLint
npm run format           # Prettier
npm run typecheck        # Type check only
npm test                 # Vitest + React Testing Library
