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
├── features/        # one folder per domain: auth/ + dashboard/ + employees/ (headcount only) scaffolded now,
│                     #   full employees/attendance/leaves/shifts/payroll/geofence/qr/
│                     #   notifications/analytics screens arrive phase by phase
├── shared/
│   ├── hooks/        # useReveal, useCountUp, useMagneticHover, usePrefersReducedMotion
│   ├── ui/            # Button, Card, Chip, Reveal, StatCard — the design system's component layer
│   └── lib/            # axios instance (auth header + refresh-on-401), sparkline canvas renderer
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

Component layer (`shared/ui/`): `Button` (primary = gradient pill with a shine-sweep hover + magnetic cursor-follow; ghost = glass pill), `Card` (translucent, blurred, soft-lit border), `Chip` (status pills), `Reveal` (scroll-triggered fade-up, staggerable via an `index` prop), `StatCard` (count-up number + sparkline, with an honest "not available yet" state for metrics that have no backing endpoint — see `DashboardPage`, which never fabricates a number: headcount is real and live-fetched; the other three KPIs are visibly marked "Phase 14" instead of showing invented data).

Every animation (mesh drift, scroll-reveal, count-up, magnetic hover, shine-sweep) checks `prefers-reduced-motion` via `shared/hooks/usePrefersReducedMotion.ts` and either skips or jumps straight to the end state.

### Auth

- Access token lives in memory (`stores/authStore.ts`) — never written to `localStorage` (XSS mitigation, per [docs/architecture/07-authentication-flow.md](../docs/architecture/07-authentication-flow.md)).
- Refresh token lives in an httpOnly cookie the browser manages; `shared/lib/axios.ts` calls `/auth/refresh` on any `401` and retries the original request once.
- On page load, `features/auth/hooks/useAuthHydration.ts` silently attempts a refresh to restore the session from that cookie before `ProtectedRoute` decides whether to redirect to `/login`.

## Status

Phase 1 scaffolding (routing, auth session plumbing) plus a real design system applied to the two screens that exist today: `LoginPage` and the `AppShell`/`DashboardPage` (sidebar nav shows every planned module, with the unbuilt ones visibly dimmed and marked "Soon" rather than linking nowhere). Feature screens for employees, attendance, leave, shifts, payroll, and notifications — the backend has full APIs for all of them already — land on this same design system in their own passes. `lint`/`typecheck`/`format:check`/`build` all pass.
