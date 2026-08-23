import 'package:flutter/material.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

/// Purely cosmetic — session restoration (CheckSessionUseCase, driven from
/// AuthController._restoreSession) runs independently in the background the
/// entire time this is on screen, and the router forces every route back to
/// /splash while authState.isBootstrapping is true (see routerProvider's
/// redirect). So this widget never needs to know how restoration is going:
/// once it finishes, the router swaps straight to Home or Login on its own,
/// whether that happens before or after this animation settles. That's what
/// gives "Splash -> restore session -> Home" instead of a Login flash, and
/// why this never needs an artificial minimum-delay gate of its own.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _logoOpacity;
  late final Animation<double> _logoScale;
  late final Animation<double> _titleOpacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));
    _logoOpacity = CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.55, curve: Curves.easeOut));
    _logoScale = Tween<double>(begin: 0.86, end: 1.0)
        .animate(CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.55, curve: Curves.easeOutCubic)));
    _titleOpacity = CurvedAnimation(parent: _controller, curve: const Interval(0.35, 0.85, curve: Curves.easeOut));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WPColors.bg,
      body: Center(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Opacity(
                opacity: _logoOpacity.value,
                child: Transform.scale(
                  scale: _logoScale.value,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Image.asset('assets/images/logo.png', width: 96, height: 96),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Opacity(
                opacity: _titleOpacity.value,
                child: Text(
                  'Office App',
                  style: WPText.sans(size: 22, weight: FontWeight.w800, color: WPColors.text),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
