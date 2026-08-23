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
| `npm test` / `test:watch`         | Vitest + React Testing Library              |

## Architecture

```
src/
├── app/            # router (+ ProtectedRoute guard), providers (TanStack Query), layout shell, Atmosphere background
├── features/        # one folder per domain: auth/, dashboard/, analytics/ (dashboard KPIs +
│                     #   AI Insights page), departments/ (dropdown data source), employees/,
│                     #   attendance/, leaves/, shifts/, payroll/, notifications/, geofences/,
│                     #   qr/ — every module from the original 20-phase roadmap now has a screen
├── shared/
│   ├── hooks/        # useReveal, useCountUp, useMagneticHover, usePrefersReducedMotion
│   ├── ui/            # Button, Card, Chip, Field/Input/Select, Modal, Reveal, StatCard — the design system's component layer
│   └── lib/            # axios instance (auth header + refresh-on-401), apiError (real backend messages, not hardcoded ones), sparkline canvas renderer
├── stores/           # zustand — session state only (access token in memory, never persisted)
└── types/             # hand-maintained mirror of docs/architecture/04-api-documentation.md
```

Full target structure: [../docs/architecture/05-folder-structure.md](../docs/architecture/05-folder-structure.md).

## Design System

"Cosmoq" theme — a warm-orange/cool-blue dual accent over a near-black ground, glass panels, pill controls — defined once as Tailwind v4 `@theme` tokens in [`src/index.css`](src/index.css) so every component derives its colors/radii/fonts from one source instead of hand-typing them. Replaced the app's original single-blue "control room" theme (see `CHANGELOG.md` for when/why).

| Token                                                    | Value                        | Utility examples                                                                                            |
| --------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--color-bg` / `--color-bg-raised`                        | `#020204` / `#050507`        | `bg-bg`, `bg-bg-raised` (the landing hero's elevated panel)                                                   |
| `--color-accent` / `--color-accent-light`                 | `#ff8a3d` / `#ffb072`        | `bg-accent`, `text-accent-light`, orange half of the brand pair                                                |
| `--color-accent-2` / `--color-accent-2-light`              | `#3d8bff` / `#7db8ff`        | `bg-accent-2`, blue half of the brand pair                                                                     |
| `--gradient-brand` (plain CSS var, not a Tailwind color)  | `135deg, accent → accent-2`  | `.brand-gradient` — reserved for the elements that carry brand identity itself: logo mark, primary buttons, active nav row, topbar avatar, the dashboard's headline chart line, the "Overview" eyebrow shimmer |
| `--color-text` / `--color-text-dim`                        | `#ffffff` / `#8d8f98`        | `text-text`, `text-text-dim`                                                                                  |
| `--color-success` / `--color-warning` / `--color-danger`   | muted teal / amber / coral   | `text-success bg-success/10`, etc. — semantic state, kept separate from the brand accent                       |
| `--radius-pill` / `--radius-card`                          | `100px` / `20px`             | `rounded-pill`, `rounded-card`                                                                                 |
| `--font-sans` / `--font-mono`                              | Inter / Space Mono            | default body font / `font-mono` for data, labels, timestamps                                                    |

Component layer (`shared/ui/`): `Logo` (brain-and-circuit line icon on a `brand-gradient` badge), `icons.tsx` (the nav/topbar icon set — inline SVG line-icons, replacing the Unicode glyphs the app launched with), `Button` (primary = `brand-gradient` pill with a hover lift + glow, replacing the old diagonal shine-sweep, still magnetic cursor-follow; ghost = glass pill), `Card` (translucent, blurred, soft-lit border), `Chip` (status pills), `Reveal` (scroll-triggered fade-up, staggerable via an `index` prop — also what drives the landing hero's entrance, since an element already in the viewport on mount reveals immediately), `StatCard` (count-up number + sparkline + a per-metric hover glow — orange/blue/amber/slate — with an honest "not available yet" state for metrics that have no backing endpoint — see `DashboardPage`, which never fabricates a number: all four KPIs — headcount, attendance rate, late arrivals, on leave — are real and live-fetched from `GET /employees`/`GET /analytics/dashboard`; a role that can't view them (a plain employee) sees "HR/Admin only" rather than a guessed number).

`features/landing/components/LandingHero.tsx` is the full-screen entrance shown once per session before the dashboard — see `AppShell.tsx` for the `hero → animating → dashboard` state machine (wheel/arrow-key/click triggered, one-shot, not persisted) that gates it.

Every animation (mesh drift, scroll-reveal, count-up, magnetic hover, chart draw-in, the landing hero's rays/shimmer) checks `prefers-reduced-motion` via `shared/hooks/usePrefersReducedMotion.ts` and either skips or jumps straight to the end state.

### Auth

- Access token lives in memory (`stores/authStore.ts`) — never written to `localStorage` (XSS mitigation, per [docs/architecture/07-authentication-flow.md](../docs/architecture/07-authentication-flow.md)).
- Refresh token lives in an httpOnly cookie the browser manages; `shared/lib/axios.ts` calls `/auth/refresh` on any `401` and retries the original request once.
- On page load, `features/auth/hooks/useAuthHydration.ts` silently attempts a refresh to restore the session from that cookie before `ProtectedRoute` decides whether to redirect to `/login`.
- `LoginPage` surfaces the backend's actual error message rather than a hardcoded one — needed once the backend's Phase 16 account lockout could return a distinct "try again in N minutes" response that a generic "Invalid email or password" would have hidden.

## Features

- **Auth**: login, session restore, sign-out.
- **Dashboard**: four live KPI cards (headcount, attendance rate, late arrivals, on leave) from `GET /employees`/`GET /analytics/dashboard`, a 6-month attendance-trend line chart (`GET /analytics/attendance-trend`, visible to Super Admin/HR/Manager), and a department-comparison ranking (`GET /analytics/department-comparison`, Super Admin/HR only — a Manager has no "my team" reading of a cross-department report). Both charts are hand-rolled SVG/CSS, not a charting library — same no-dependency approach as the sparkline component `StatCard` already used.
- **Employees**: list (search, department/status filters, pagination), detail view, create, edit, deactivate — role-gated to Super Admin/HR/Manager (list) and Super Admin/HR (create/edit/deactivate), matching the backend's own RBAC exactly rather than re-deciding it client-side. The manager field is a real typeahead against `GET /employees/search`, not a truncated dropdown (an org can have hundreds of employees).
- **Attendance**: the HR/Manager report — date-range/department/status filters, pagination, direct corrections (`PATCH /attendance/:id/correct`, Super Admin/HR only, mandatory reason) and approve/reject on employee-initiated correction requests (Super Admin/HR/Manager). Building this screen surfaced two real backend gaps, both fixed rather than worked around client-side: `GET /attendance` had no employee name/code per row (fixed in `backend-v1.1.1`), and there was no way to create a `Department` at all (fixed in `backend-v1.1.0`) — see [backend/CHANGELOG.md](../backend/CHANGELOG.md).
- **Leave**: the one screen every role reaches, not just Super Admin/HR/Manager — self-service balance cards, apply/cancel, and request history (`GET /leaves/balance`, `/leaves/me`, `POST /leaves`, `PATCH /leaves/:id/cancel`) sit above a Super Admin/HR/Manager-only review queue (`GET /leaves`, approve/reject) rendered in the same page, gated by role rather than a separate route. Building this screen surfaced the same class of backend gap Attendance did — `GET /leaves` had no employee name or leave-type name, just bare ids — fixed in `backend-v1.1.2`.
- **Shifts**: same shape as Leave — a "My Shift" card (`GET /shifts/me`) every role sees, above a Super Admin/HR-only section for shift definitions (create/edit/deactivate) and assignment (`POST /shifts/assign`, one employee at a time via the same `EmployeePicker` typeahead Employees uses). `POST /shifts/assign/bulk` exists on the API but isn't wired up in the UI yet — a documented scope cut, not an oversight.
- **Payroll**: same shape again — a "My Payslips" section (`GET /payslips/me`, PDF download) every role sees, above a Super Admin/HR-only area for salary structures (create/edit, allowances/deductions merged not replaced) and the payslip queue (month/status filters, release, download, and a "Run Payroll" action that starts a batch generation job and polls its status every 2s until it finishes). The PDF download is the one binary response in the whole API (`GET /payslips/:id/pdf`) — fetched as a blob and handed straight to the browser's download flow rather than displayed inline.
- **Notifications**: an inbox every role sees (`GET /notifications/me`, unread filter, mark-read/mark-all-read) plus a Topbar bell badge polling the unread count every 30s (no push/websocket channel exists to invalidate it on arrival). Super Admin/HR additionally get a "Send Broadcast" action (`POST /notifications/broadcast`, org-wide or one department).
- **Geofences**: Super Admin/HR-only office-location CRUD (`GET/POST/PATCH/DELETE /geofences`) — branch name, lat/lng, radius. No self-service half exists here: an employee checks in _against_ a geofence via the mobile app, they never manage one, so the nav item itself is hidden from every other role rather than showing a page with nothing in it.
- **QR Codes**: same reasoning as Geofences (Super Admin/HR only, no self-service). A code is always scoped to one office location, so the screen starts with a location picker, then shows that location's currently-active code (as a real scannable image, `qrImageDataUrl`) or a "Generate" action if none exists. `GET /qr/active`'s expected 404 (`NO_ACTIVE_QR`, when a location has no live code right now) is resolved to `null` in the API client rather than surfaced as an error.
- **AI Insights**: the last module from the original 20-phase roadmap without a screen — Phase 15's three endpoints, previously backend-only. A late-risk ranking (`GET /analytics/ai/late-risk`, Super Admin/HR/Manager) as a triage list, not a sortable report; an absenteeism forecast chart (`GET /analytics/ai/absenteeism-trend`) extending the same hand-rolled-SVG approach with one visually distinct forecast point (dashed segment, different color) so it never reads as a measured data point; and an anomalies list (`GET /analytics/ai/anomalies`, Super Admin/HR only, same narrower gate as department-comparison) — location-anomaly, duplicate-face, and overtime-outlier flags, each carrying the real numbers behind it in a human-readable `detail` string the backend already renders. Every section states plainly that this is transparent statistics, not a trained model — the `duplicate_face` list even repeats the backend's own placeholder-embedding caveat inline, not just in this README.

## Status

Phase 1 scaffolding (routing, auth session plumbing, design system) plus every module from the original roadmap: Employees, Attendance, Leave, Shifts, Payroll, Notifications, Geofences, QR Codes, AI Insights, and — completing `DashboardPage` — a real attendance-trend chart and department-comparison ranking. **Feature-complete against the original 20-phase roadmap** — Phase 15's AI-assisted analytics was the one endpoint set that had shipped backend-only until now. See [Features](#features) above, including four real backend bugs their construction caught. A role that can't use a screen (e.g. a plain employee and `/employees`, `/attendance`, `/geofences`, `/qr-codes`, or `/ai-insights`) has that nav item hidden entirely rather than shown and left to 403 — Leave, Shifts, Payroll, and Notifications are the exception, visible to every role, since their self-service halves are genuinely useful to all of them. `lint`/`typecheck`/`format:check`/`build`/`test` all pass — 19 Vitest + React Testing Library tests, covering real logic rather than presentational rendering: `hasRole` and `Sidebar`'s actual role-based nav visibility (rendered against the real `useAuthStore`, not a mocked one, for exactly the "hidden entirely, not shown-then-403" claim above), the axios-error-message extraction every mutation in the app relies on, and `useCountUp`'s deterministic (non-animation) branches. Not attempted: exhaustive coverage of every page/component — most of this codebase's real business logic lives server-side (see `backend/`), so the frontend's own logic worth pinning down with a test is comparatively small; deep page-level integration tests (mocking the API layer per-page) would be the natural next increment if this ever needs more.
