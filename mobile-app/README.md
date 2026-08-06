# AI Management System — Mobile App

Flutter employee app: GPS/QR/Face attendance, offline sync, leave, shifts, payslips. See [../docs/architecture/](../docs/architecture/) for the full design.

## Stack
Flutter · Clean Architecture (data/domain/presentation) · Riverpod · Dio · GoRouter · Hive + flutter_secure_storage (offline queue + token storage)

## ⚠️ Setup note

This scaffold was built in an environment **without the Flutter SDK installed**, so only the pure-Dart `lib/`/`test/` sources exist — `android/` and `ios/` are intentionally **not** included. Those platform folders are generated templates tied to your exact Flutter/Gradle/Xcode toolchain versions; hand-writing them is the wrong move; always let `flutter create` generate them:

```bash
flutter --version                 # confirm the SDK is installed (3.4+)
flutter create . --org com.aimanagementsystem --platforms=android,ios
flutter pub get
flutter analyze                   # verify this scaffold against your SDK version
flutter test
flutter run
```

`flutter create .` on a directory that already has `pubspec.yaml`/`lib/` adds the missing platform folders without touching your existing Dart source.

## Scripts (once the SDK is set up)

| Command | Purpose |
|---|---|
| `flutter pub get` | Install dependencies |
| `flutter run` | Run on a connected device/emulator |
| `flutter analyze` | Static analysis (flutter_lints, see `analysis_options.yaml`) |
| `flutter test` | Unit + widget tests |
| `flutter build apk --release` | Signed release APK (Phase 19) |

## Project Structure

```
lib/
├── core/
│   ├── constants/    # api_endpoints.dart
│   ├── network/       # DioClient — auth header injection + refresh-on-401
│   ├── storage/        # SecureStorageService (JWT), HiveBoxes (offline queue, Phase 13)
│   ├── error/           # Failure / Exception types
│   ├── router/           # GoRouter + auth-aware redirect guard
│   ├── providers/         # Riverpod DI roots (secureStorageProvider, dioClientProvider)
│   └── utils/              # Result<T> functional-result type
├── features/
│   ├── auth/          # data/domain/presentation — login, session bootstrap, logout
│   └── home/            # placeholder landing screen
│       # attendance/, leaves/, shifts/, payroll/, notifications/, profile/,
│       # face_recognition/ arrive phase by phase — see docs/architecture/05-folder-structure.md
├── shared/            # theme, reusable widgets
├── app.dart            # MaterialApp.router wiring
└── main.dart             # bootstrap: Hive init → ProviderScope → app
```

### Auth flow
- `DioClient` (`core/network/dio_client.dart`) attaches the access token to every request and, on a `401`, calls `/auth/refresh` once and retries — mirrors the admin dashboard's axios interceptor and [docs/architecture/07-authentication-flow.md](../docs/architecture/07-authentication-flow.md).
- Tokens + a minimal cached user profile live in `flutter_secure_storage` (Keychain/Keystore) — never in plain SharedPreferences.
- On launch, `AuthController` reads the cached session (no network round trip) to decide `/splash` → `/` or `/splash` → `/login`, via `core/router/app_router.dart`'s redirect guard.

## Status
Phase 1 (project setup) scaffolding: Clean Architecture layering, DI wiring, and a complete auth vertical slice (login/logout/session-restore) as the reference pattern. Attendance (GPS/QR/Face), leave, shift, payroll, and notification features are added in their respective phases per the [project roadmap](../README.md).
