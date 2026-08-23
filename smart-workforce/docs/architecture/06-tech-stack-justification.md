# 06 — Tech Stack Justification

## Backend

| Layer | Choice | Alternatives considered | Why this one |
|---|---|---|---|
| Runtime | Node.js 20 LTS | Deno, Bun | Widest ecosystem/library maturity (Mongoose, BullMQ, Firebase Admin, Cloudinary SDKs), easiest hiring/onboarding |
| Language | TypeScript | Plain JS | Compile-time safety across a large multi-module codebase; types shared conceptually with frontend DTOs; catches refactor breakage the moment 10+ modules start referencing each other |
| Framework | Express | Fastify, NestJS | Express is the lowest-ceremony choice that still lets us impose our own layered structure; NestJS's DI/decorators add real value at larger team scale but more boilerplate for a single-team build; Fastify is faster but the ecosystem for this project's specific needs (Firebase, Cloudinary examples) skews Express |
| Database | MongoDB (Atlas) | PostgreSQL | Attendance/HR data is naturally document-shaped (embedded emergency contact, breaks array, allowances object) with a few clear reference relationships — a good fit for Mongoose's schema-on-read flexibility; `2dsphere` geospatial indexes give GPS geofencing essentially for free; Atlas free/shared tier is enough to prototype, scales to dedicated clusters later |
| ODM | Mongoose | Prisma (Mongo connector), native driver | Mature Mongo-specific features (schema middleware/hooks, discriminators for `attendance.method` variants, built-in validation) that Prisma's Mongo support still trails on |
| Auth | JWT (access + refresh) | Session cookies, Auth0/Clerk | Stateless access tokens scale horizontally with zero sticky-session infra; refresh-token rotation stored hashed in DB gives revocation without a third-party IdP bill; a managed IdP (Auth0/Clerk) is deliberately avoided to keep this a from-scratch demonstration of RBAC/JWT engineering (a resume-project goal) |
| Job queue | BullMQ + Redis | Agenda (Mongo-backed) | BullMQ is the de-facto standard for Node, has delayed/repeatable jobs (payroll runs, QR expiry cleanup) and a dashboard (Bull Board) for ops visibility; Redis is also reused for caching and rate-limit counters, so it's infrastructure we already pay for |
| Validation | Zod | Joi, class-validator | Static type inference (`z.infer<>`) removes the duplicate "write a TS interface + write a validator" step; composable for nested attendance/leave payloads |
| Logging | Winston + Morgan | Pino | Winston's transport ecosystem (file, console, future log-drain) and JSON formatting fit a mid-size project without Pino's extra performance headroom being the deciding factor here |
| File storage | Cloudinary | AWS S3 + CloudFront | Built-in image transformation (thumbnailing profile photos, compressing face registration images), generous free tier, single SDK call vs. assembling S3+CDN+signing manually — right tradeoff for this scope |
| Push | Firebase Cloud Messaging | OneSignal | Free, first-party Flutter (`firebase_messaging`) and web support, and the same Firebase project can later host Crashlytics/Analytics for the mobile app |
| Testing | Jest + Supertest | Vitest, Mocha | Jest is the incumbent for Node/TS backend testing with the richest mocking utilities; Supertest integrates cleanly for route-level integration tests |
| Containerization | Docker | — | Deterministic local dev (Mongo + Redis + API via `docker-compose`) and a portable image for Render deployment |

## Admin Dashboard

| Layer | Choice | Alternatives considered | Why this one |
|---|---|---|---|
| Build tool | Vite | Create React App (deprecated), Next.js | CRA is unmaintained; Next.js's SSR/routing is unneeded overhead for an authenticated internal dashboard with no SEO requirement — Vite gives near-instant HMR and a minimal, fast production build |
| Language | TypeScript | — | Same rationale as backend: this dashboard consumes the exact API contract documented in [04](04-api-documentation.md), and typed DTOs catch integration breakage at compile time |
| Styling | Tailwind CSS | MUI, Chakra, Ant Design | Utility-first keeps a custom, on-brand look without fighting a component library's theming API; pairs with a small hand-built primitive kit (`shared/ui`) for the handful of components (DataTable, Modal) that benefit from a shared abstraction |
| Routing | React Router v6 | TanStack Router | The stable, widely-documented default; nested routes + loaders fit the sidebar-shell/feature-page layout cleanly |
| Data fetching | Axios + TanStack Query | RTK Query, SWR | TanStack Query's cache invalidation, background refetch, and pagination helpers remove most manual `useState`/`useEffect` fetch plumbing; Axios interceptors handle the access/refresh token dance in one place |
| Charts | Recharts | Chart.js, Nivo | Declarative React API, good enough performance for dashboard-scale (not real-time-tick) data, composes naturally with Tailwind-styled containers |
| State (client) | Zustand | Redux Toolkit, Context | Auth/session and UI (sidebar collapsed, theme) state is small and cross-cutting — Zustand avoids Redux boilerplate for what is genuinely light global state; server state stays in TanStack Query, not duplicated into a store |

## Mobile App

| Layer | Choice | Alternatives considered | Why this one |
|---|---|---|---|
| Framework | Flutter | React Native | Single codebase with genuinely native performance for camera-heavy work (face detection frame processing, QR scanning) and simpler native ML integration (`google_mlkit_face_detection`, `tflite_flutter`) than RN's bridge overhead |
| Architecture | Clean Architecture (data/domain/presentation) | Simple MVC/MVVM | Enforces the offline-first requirement structurally: `domain` use cases don't know whether data came from Dio or Hive, so `SyncOfflinePunches` and `CheckIn` use cases stay identical whether online or offline — this is the actual mechanism that makes offline mode reliable rather than bolted on |
| State mgmt | Riverpod | Provider, BLoC, GetX | Compile-safe (no `BuildContext`-dependent lookups like `Provider`), less ceremony than BLoC's stream/event boilerplate for this app's needs, and `AsyncNotifier` maps cleanly onto the repository use-case pattern |
| HTTP | Dio | http package | Interceptors (auth header injection, refresh-on-401, retry-on-timeout for flaky office wifi) and multipart upload support (face images, documents) that the bare `http` package requires hand-rolling |
| Routing | GoRouter | Navigator 2.0 raw, auto_route | Declarative, deep-link-friendly (useful for notification tap → specific leave/payslip screen), officially maintained by the Flutter team |
| Local storage | Hive (+ `flutter_secure_storage` for tokens) | SQLite (`sqflite`), Isar | Hive is a fast key-value/object store, ideal for the offline attendance queue (simple append/replay semantics); `sqflite` is kept as a documented fallback if the offline model grows relational (e.g. multi-table conflict resolution) — noted as a v2 consideration |
| Face ML | Google ML Kit (on-device face detection + landmarks) + TFLite (FaceNet-style embedding model) | Cloud-based face API (AWS Rekognition, Azure Face) | On-device keeps biometric processing off the wire entirely except the final embedding vector, which is materially better for privacy/compliance and works with zero network — critical since attendance must work offline |
| Localization | `flutter_localizations` + ARB files | easy_localization | Official Flutter i18n tooling, sufficient for the enterprise-extra multi-language requirement without another dependency |

## Cross-Cutting Infra

| Concern | Choice | Why |
|---|---|---|
| CI/CD | GitHub Actions | Free for public/small-team repos, first-class support for Node, Flutter, and Docker build/push steps, triggers Render/Vercel deploy hooks |
| Backend hosting | Render | Zero-ops Docker deploys, built-in health checks/auto-restart, free TLS, background worker service type for BullMQ processors |
| Admin hosting | Vercel | Best-in-class static/Vite hosting, preview deployments per PR, instant rollback |
| Database | MongoDB Atlas | Managed replica set, automated backups/PITR, `2dsphere` geo support out of the box |
| Media storage | Cloudinary | See backend table above |
| Push | Firebase Cloud Messaging | See backend table above |
| Real-time | Socket.IO | Simple room/namespace model for the live-attendance-dashboard extra, graceful fallback to polling if WebSocket is blocked on a corporate network |

## Explicitly Rejected

- **Microservices from day one** — premature; a modular monolith (see [01](01-software-architecture.md#2-architectural-style)) gets the same separation-of-concerns benefit without distributed-systems tax at this team/traffic size.
- **GraphQL** — REST is simpler to secure per-role (route-level RBAC middleware) and to document/test; the client data-fetching patterns here (list + detail + a few aggregates) don't need GraphQL's flexible querying enough to justify the added schema/resolver layer.
- **Cloud face-recognition APIs** — rejected for the offline-first and biometric-privacy reasons above; on-device is the harder but correct choice for this product.
