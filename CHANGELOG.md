# Changelog

Repository-wide build history, in order. Backend module-level detail (what was added, what bugs were caught, what was deliberately simplified and why) lives in [backend/CHANGELOG.md](backend/CHANGELOG.md) — this file covers cross-project milestones and links to that detail rather than duplicating it.

## Mobile — Real On-Device Face Embedding (Written Blind, Confirmed by CI)

Replaced the mobile app's geometric embedding placeholder with real on-device inference: the same `w600k_mbf.onnx` MobileFaceNet model the backend runs (identical checksum), via the `onnxruntime` Flutter plugin, on a face aligned with a direct Dart port of the backend's own `faceAlign.ts` (fed from `google_mlkit_face_detection`'s real landmarks rather than a ported SCRFD detector). `GeometricEmbeddingGenerator` is kept as `FaceEmbeddingGenerator`'s same-device fallback — decided once per capture attempt, never per-frame, so real and fallback vectors (512-dim vs. 67-dim, incompatible spaces) can never mix within one registration or check-in. This should also close the mobile-vs-backend embedding-space gap noted in earlier entries, not just the mobile-internal one — real-world matching accuracy across that gap is still unmeasured (no dataset of real people in this environment), but both sides now run the identical model.

**Written with no Dart/Flutter SDK available at all** — not `flutter analyze`, not `flutter test`, not a device. Every other change in this repository was typechecked/linted/run for real before being called done; this one wasn't, at the time it was written, and said so plainly in its own code comments, the mobile README, and here rather than being passed off as equivalent. One real bug was still caught by careful self-review before the first push (`num.clamp()` on an `int` returns `num` in Dart, not `int`, which would have failed to compile against `image`'s `getPixel(int, int)`). **Confirmed by `ci-mobile.yml`** (real Flutter 3.24.0, `flutter analyze`/`flutter test`/`flutter build apk --debug`) across three pushes: the first `flutter analyze` failed for real (a private type leaked through a public API, a redundant import, several `final`s that should have been `const` — all fixed from the analyzer's actual output, not guessed, the same discipline this repo's whole CI history follows), the next two were clean. Final state: `flutter analyze` → 0 issues, `flutter test` → 50/50 (41 prior + 9 new known-answer alignment tests), `flutter build apk --debug` → built. What that CI pass can't reach: real-world face-matching accuracy on a device, and whether `OrtEnv` tolerates re-initialization across repeated screen visits (see `FaceEmbeddingGenerator.dispose()`'s doc comment) — both stay open, documented questions. Details: [mobile-app/README.md#face-check-in](mobile-app/README.md#face-check-in).

## Backend v1.1.9 — Real Accuracy Measurement (LFW) Fixes a Broken Threshold, Plus Real Anti-Spoofing

Two additions closing gaps flagged since `v1.1.6`: face recognition had no measured accuracy, and no defense against a printed-photo or screen-replay registration.

`scripts/lfw-eval.ts` (`npm run eval:lfw`) runs the real detect→align→embed→cosine-match pipeline against LFW (Labeled Faces in the Wild, the standard face-verification benchmark) using its own standard `pairsDevTest.txt` split — the dataset itself is never committed to this repo, same reasoning as the CC0 portrait used to manually verify SCRFD detection in `v1.1.7`. Real result (989/1000 pairs processed): 96.97% verification accuracy at the empirically best threshold, with real separation between same-person (mean similarity 0.588) and different-person (mean 0.003) pairs. The finding that mattered most: `FACE_MATCH_THRESHOLD`'s old default (0.85, an unmeasured guess) scored only 51.16% — essentially a coin flip, a real bug that had been sitting undetected since before this codebase had a real embedding model at all. Fixed to `0.3`.

`livenessDetector.ts` adds real single-image presentation-attack detection to `POST /face/register` — MiniFASNet-V2 (Apache 2.0, provenance checksum-verified), a printed-photo or screen-replay registration photo is now discarded the same way a low-quality or faceless one already was. Preprocessing is a direct, line-for-line port of the upstream project's own crop formula, not derived independently. Complementary to (not a replacement for) the mobile app's existing blink-based liveness check — that one is temporal and client-side at check-in; this one is single-image and server-side at registration.

614 Jest tests (up from 608), `tsc`/`eslint`/`prettier` clean. Details: [backend/CHANGELOG.md#v119--real-accuracy-measurement-lfw-fixes-a-broken-threshold-plus-real-anti-spoofing](backend/CHANGELOG.md#v119--real-accuracy-measurement-lfw-fixes-a-broken-threshold-plus-real-anti-spoofing).

## Backend v1.1.8 — CI Caught a Real Crash in v1.1.7: Two Jest Files, One Native ONNX Runtime Singleton

`v1.1.7`'s 608 tests passed locally every time, but CI's `npm test` hard-aborted (SIGABRT) the moment the face-recognition tests loaded a real model — a genuine bug, not an environment quirk: `onnxruntime-node`'s native "initialize once" guard is scoped per Jest module registry, and Jest gives every test *file* its own fresh one, so two separate files (`faceDetector.test.ts`, `faceEmbedding.provider.test.ts`) each independently, unknowingly triggered the real native init as if for the first time — the second call collided with an already-registered native cleanup hook and Node's own internal duplicate-registration assertion aborted the whole process. An initial hypothesis (same Node-20-too-old class of bug as the `ci-admin.yml` fix) was tested and found wrong — reproduced identically on Node 22 — and is left in this history rather than quietly dropped. The real fix: merged both files into one (`faceRecognitionModels.test.ts`) so both real model sessions share one module registry, plus explicit single-threaded `SessionOptions` on both models (`onnxruntime-node` has multiple open upstream reports of non-deterministic native crashes tied to its own thread pool on Linux). Reproduced locally once actually looked for, fixed, verified 4 consecutive clean local runs, then confirmed green on CI's Linux runner — `npm test`, `build`, and `docker-build` all passing — before calling it done. Details: [backend/CHANGELOG.md#v118--ci-caught-a-real-crash-in-v117-two-jest-files-one-native-onnx-runtime-singleton](backend/CHANGELOG.md#v118--ci-caught-a-real-crash-in-v117-two-jest-files-one-native-onnx-runtime-singleton).

## Backend v1.1.7 — Real Face Detection + Alignment (SCRFD), Closing v1.1.6's Own Gap

`v1.1.6` shipped a real embedding model but was explicit about its biggest remaining gap: no face detection, no alignment — the whole photo got resized straight into the model. This closes it, with the same `buffalo_s` pack's bundled detector `v1.1.6` had deliberately left out. `faceDetector.ts` runs `det_500m.onnx` (SCRFD) for real detection + 5 facial landmarks; `faceAlign.ts` warps those landmarks onto InsightFace's standard alignment template via a from-scratch similarity-transform implementation (solved in closed form through a complex-plane least-squares fit, not a general SVD) and a from-scratch bilinear-sampling warp (not a third-party call whose exact geometric convention wasn't confidently knowable). Both the anchor-decoding math and the alignment reference template were fetched and read directly from InsightFace's own published source before writing any decode logic — not derived from memory, given how easily a silently-wrong index mapping produces plausible-but-meaningless output.

Verified two ways beyond "the tests pass": the alignment math is pure geometry with known-answer test cases (a known scale, a known rotation, a known translation, each with hand-computed expected results) that don't need a model or a photo at all; the detector was additionally run once, manually, against a real CC0-licensed portrait photo (downloaded temporarily, never committed to this repo) and correctly found one face with a visually-accurate bounding box and anatomically plausible landmarks — real, human-verified evidence beyond synthetic test fixtures. 608 backend tests (up from 589). Details: [backend/CHANGELOG.md#v117--real-face-detection--alignment-scrfd-closing-v116s-own-gap](backend/CHANGELOG.md#v117--real-face-detection--alignment-scrfd-closing-v116s-own-gap).

## Backend v1.1.6 — Real Face Embedding Model (MobileFaceNet via ONNX Runtime)

The face-embedding placeholder documented since Phase 8 is real for the server-side registration path now: `POST /face/register`'s photo→vector step runs InsightFace's official `buffalo_s` model pack (MIT license) — `w600k_mbf.onnx`, a MobileFaceNet model — via `onnxruntime-node`, instead of hashing image bytes. Committed at `backend/models/w600k_mbf.onnx` (13.6MB), input/output shape confirmed by actually running inference against the file, not assumed. Deliberately scoped to embeddings only — no face detection/alignment step, since the same model pack's bundled SCRFD detector needs real anchor-decoding implementation work with no way in this environment to verify it against photos with known face locations; that scoping tradeoff was confirmed with the user before any binary was downloaded, given the real stakes (provenance/trust, repo size, and the harder truth that even a perfect implementation can't be verified to actually recognize faces correctly here — no photos of real people with known identities exist to test against).

Two real bugs caught while shipping this, neither from a test failing first: (1) `analytics.ai.service.ts`'s `duplicate_face` anomaly sweep pairwise-compares every active face embedding org-wide via `cosineSimilarity`, which throws on a length mismatch — with three embedding spaces now realistically coexisting (512-d real model, 67-d mobile's on-device placeholder, 128-d legacy), that sweep would have crashed the moment two employees registered through different paths, a pre-existing latent bug this change made newly likely to trigger. Fixed by skipping mismatched-length pairs. (2) The Dockerfile's runtime stage only ever copied `dist/` — the new model file (not TypeScript, so `tsc` never touches it) would have been missing from the actual deployed container. Also switched every Docker stage from `node:20-alpine` to `node:20-slim`: `onnxruntime-node` ships no musl-compiled binary and fails outright on Alpine, a documented upstream limitation, not a guess — confirmed by `ci-backend.yml`'s `docker-build` job, which actually builds the image on every push and passed on this commit.

A third, narrower bug was in the test suite itself: `faceEmbedding.provider.test.ts` deliberately runs the real model unmocked and hit a documented, Jest-maintainer-"closed as not planned" limitation (`jestjs/jest#11864`) — Jest's sandboxed test realm gives each file its own `Float32Array` constructor, and `onnxruntime-node`'s native tensor validation checks identity against the real process's, so it failed inside Jest despite running correctly outside it. Fixed with a custom Jest environment scoped to that one file, not a workaround that skips testing the real code path. 589 backend tests (up from 588). Details: [backend/CHANGELOG.md#v116--real-face-embedding-model-mobilefacenet-via-onnx-runtime](backend/CHANGELOG.md#v116--real-face-embedding-model-mobilefacenet-via-onnx-runtime).

## Mobile App — Payslip PDF "Open" Action

Tenth feature beyond auth, closing the last of the mobile-app README's honestly-documented small gaps: downloading a payslip PDF used to only report the saved file path via a `SnackBar`. `FileOpenerService` (`core/services/file_opener_service.dart`) wraps `open_filex` — the one place that plugin is touched — and the `SnackBar` now has a real "Open" action. No auto-open on download completion, deliberately: an app-initiated action interrupting the user uninvited is worse than a tap they choose to make. No Gradle changes needed at all this time — `open_filex`'s own `compileSdk 34`/`minSdk 16` are both already below this project's current values, confirmed by reading its `android/build.gradle` first, same habit as every other plugin added this project. `flutter analyze`: 0 issues; `flutter test`: 41/41 passing (unchanged — `FileOpenerService` wraps a static platform-channel call the same way `CameraService`/`LocationService` do, none of which get a direct unit test either, only the pure logic that consumes their output does).

## Admin Dashboard — Test Suite (Vitest + React Testing Library)

Closed the one gap `admin-dashboard/README.md` had been carrying since Phase 1: no frontend test suite, `ci-admin.yml` explicitly running no `npm test` step "deliberately" rather than faking a green checkmark for a script that didn't exist. Added Vitest + React Testing Library (jsdom environment, `globals: true` to match the backend Jest suite's own ambient-global convention rather than diverging) and 19 tests targeting this codebase's actual logic rather than presentational rendering: `hasRole` and the real `Sidebar`'s role-based nav visibility — rendered against the real `useAuthStore`, not a mocked one, pinning down exactly the "a role that can't use a screen has that nav item hidden entirely" claim the README already made — the axios-error-message extraction (`apiErrorMessage`) every mutation in the app relies on, and `useCountUp`'s deterministic (non-animation) branches under reduced motion. Deliberately not attempted: exhaustive page-level coverage — most of this codebase's real business logic lives server-side, so page-level tests would mostly be mocking the API layer and re-testing what the backend's own test suite already covers; a reasonable next increment, not today's gap. `ci-admin.yml` now runs `npm test` for real.

**Real CI bug caught shipping this**: the suite passed locally every time but failed instantly (~1s) on `ci-admin.yml`'s actual Linux runner. This environment couldn't download the job's logs (GitHub's API returns 403 for unauthenticated requests here, and the log viewer is a client-rendered page no available tool can execute) — worked around it by adding a temporary CI step that routed the failure through GitHub's `::error::` annotation channel, which the API *can* return. Real cause: `node-version: '20'` in the workflow provides a genuinely different (and older) Node.js than this dev machine's Node 24 — Vitest 4.1.11's dependency chain calls a Node internal (`webidl.util.markAsUncloneable`, inside `undici`) that doesn't exist on Node 20, crashing every test worker before a single test ran. Bumped to Node 22 (current LTS); the diagnostic step and an earlier, wrong `pool: 'forks'` guess (a red herring tried before the real cause was found) were both reverted once the actual fix was confirmed green.

## Backend v1.1.5 — Leave Carry-Forward, Absence Sweep, Analytics PDF Export, Connection Pool

Closed three of the four gaps `backend/README.md` had been carrying under "Other known, documented gaps" — found doing a full pass over every documented placeholder in the repository. `POST /leaves/carry-forward` computes real year-end balance rollovers (correctly covering employees with zero persisted leave history, not just existing balance rows — a real bug caught while designing it, before it ever ran). `POST /attendance/absence-sweep` finally uses the `absent` status that's existed in the schema since Phase 5. `GET /analytics/export/pdf` joins the existing CSV export. Mongoose's connection pool is now explicitly sized rather than left at the driver's defaults. The fourth gap — one `clientGeneratedId` per attendance document instead of one per punch type — was deliberately left alone: the real fix touches sync/check-in/check-out logic in several places at once, and this environment has no live MongoDB to verify a schema-shaped change against end-to-end, so a documented, already-mitigated gap stayed as-is rather than risk an unverifiable regression. 588 backend tests (up from 569). Details: [backend/CHANGELOG.md#v115--leave-carry-forward-absence-sweep-analytics-pdf-export-connection-pool](backend/CHANGELOG.md#v115--leave-carry-forward-absence-sweep-analytics-pdf-export-connection-pool).

## Admin Dashboard — AI Insights (Feature-Complete)

The last module from the original 20-phase roadmap without a screen anywhere — Phase 15's AI-assisted analytics had been backend-only since it shipped. New `AiInsightsPage` (`/ai-insights`, gated Super Admin/HR/Manager, matching `GET /analytics/ai/late-risk`'s and `/ai/absenteeism-trend`'s own server-side scoping) with three sections: a late-risk ranking (`LateRiskTable`, a triage list rather than a sortable report), an absenteeism forecast chart (`AbsenteeismForecastChart`, extending `AttendanceTrendChart`'s hand-rolled-SVG approach with one visually distinct forecast point — a dashed segment and a different color, so it never reads as a measured data point), and an anomalies list (`AnomaliesList`, gated further to Super Admin/HR only inside the page, same narrower gate `DepartmentComparison` already uses) — location-anomaly, duplicate-face, and overtime-outlier flags, each carrying the real numbers behind it in a `detail` string the backend already renders as a sentence. Every section states plainly that this is transparent rule-based statistics, not a trained model; the `duplicate_face` section repeats the backend's own placeholder-embedding caveat inline rather than only in this changelog. With this, the admin dashboard — and, combined with the QR/Shifts entries below, the mobile app too — is feature-complete against the original 20-phase roadmap on every client. `lint`/`typecheck`/`format:check`/`build` all clean.

## Mobile App — Shifts (Read-Only)

Ninth feature beyond auth, and the last module needed for the mobile app to be feature-complete against the original 20-phase roadmap. `ShiftScreen` (a "My Shift" card on `HomeScreen`) fetches `GET /shifts/me`, which the backend already resolves down to "the assignment effective today, if any" — so unlike `AttendanceEntity`'s date/status logic, there's no client-side "is this still effective" computation to duplicate; `ShiftAssignmentEntity` is a flat mirror of the server's DTO. Deliberately read-only: shift *management* is the admin dashboard's Super Admin/HR-only screen, and an employee only ever needs to see their own hours. `assignment: null` (no shift currently assigned) is handled as a real, valid state with its own explanatory message, not an error — `ShiftState.copyWith` needed the same explicit `clearAssignment` flag `PayslipState.copyWith`'s `clearDownloadingId` already established, since a refresh going from "had a shift" to "no longer assigned one" must actually clear the stale value rather than have `??` silently keep it. No new native dependency. `flutter test`: 41/41 passing (up from 38).

## Mobile App — QR Check-In

Eighth feature beyond auth. `QrCheckInScreen` owns a `MobileScannerController`/`MobileScanner` (`mobile_scanner`) directly — the only place that plugin is touched, same discipline `CameraService`/`FaceDetectionService` keep for Face check-in. No separate controller/state needed the way Face check-in has one: decoding a barcode is a single event, not a multi-step capture pipeline, so the screen forwards the scanned token straight to the existing `AttendanceController.checkInWithQr()`. Offline-queue fallback exists for symmetry with GPS/Face but is honestly weaker here — a QR token is time-boxed server-side and validated against "now" at sync time, not the original scan time, so an outage that outlasts the token's validity window comes back `QR_EXPIRED` on sync (a terminal result `SyncService` already handles correctly, just not a successful one).

Adding `mobile_scanner` surfaced four more real Gradle bugs beyond geolocator's two from the GPS pass, all found by reproducing the failure locally (`flutter build apk --debug`, GitHub's log API still needs auth this environment doesn't have) and all fixed and verified — the local build actually produced `app-debug.apk` for the first time this session, including getting past the previously-documented Windows `jlink`/username-with-a-space wall, which turned out to depend on the dependency graph rather than being unconditionally unfixable: (1) CameraX transitives need AGP 8.6.0+, requiring a Gradle wrapper bump to 8.9 alongside it; (2) `mobile_scanner` itself needs compileSdk 36, now hardcoded in `app/build.gradle` the same way the AGP bump required; (3) `androidx.camera:camera-video`'s manifest declares `minSdkVersion 23`, so the app's `minSdk` is now 23 (was 21) — a real, documented trade-off dropping Android 5.0/5.1 support, not just a config tweak; (4) `mobile_scanner`'s Kotlin sources are compiled against Kotlin 2.2.20, but the project centrally pins `org.jetbrains.kotlin.android` in `settings.gradle` (every module resolves to that version regardless of its own `buildscript` request), so the fix had to land there, exactly where Flutter's own build error pointed. `flutter analyze`: 0 issues; `flutter test`: 38/38 passing (up from 37).

## Mobile App — Face Registration

Seventh feature beyond auth, and the piece that actually closes the mismatch the two entries below describe rather than just making it fixable. `FaceRegistrationScreen` (a new "Face Registration" card on `HomeScreen`, since no Profile/Settings screen exists yet) captures up to 5 frames, keeps the ones with exactly one detected face, runs each through the *same* `GeometricEmbeddingGenerator` check-in already used, and submits 3–5 of them to the backend's new `POST /face/register-embeddings`. No liveness check on this path — the backend's `registerFaceEmbeddingsSchema` doesn't require one, and a registration photo isn't asserting a live person is present the way a check-in is. `FaceRegistrationController` loads `GET /face/registration-status` on open so the screen shows "already registered" (photo count, last-updated time) instead of assuming a blank slate; re-registering simply replaces the reference set. New `features/face/data`+`domain/repositories`+`domain/usecases` slice (`FaceRepository`, `RegisterFaceEmbeddingsUseCase`, `GetFaceRegistrationStatusUseCase`) alongside the existing check-in-only domain pieces. No new native dependency — reuses `CameraService`/`FaceDetectionService` as-is. `flutter analyze`: 0 issues; `flutter test`: 37/37 passing (up from 35). **Honesty note**: this closes the mismatch only going forward — an employee registered earlier through the original server-side photo-upload path still has hash-based reference embeddings until they re-register through this screen once; documented as a Known Limitation, not silently glossed over.

## Backend v1.1.4 — Face Registration: Accept Client-Computed Embeddings

A direct follow-up to the mobile face check-in entry below: `POST /face/register-embeddings` lets a client submit 3–5 embeddings it already computed on-device, so an employee's registration and check-in embeddings can be produced by the same method instead of two incompatible ones (server photo-hash vs. mobile landmark-geometry). `faceService.registerWithEmbeddings()` reuses the same reference-set-replacement rule as image-based `register()` via a newly-shared `deactivatePreviousEmbeddings()` helper, skips quality-score filtering (the client already made that call before submitting), and stores no `sourceImageUrl` — which required loosening that field from required to optional, tied back to the architecture doc's own on-device-privacy rationale. 569 backend tests (up from 562). This closes the mismatch only where both ends are wired up — see the mobile Face Registration entry above for the screen that actually calls it. Details: [backend/CHANGELOG.md#v114--face-registration-accept-client-computed-embeddings](backend/CHANGELOG.md#v114--face-registration-accept-client-computed-embeddings).

## Mobile App — Face Check-In

Sixth feature beyond auth. `CameraService` (wraps `camera`) and `FaceDetectionService` (wraps `google_mlkit_face_detection`) are the only two places those plugins are touched — everything else in `features/face/` works against this app's own `DetectedFace` type. Liveness is real: `FaceCheckInController` captures a short burst of frames while the user blinks, and `BlinkLivenessChecker` — pure, unit-tested logic — requires a genuine open→closed→open transition, which a printed photo or frozen frame can never produce. The embedding step is honestly not real: bundling/verifying a trained FaceNet/MobileFaceNet `.tflite` model wasn't feasible in this environment (no GPU, no way to download/validate a model file) — the same constraint the backend's own `faceEmbedding.provider.ts` already documents for server-side registration. `GeometricEmbeddingGenerator` produces a deterministic 67-number vector from the detected face's actual landmark geometry instead — a real function of a real detected face, but not something that reliably matches the same person the way a trained model would. `AttendanceRepository.checkInWithFace()` mirrors `checkInWithGps()` exactly, including offline-queue fallback. At the time this shipped, face *registration* wasn't built on either client, and the two embedding methods (server byte-hash vs. mobile geometry) wouldn't have agreed even if it were — documented as a known limitation rather than glossed over, and since resolved (going forward) by the Mobile App — Face Registration entry above. `flutter test`: 35/35 passing (up from 20).

## Mobile App — Offline Sync (Attendance Queue)

Fifth feature beyond auth, completing Phase 13's mobile half (the backend side, `POST /attendance/sync`, has existed since the backend's own Phase 13). `AttendanceRepositoryImpl` catches a `NetworkException` specifically on check-in and enqueues the punch into a Hive-backed `OfflineQueueService` (plain `Map` storage, no generated `TypeAdapter` — this project has no `build_runner` step) rather than failing outright, returning a new `OfflineQueuedFailure` type the UI shows as neutral "queued" text instead of a red error. `ConnectivityService` (wrapping `connectivity_plus`) emits only on real offline→online transitions; `SyncService` drains the whole queue against `POST /attendance/sync` in one batch on each transition, removing every terminal result (applied, duplicate, or a definitive conflict) the same way the backend's own sync endpoint treats them. Check-in only for now, not check-out — a natural, documented follow-up rather than a fundamental limit. `flutter test`: 20/20 passing (up from 16). With this, the mobile app is feature-complete against its scope of the original 20-phase roadmap; only QR/Face check-in and Shifts (a screen, not a roadmap phase gap) remain.

## Mobile App — Notifications (Inbox)

Fourth feature beyond auth: an inbox (`GET /notifications/me`, unread filter, mark-read/mark-all-read). Self-service only — sending a broadcast is Super Admin/HR only and already built on the admin dashboard, so this app doesn't duplicate that composer. Fetches a single generous page (`limit: 50`) rather than building full pagination UI, a documented scope cut. `flutter test`: 16/16 passing (up from 14).

## Mobile App — Payslips (List + Download)

Third feature beyond auth: lists released payslips (`GET /payslips/me`) and downloads the real PDF (`GET /payslips/:id/pdf`, the one binary response in the whole API) to the device's app-documents directory via `path_provider` — checked its `android/build.gradle` first to confirm it hardcodes `compileSdk` directly rather than referencing the same `flutter.compileSdkVersion` pattern that broke `geolocator`. Doesn't open the saved PDF in a viewer yet (needs another plugin this pass didn't add) — reports the saved path via a `SnackBar` instead, real working behavior rather than a half-built "open" action. `flutter test`: 14/14 passing (up from 11).

## Mobile App — Leave (Apply/Cancel/Balance)

Second feature beyond auth, same shape as Attendance: data/domain/presentation, a `Result<T>`-returning `LeaveRepository`, one controller loading leave types + balance + history concurrently. The apply form is a modal bottom sheet rather than a separate route. `LeaveEntity.isCancellable` mirrors `leave.service.ts#cancel`'s exact server-side rule, so the Cancel button only appears where the server would actually allow it. `flutter test`: 11/11 passing (up from 8).

## Mobile App — GPS Check-In/Check-Out

The first feature added to the mobile app beyond auth: a `LocationService` wrapping `geolocator` (permission request + high-accuracy GPS read), composed with `POST /attendance/check-in`/`check-out` behind the same Clean Architecture layering the auth slice established (data/domain/presentation, a `Result<T>`-returning repository, Riverpod DI). The screen shows today's status, a single button that swaps between Check In and Check Out, and a pull-to-refresh history list. Also extracted `dio_exception_mapper.dart` out of `AuthRemoteDataSourceImpl` (which had it inlined) once Attendance needed the identical `DioException` → domain-`Exception` translation — the same "fix it once you've copied it twice" call made for the backend's `resolveEmployeeRefs`.

Adding `geolocator` broke `ci-mobile.yml`'s debug APK build — a real failure, and one GitHub's log API wouldn't let us read directly (a 403 this environment's unauthenticated requests can't get past), so it was root-caused by reproducing it with a local `flutter build apk --debug` instead. Two genuine, separate bugs: (1) `minSdkVersion` below 26 needs core library desugaring enabled, geolocator's own documented requirement; (2) `geolocator_android`'s `build.gradle` reads a `flutter.compileSdkVersion` property that only exists on Flutter's older, no-longer-used Gradle plugin-loading mechanism — fixed with a small compatibility shim in the root `android/build.gradle`. Also pinned `geolocator` below `14.0.0`, since `geolocator_android` 5.x's Dart code needs a newer Flutter SDK than this project's pinned 3.24.0. `flutter analyze`: 0 issues; `flutter test`: 8/8 passing (up from 4). QR/Face check-in still need their own camera/ML plugins and aren't built yet.

## Admin Dashboard — Analytics Charts (Feature-Complete)

`DashboardPage`'s last placeholder: a 6-month attendance-trend line chart (`GET /analytics/attendance-trend`, Super Admin/HR/Manager) and a department-comparison ranking (`GET /analytics/department-comparison`, Super Admin/HR only). Both hand-rolled in SVG/CSS rather than a charting library, matching the no-dependency approach the sparkline component already used. With this, the admin dashboard is feature-complete against the original 20-phase roadmap.

## Admin Dashboard — Geofences & QR Codes Features

The last two Super-Admin/HR-only configuration screens: Geofences (office-location CRUD — branch name, lat/lng, radius) and QR Codes (per-location generate/revoke, rendering the real scannable image the backend already produces). Neither has a self-service half — an employee checks in *against* these via the mobile app, they never manage one — so both nav items are hidden from every other role rather than showing a page with nothing in it. With these two, every module from the original roadmap is a real screen; only the analytics trend-chart/department-comparison panel remains.

## Admin Dashboard — Notifications Feature

An inbox every role sees (unread filter, mark-read/mark-all-read) plus a Topbar bell badge polling the unread count every 30s, since there's no push/websocket channel to invalidate it on arrival. Super Admin/HR additionally get a "Send Broadcast" action, org-wide or scoped to one department.

## Admin Dashboard — Payroll Feature

Same shape as Leave and Shifts: a "My Payslips" section (list + PDF download) every role sees, above a Super Admin/HR-only area for salary structures and the payslip queue (filter, release, download) plus a "Run Payroll" action that starts a batch job and polls its status until it finishes. The PDF download is the one binary response in the whole API, fetched as a blob rather than JSON. Building this screen surfaced the real backend gap fixed in `v1.1.3` below.

## Backend v1.1.3 — Salary & Payslip Lists: Real Employee Names

The same class of gap as `v1.1.1`/`v1.1.2`, found this time while reading the Payroll module ahead of its admin-dashboard screen: `GET /salaries` and `GET /payslips` both had bare `employeeId`s, no names. Fixed with the same batch-lookup pattern — and, since this made three near-identical copies of that pattern, extracted it into a shared `resolveEmployeeRefs()` and switched Attendance's and Leave's existing code over to it too, rather than writing a fourth and fifth copy. 562 backend tests. Details: [backend/CHANGELOG.md#v113--salary--payslip-lists-real-employee-names-shared-resolveemployeerefs](backend/CHANGELOG.md#v113--salary--payslip-lists-real-employee-names-shared-resolveemployeerefs).

## Admin Dashboard — Shifts Feature

Same shape as Leave: a "My Shift" card every role sees, above a Super Admin/HR-only section for shift definitions (create/edit/deactivate) and single-employee assignment (reusing the `EmployeePicker` typeahead built for Employees). `POST /shifts/assign/bulk` exists on the API but isn't wired up in the UI yet — a documented scope cut, not an oversight.

## Admin Dashboard — Leave Feature

The one screen every role reaches, not just Super Admin/HR/Manager: self-service balance cards, apply/cancel, and request history sit above a Super Admin/HR/Manager-only review queue rendered in the same page, gated by role rather than a separate route (a plain `employee` gets the self-service section only; the Sidebar link itself isn't role-hidden the way Employees/Attendance are). Building this screen is what surfaced the real backend gap fixed in `v1.1.2` below.

## Admin Dashboard — Attendance Feature

The HR/Manager attendance report: date-range/department/status filters, pagination, direct corrections (Super Admin/HR, mandatory reason), and approve/reject on employee-initiated correction requests (Super Admin/HR/Manager). New shared `Modal` component. Building this screen is what surfaced the two real backend gaps fixed in `v1.1.0`/`v1.1.1` below — found by trying to build a real feature against the real API, not by auditing the backend in the abstract.

## Backend v1.1.2 — Leave Review Queue: Real Employee & Leave-Type Names

The same class of gap as `v1.1.1`, found this time while starting the admin dashboard's Leave screen: `GET /leaves` had bare `employeeId`/`leaveTypeId` strings, no names — exactly what a reviewer needs to decide on a request. Fixed with the same batch-lookup pattern. Also fixed a smaller inconsistency within the same file: `getMyBalance` already resolved leave-type names for balance rows, but `getMyLeaves` didn't for history rows — now it does too. 559 backend tests. Details: [backend/CHANGELOG.md#v112--leave-review-queue-real-employee--leave-type-names](backend/CHANGELOG.md#v112--leave-review-queue-real-employee--leave-type-names).

## Backend v1.1.1 — Attendance Report: Real Employee Names

Another real gap found while building the admin dashboard, this time for Attendance: `GET /attendance`'s rows had no employee name or code, just a bare id — useless for the HR/Manager report it's meant to be. Fixed with one batch lookup per page. Also caught and fixed a real test-isolation bug in the same file (a passing test that only passed because of mock state leaked from an earlier one). 557 backend tests. Details: [backend/CHANGELOG.md#v111--attendance-report-real-employee-names](backend/CHANGELOG.md#v111--attendance-report-real-employee-names).

## Admin Dashboard — Employees Feature

The first full CRUD vertical slice built on the design system: a list (search, department/status filters, pagination), detail view, create/edit forms, and deactivate — role-gated to match the backend's own RBAC exactly (Super Admin/HR/Manager can list, Super Admin/HR can write). The manager field is a real typeahead against `GET /employees/search`, not a truncated dropdown. Sidebar nav now hides `/employees` entirely for a role that can't use it, rather than showing it and letting the API 403. See [admin-dashboard/README.md#features](admin-dashboard/README.md#features).

## Backend v1.1.0 — Departments API

A real gap found while starting the admin dashboard's Employees screen: the backend referenced `Department` everywhere but had no way to ever create one — no route, no seed script. Added `GET/POST /departments` and `PATCH /departments/:id` (Super Admin/HR for writes, read open to all). 555 backend tests. Details: [backend/CHANGELOG.md#v110--departments-api](backend/CHANGELOG.md#v110--departments-api).

## Phase 20 — Documentation & Release — backend v1.0.0

All 20 planned backend phases complete; backend tagged `v1.0.0` (admin-dashboard and mobile-app deliberately stay at `0.1.0` — neither is feature-complete yet, see [Component Status](README.md#component-status)). Caught and fixed a real CI bug on its first live GitHub Actions run (a `docker-build` path resolution mistake), machine-verified the mobile app for the first time ever in this project (installed a real Flutter SDK: 1 lint nit found and fixed, tests already passing, platform folders scaffolded), and fixed a real gap in the Phase 0 API documentation (two implemented endpoints missing from the architecture doc). Details: [backend/CHANGELOG.md#phase-20--documentation--release--v100](backend/CHANGELOG.md#phase-20--documentation--release--v100).

## Phase 19 — Deployment Pipeline

Four GitHub Actions workflows: `ci-backend.yml` (lint/format/typecheck/test/build/Docker build — matches the original plan exactly), `ci-admin.yml` and `ci-mobile.yml` (both with one honest, documented deviation each — no admin-dashboard test suite exists yet, no mobile-app platform scaffolding exists yet), and `deploy.yml` (real but inert until a human connects an actual Render/Vercel account). Details: [backend/CHANGELOG.md#phase-19--deployment-pipeline](backend/CHANGELOG.md#phase-19--deployment-pipeline).

## Phase 18 — Expanded Test Coverage

Backend: ran a real coverage report to find genuine gaps rather than guessing, then closed the four that mattered — `escapeRegExp` (search-injection guard), `nextSequence` (the atomic counter), `email.service.ts` (never tested directly, only mocked away), and the central `errorHandler` (every unhandled failure funnels through it), all now at 100%. Controllers and infrastructure wrappers stay intentionally uncovered — documented why, not silently skipped. 536 backend tests, 87% statement coverage overall. Details: [backend/CHANGELOG.md#phase-18--expanded-test-coverage](backend/CHANGELOG.md#phase-18--expanded-test-coverage).

## Phase 17 — Performance

Backend: in-process 30s response caching for the two most-polled analytics reads (scope-keyed so no caller ever sees another's cached data), two new Attendance indexes for Phase 15's query patterns, a dependency-free `npm run perf:smoke` latency check, and a real bug fix — `/analytics/export/csv` had no row cap at all, unlike every other export in the codebase. 512 backend tests. Details: [backend/CHANGELOG.md#phase-17--performance](backend/CHANGELOG.md#phase-17--performance).

## Phase 16 — Security Hardening

Backend: account lockout after 5 failed logins (15-minute lock, tracked on the `User` document), `GET /audit-logs` (Super Admin only) exposing the audit trail attendance corrections already write to, and a documented `npm audit` review (one moderate, unreachable, upstream-only finding). Admin dashboard: fixed a login-error message that would have misled a locked-out user. 499 backend tests. Details: [backend/CHANGELOG.md#phase-16--security-hardening](backend/CHANGELOG.md#phase-16--security-hardening).

## Phase 15 — AI-Assisted Analytics

Backend: `GET /analytics/ai/late-risk`, `/absenteeism-trend`, `/anomalies` — real, explainable statistics (late-arrival rate + trend, least-squares forecast, leave-one-out z-scores, cosine similarity), explicitly not a trained ML model. Caught and fixed a genuine self-inclusive-z-score bug along the way (see backend changelog). 482 backend tests. Details: [backend/CHANGELOG.md#phase-15--ai-assisted-analytics](backend/CHANGELOG.md#phase-15--ai-assisted-analytics).

## Phase 14 — Reports & Analytics Dashboard

Backend: `GET /analytics/dashboard`, `/attendance-trend`, `/department-comparison`, `/export/csv` — real headcount/attendance/late/leave-rate aggregation over Employee/Attendance, team-scoped for Managers, org-wide (cross-department comparison, CSV export) for Super Admin/HR. No synthetic numbers anywhere. 458 backend tests. Details: [backend/CHANGELOG.md#phase-14--reports--analytics-dashboard](backend/CHANGELOG.md#phase-14--reports--analytics-dashboard).

## Phase 13 — Offline Mode (backend half)

Backend: `POST /attendance/sync` — idempotent, conflict-surfacing bulk apply for offline-queued check-in/check-out punches, sharing one implementation with the live check-in/check-out endpoints rather than duplicating the logic. 433 backend tests. **The mobile half (Hive queue, connectivity listener) is not built** — no Flutter SDK in this environment; the API it would call against is ready. Details: [backend/CHANGELOG.md#phase-13--offline-mode-backend-half](backend/CHANGELOG.md#phase-13--offline-mode-backend-half).

## Phase 12 — Notifications

Backend: in-app notification feed, HR broadcasts, device-token registration, real triggers wired into leave/payroll/shift/attendance events, honestly-placeholdered FCM push. 417 backend tests. Details: [backend/CHANGELOG.md#phase-12--notifications](backend/CHANGELOG.md#phase-12--notifications).

## Phase 11 — Payroll

Backend: salary CRUD, attendance-driven payslip computation, batch generation, PDF payslips. 385 backend tests. Details: [backend/CHANGELOG.md#phase-11--payroll](backend/CHANGELOG.md#phase-11--payroll).

## Phase 10 — Shift Management

Backend: shift definitions, assignment, real integration with attendance's late/overtime math. 329 backend tests. Details: [backend/CHANGELOG.md#phase-10--shift-management](backend/CHANGELOG.md#phase-10--shift-management).

## Phase 9 — Leave Management

Backend: apply/approve/reject, business-day-aware balance accounting, holiday calendar. 284 backend tests. Details: [backend/CHANGELOG.md#phase-9--leave-management](backend/CHANGELOG.md#phase-9--leave-management).

## Phase 8 — Face Recognition

Backend: registration + cosine-similarity verification wired into attendance. One labeled placeholder (photo→embedding, confirmed with the project owner before building — no ML runtime in this environment). 218 backend tests. Details: [backend/CHANGELOG.md#phase-8--face-recognition](backend/CHANGELOG.md#phase-8--face-recognition).

## Phase 7 — QR Attendance

Backend: signed, time-boxed QR codes for check-in. 180 backend tests. Details: [backend/CHANGELOG.md#phase-7--qr-attendance](backend/CHANGELOG.md#phase-7--qr-attendance).

## Phase 6 — GPS Attendance

Backend: geofenced check-in via indexed `$geoNear` queries. 155 backend tests. Details: [backend/CHANGELOG.md#phase-6--gps-attendance](backend/CHANGELOG.md#phase-6--gps-attendance).

## Phase 5 — Attendance

Backend: check-in/out, breaks, working-hours computation, reporting/export, correction workflow. 137 backend tests. Details: [backend/CHANGELOG.md#phase-5--attendance](backend/CHANGELOG.md#phase-5--attendance).

## Phase 4 — Employee Management

Backend: employee CRUD, profile/document upload to Cloudinary. 98 backend tests. Details: [backend/CHANGELOG.md#phase-4--employee-management](backend/CHANGELOG.md#phase-4--employee-management).

## Phase 3 — Authentication

Backend: JWT auth, rotating refresh tokens, RBAC. A real bug caught by tests (token collision within the same second, fixed with a random `jti`). 66 backend tests. Details: [backend/CHANGELOG.md#phase-3--authentication](backend/CHANGELOG.md#phase-3--authentication).

## Phase 2 — Database Design

Backend: all 18 collections modeled in Mongoose with relationships, indexes, and schema-level validation. 31 backend tests. Details: [backend/CHANGELOG.md#phase-2--database-design](backend/CHANGELOG.md#phase-2--database-design).

## Phase 1 — Project Setup

- **backend/**: Express + TypeScript scaffold, env validation, MongoDB connection, logging, health checks, security middleware, Docker + docker-compose (API/Mongo/Redis), Jest + Supertest — all passing `lint`/`typecheck`/`build`/`test`.
- **admin-dashboard/**: Vite + React 19 + TypeScript, Tailwind v4, React Router v7 with an auth guard, an Axios instance with refresh-on-401, TanStack Query, a Zustand session store, and a working login → dashboard flow — passing `lint`/`typecheck`/`format:check`/`build`.
- **mobile-app/**: Flutter Clean Architecture (data/domain/presentation), Riverpod DI, a Dio client with refresh-on-401, GoRouter with an auth-aware redirect guard, and a full auth vertical slice (login/logout/session-restore) — hand-written but **not yet verified**, since this environment has no Flutter SDK (`flutter analyze`/`test` haven't run; see [mobile-app/README.md](mobile-app/README.md) for the one-time `flutter create .` step that finishes setup).

## Phase 0 — Architecture

Full system design, no code: system architecture, ER diagram, database schema, API contract, tech-stack rationale, auth flow, sequence diagrams, deployment topology. See [docs/architecture/](docs/architecture/).
