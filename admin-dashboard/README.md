# AI Management System — Admin Dashboard

React + Vite + TypeScript admin dashboard for HR, Managers, and Super Admins. See [../docs/architecture/](../docs/architecture/) for the full design.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · React Router v7 (data mode) · Axios · TanStack Query · Zustand · ESLint (flat config) + Prettier

## Getting Started

```bash
cp .env.example .env.local   # points at the backend API
npm install
npm run dev                  # http://localhost:5173
```

Requires the [backend](../backend/) running (default `http://localhost:5000`).

## Scripts

| Command                           | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `npm run dev`                     | Vite dev server with HMR                    |
| `npm run build`                   | Type-check (`tsc -b`) then production build |
| `npm run preview`                 | Preview the production build locally        |
| `npm run lint` / `lint:fix`       | ESLint                                      |
| `npm run format` / `format:check` | Prettier                                    |
| `npm run typecheck`               | Type-check only, no emit                    |

## Architecture

```
src/
├── app/            # router (+ ProtectedRoute guard), providers (TanStack Query), layout shell, Atmosphere background
├── features/        # one folder per domain: auth/, dashboard/, analytics/ (dashboard KPIs),
│                     #   departments/ (dropdown data source), employees/ (full CRUD), attendance/
│                     #   (report + corrections); leaves/shifts/payroll/geofence/qr/notifications
│                     #   screens arrive phase by phase
├── shared/
│   ├── hooks/        # useReveal, useCountUp, useMagneticHover, usePrefersReducedMotion
│   ├── ui/            # Button, Card, Chip, Field/Input/Select, Modal, Reveal, StatCard — the design system's component layer
│   └── lib/            # axios instance (auth header + refresh-on-401), apiError (real backend messages, not hardcoded ones), sparkline canvas renderer
├── stores/           # zustand — session state only (access token in memory, never persisted)
└── types/             # hand-maintained mirror of docs/architecture/04-api-documentation.md
```

Full target structure: [../docs/architecture/05-folder-structure.md](../docs/architecture/05-folder-structure.md).

## Design System

A single dark "control room" theme — pure black, a drifting blue mesh glow, glass panels, pill controls — defined once as Tailwind v4 `@theme` tokens in [`src/index.css`](src/index.css) so every component derives its colors/radii/fonts from one source instead of hand-typing them:

| Token                                                    | Value                      | Utility examples                                                                        |
| -------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| `--color-bg`                                             | `#000000`                  | `bg-bg`                                                                                 |
| `--color-accent` / `--color-accent-light`                | `#2d5cff` / `#6f8fff`      | `bg-accent`, `text-accent-light`, `from-accent to-accent-light`                         |
| `--color-text` / `--color-text-dim`                      | `#ffffff` / `#8d8f98`      | `text-text`, `text-text-dim`                                                            |
| `--color-success` / `--color-warning` / `--color-danger` | muted teal / amber / coral | `text-success bg-success/10`, etc. — semantic state, kept separate from the blue accent |
| `--radius-pill` / `--radius-card`                        | `100px` / `20px`           | `rounded-pill`, `rounded-card`                                                          |
| `--font-sans` / `--font-mono`                            | Manrope / JetBrains Mono   | default body font / `font-mono` for data, labels, timestamps                            |

Component layer (`shared/ui/`): `Button` (primary = gradient pill with a shine-sweep hover + magnetic cursor-follow; ghost = glass pill), `Card` (translucent, blurred, soft-lit border), `Chip` (status pills), `Reveal` (scroll-triggered fade-up, staggerable via an `index` prop), `StatCard` (count-up number + sparkline, with an honest "not available yet" state for metrics that have no backing endpoint — see `DashboardPage`, which never fabricates a number: all four KPIs — headcount, attendance rate, late arrivals, on leave — are now real and live-fetched from `GET /employees`/`GET /analytics/dashboard`; a role that can't view them (a plain employee) sees "HR/Admin only" rather than a guessed number).

Every animation (mesh drift, scroll-reveal, count-up, magnetic hover, shine-sweep) checks `prefers-reduced-motion` via `shared/hooks/usePrefersReducedMotion.ts` and either skips or jumps straight to the end state.

### Auth

- Access token lives in memory (`stores/authStore.ts`) — never written to `localStorage` (XSS mitigation, per [docs/architecture/07-authentication-flow.md](../docs/architecture/07-authentication-flow.md)).
- Refresh token lives in an httpOnly cookie the browser manages; `shared/lib/axios.ts` calls `/auth/refresh` on any `401` and retries the original request once.
- On page load, `features/auth/hooks/useAuthHydration.ts` silently attempts a refresh to restore the session from that cookie before `ProtectedRoute` decides whether to redirect to `/login`.
- `LoginPage` surfaces the backend's actual error message rather than a hardcoded one — needed once the backend's Phase 16 account lockout could return a distinct "try again in N minutes" response that a generic "Invalid email or password" would have hidden.

## Features

- **Auth**: login, session restore, sign-out.
- **Dashboard**: four live KPI cards (headcount, attendance rate, late arrivals, on leave) from `GET /employees`/`GET /analytics/dashboard`; a trend-chart/department-comparison panel is still a placeholder pointing at the two backend endpoints that already exist for it (`/analytics/attendance-trend`, `/analytics/department-comparison`).
- **Employees**: list (search, department/status filters, pagination), detail view, create, edit, deactivate — role-gated to Super Admin/HR/Manager (list) and Super Admin/HR (create/edit/deactivate), matching the backend's own RBAC exactly rather than re-deciding it client-side. The manager field is a real typeahead against `GET /employees/search`, not a truncated dropdown (an org can have hundreds of employees).
- **Attendance**: the HR/Manager report — date-range/department/status filters, pagination, direct corrections (`PATCH /attendance/:id/correct`, Super Admin/HR only, mandatory reason) and approve/reject on employee-initiated correction requests (Super Admin/HR/Manager). Building this screen surfaced two real backend gaps, both fixed rather than worked around client-side: `GET /attendance` had no employee name/code per row (fixed in `backend-v1.1.1`), and there was no way to create a `Department` at all (fixed in `backend-v1.1.0`) — see [backend/CHANGELOG.md](../backend/CHANGELOG.md).
- **Leave**: the one screen every role reaches, not just Super Admin/HR/Manager — self-service balance cards, apply/cancel, and request history (`GET /leaves/balance`, `/leaves/me`, `POST /leaves`, `PATCH /leaves/:id/cancel`) sit above a Super Admin/HR/Manager-only review queue (`GET /leaves`, approve/reject) rendered in the same page, gated by role rather than a separate route. Building this screen surfaced the same class of backend gap Attendance did — `GET /leaves` had no employee name or leave-type name, just bare ids — fixed in `backend-v1.1.2`.
- **Shifts**: same shape as Leave — a "My Shift" card (`GET /shifts/me`) every role sees, above a Super Admin/HR-only section for shift definitions (create/edit/deactivate) and assignment (`POST /shifts/assign`, one employee at a time via the same `EmployeePicker` typeahead Employees uses). `POST /shifts/assign/bulk` exists on the API but isn't wired up in the UI yet — a documented scope cut, not an oversight.

## Status

Phase 1 scaffolding (routing, auth session plumbing, design system) plus four fully-built feature verticals: Employees, Attendance, Leave, and Shifts — see [Features](#features) above, including three real backend bugs their construction caught. Sidebar nav shows every planned module, with the unbuilt ones visibly dimmed and marked "Soon" rather than linking nowhere; a role that can't use a _built_ screen (e.g. a plain employee and `/employees` or `/attendance`) has that nav item hidden entirely rather than shown and left to 403 — Leave and Shifts are the exception, visible to every role, since their self-service halves are genuinely useful to all of them. Payroll, notifications, geofences, QR, and analytics charts — the backend has full APIs for all of them already — land on this same design system in their own passes. `lint`/`typecheck`/`format:check`/`build` all pass; there is no frontend test suite yet (see [ci-admin.yml](../.github/workflows/ci-admin.yml)'s comment on why that step doesn't exist).
