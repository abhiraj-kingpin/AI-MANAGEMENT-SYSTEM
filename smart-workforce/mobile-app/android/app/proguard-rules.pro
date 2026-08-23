# App-specific R8/ProGuard keep rules for release minification
# (minifyEnabled/shrinkResources, see app/build.gradle). Most Flutter
# plugins ship their own consumer-rules.pro inside their AARs, which Gradle
# applies automatically without needing anything here — these are only for
# the plugins in this project that are reflection/JNI-heavy enough that
# stripping/renaming their classes has historically broken things at
# runtime in *release* builds specifically (never seen in debug, since R8
# only runs for release) if left unprotected.

# ONNX Runtime (on-device face-embedding inference, see
# features/face/domain/embedding/mobile_face_net_embedding_generator.dart)
# bridges to native code via JNI, which calls into these classes by name —
# renaming/stripping them silently breaks inference without a build-time
# error, only a runtime one.
-keep class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# Google ML Kit face detection (used for the liveness/face-alignment check
# before check-in, see core/services + features/face/) — its native
# bindings similarly reflect into its Java API classes.
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# CameraX (transitive via the camera/mobile_scanner plugins) usually ships
# its own consumer rules, but its @Keep-annotated internals have a history
# of R8 edge cases across versions — kept explicitly as a safety net rather
# than relying solely on the bundled AAR rules.
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**
