import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/shared/theme/app_theme.dart';

/// Material 3's default Android overscroll effect ("stretch") visually
/// distorts the whole page when you pull past an edge — on a short list
/// (e.g. Home, when few cards are loaded) that reads as the page
/// endlessly rubber-banding rather than settling, which people describe
/// as "infinite scrolling". This reverts to the classic bounded glow
/// (overriding buildOverscrollIndicator directly, not the newer
/// androidOverscrollIndicator getter — not available on this Flutter SDK).
class _AppScrollBehavior extends MaterialScrollBehavior {
  const _AppScrollBehavior();

  @override
  Widget buildOverscrollIndicator(BuildContext context, Widget child, ScrollableDetails details) {
    switch (getPlatform(context)) {
      case TargetPlatform.android:
      case TargetPlatform.fuchsia:
        return GlowingOverscrollIndicator(
          axisDirection: details.direction,
          color: Theme.of(context).colorScheme.secondary,
          child: child,
        );
      case TargetPlatform.iOS:
      case TargetPlatform.linux:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
        return child;
    }
  }
}

class AiManagementSystemApp extends ConsumerWidget {
  const AiManagementSystemApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Office App',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      scrollBehavior: const _AppScrollBehavior(),
      routerConfig: router,
    );
  }
}
