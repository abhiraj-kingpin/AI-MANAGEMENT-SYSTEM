# 05 — Folder Structure

```
ai-management-system/
├── backend/
│   ├── src/
│   │   ├── config/                 # env loader, db connection, redis, cloudinary, firebase-admin init
│   │   │   ├── env.ts
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   └── logger.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.validators.ts
│   │   │   │   └── auth.types.ts
│   │   │   ├── users/
│   │   │   ├── employees/
│   │   │   │   ├── employee.routes.ts
│   │   │   │   ├── employee.controller.ts
│   │   │   │   ├── employee.service.ts
│   │   │   │   ├── employee.repository.ts
│   │   │   │   ├── employee.model.ts
│   │   │   │   └── employee.validators.ts
│   │   │   ├── departments/
│   │   │   ├── attendance/
│   │   │   │   ├── strategies/          # gps.strategy.ts, qr.strategy.ts, face.strategy.ts
│   │   │   │   ├── attendance.routes.ts
│   │   │   │   ├── attendance.controller.ts
│   │   │   │   ├── attendance.service.ts
│   │   │   │   ├── attendance.repository.ts
│   │   │   │   └── attendance.model.ts
│   │   │   ├── geofence/
│   │   │   ├── qr/
│   │   │   ├── face-recognition/
│   │   │   │   ├── embedding.service.ts     # TFJS/ML Kit bridge or Python microservice client
│   │   │   │   ├── liveness.service.ts
│   │   │   │   └── face.model.ts
│   │   │   ├── leaves/
│   │   │   ├── shifts/
│   │   │   ├── payroll/
│   │   │   │   ├── payroll.service.ts
│   │   │   │   ├── payslip-pdf.generator.ts
│   │   │   │   └── payroll.model.ts
│   │   │   ├── notifications/
│   │   │   │   ├── fcm.provider.ts
│   │   │   │   └── notification.model.ts
│   │   │   ├── analytics/
│   │   │   │   ├── ai/                       # late-risk.model.ts, anomaly-detector.ts
│   │   │   │   └── analytics.service.ts
│   │   │   └── audit/
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts            # verifies JWT
│   │   │   ├── rbac.middleware.ts            # requireRole([...])
│   │   │   ├── error.middleware.ts
│   │   │   ├── rateLimiter.middleware.ts
│   │   │   ├── audit.middleware.ts
│   │   │   └── validate.middleware.ts        # zod schema runner
│   │   ├── jobs/                             # BullMQ queues + processors
│   │   │   ├── queues.ts
│   │   │   ├── faceEmbedding.processor.ts
│   │   │   ├── payrollRun.processor.ts
│   │   │   ├── reportExport.processor.ts
│   │   │   └── notificationFanout.processor.ts
│   │   ├── sockets/
│   │   │   └── liveAttendance.gateway.ts     # Socket.IO namespace
│   │   ├── shared/
│   │   │   ├── errors/AppError.ts
│   │   │   ├── utils/ (geo.ts, dateTime.ts, pagination.ts, tokens.ts)
│   │   │   ├── constants/roles.ts
│   │   │   └── types/
│   │   ├── app.ts                            # express app assembly
│   │   └── server.ts                         # http server bootstrap
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── .env.example
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   └── tsconfig.json
│
├── admin-dashboard/
│   ├── src/
│   │   ├── app/
│   │   │   ├── router.tsx
│   │   │   ├── providers.tsx                 # QueryClient, Auth, Theme
│   │   │   └── layout/ (Sidebar, Topbar, AppShell)
│   │   ├── features/
│   │   │   ├── auth/ (LoginPage, ForgotPasswordPage, api/, hooks/)
│   │   │   ├── employees/ (pages/, components/, api/, hooks/, types.ts)
│   │   │   ├── attendance/
│   │   │   ├── leaves/
│   │   │   ├── shifts/
│   │   │   ├── payroll/
│   │   │   ├── geofence/
│   │   │   ├── qr/
│   │   │   ├── notifications/
│   │   │   └── analytics/ (charts/, DashboardPage.tsx)
│   │   ├── shared/
│   │   │   ├── ui/ (Button, Table, Modal, Input, DataTable — Tailwind-based kit)
│   │   │   ├── lib/axios.ts                  # instance + interceptors (attach token, refresh-on-401)
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   ├── stores/                           # zustand: auth store, ui store
│   │   ├── types/                            # shared API DTO types (generated from OpenAPI)
│   │   ├── main.tsx
│   │   └── index.css                         # Tailwind entry
│   ├── public/
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── mobile-app/
│   ├── lib/
│   │   ├── core/
│   │   │   ├── constants/ (api_endpoints.dart, app_colors.dart)
│   │   │   ├── network/ (dio_client.dart, interceptors/)
│   │   │   ├── storage/ (hive_boxes.dart, secure_storage.dart)
│   │   │   ├── error/ (failures.dart, exceptions.dart)
│   │   │   ├── router/ (app_router.dart — GoRouter config + guards)
│   │   │   └── utils/ (geo_utils.dart, date_utils.dart)
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── data/ (datasources/, models/, repositories_impl/)
│   │   │   │   ├── domain/ (entities/, repositories/, usecases/)
│   │   │   │   └── presentation/ (screens/, widgets/, providers/)
│   │   │   ├── attendance/
│   │   │   │   ├── data/ (remote_datasource, local_datasource [Hive], repository_impl)
│   │   │   │   ├── domain/ (entities, usecases: CheckIn, CheckOut, SyncOfflinePunches)
│   │   │   │   └── presentation/ (CheckInScreen, GpsAttendanceWidget, QrScanScreen, FaceScanScreen)
│   │   │   ├── face_recognition/
│   │   │   │   ├── data/ (tflite_face_service.dart, ml_kit_detector.dart)
│   │   │   │   ├── domain/
│   │   │   │   └── presentation/ (FaceRegistrationScreen, FaceVerifyScreen)
│   │   │   ├── leaves/
│   │   │   ├── shifts/
│   │   │   ├── payroll/
│   │   │   ├── notifications/
│   │   │   └── profile/
│   │   ├── shared/
│   │   │   ├── widgets/ (buttons, cards, loaders)
│   │   │   └── theme/
│   │   └── main.dart
│   ├── assets/ (images/, ml_models/*.tflite, translations/)
│   ├── android/
│   ├── ios/
│   ├── test/ (unit/, widget/)
│   ├── analysis_options.yaml
│   └── pubspec.yaml
│
├── docs/
│   ├── architecture/
│   │   ├── 01-software-architecture.md
│   │   ├── 02-er-diagram.md
│   │   ├── 03-database-schema.md
│   │   ├── 04-api-documentation.md
│   │   ├── 05-folder-structure.md
│   │   ├── 06-tech-stack-justification.md
│   │   ├── 07-authentication-flow.md
│   │   ├── 08-sequence-diagrams.md
│   │   └── 09-deployment-architecture.md
│   ├── api/openapi.yaml
│   ├── installation-guide.md
│   ├── deployment-guide.md
│   └── screenshots/
│
├── .github/workflows/ (ci-backend.yml, ci-admin.yml, ci-mobile.yml, deploy.yml)
├── .gitignore
└── README.md
```

## Naming Conventions
- Backend: `kebab-case` folders/files, `camelCase` variables/functions, `PascalCase` classes/types, Mongoose model files singular (`employee.model.ts` → exports `Employee`), collections plural (auto-pluralized by Mongoose).
- React: `PascalCase` components (`EmployeeTable.tsx`), `camelCase` hooks (`useEmployees.ts`), one component per file.
- Flutter: `snake_case` files (Dart convention), `PascalCase` classes, feature folders mirror backend module names 1:1 for easy cross-referencing.
