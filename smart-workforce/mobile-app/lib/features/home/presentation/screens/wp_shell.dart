import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

/// The floating pill bottom nav + 5-tab shell from the Work Pulse AI
/// design — a `StatefulShellRoute` wrapper so each tab keeps its own
/// scroll position/state when switching, same as the design's single
/// persistent device frame with tab-swapped content.
class WPShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const WPShell({required this.navigationShell, super.key});

  static const _tabs = [
    (_WPIcons.home, 'Home'),
    (_WPIcons.attendance, 'Presence'),
    (_WPIcons.leave, 'Leave'),
    (_WPIcons.pay, 'Pay'),
    (_WPIcons.profile, 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WPColors.bg,
      body: Stack(
        children: [
          navigationShell,
          Positioned(
            left: 0,
            right: 0,
            bottom: 26,
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xF0141420),
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0A0A1E).withOpacity(0.28),
                      blurRadius: 30,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (var i = 0; i < _tabs.length; i++) ...[
                      if (i > 0) const SizedBox(width: 6),
                      _NavItem(
                        icon: _tabs[i].$1,
                        label: _tabs[i].$2,
                        active: navigationShell.currentIndex == i,
                        onTap: () => navigationShell.goBranch(
                          i,
                          initialLocation: i == navigationShell.currentIndex,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = active ? Colors.white : Colors.white.withOpacity(0.62);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      // AnimatedSize, not AnimatedContainer: the inactive state is a fixed
      // 44px circle and the active state auto-sizes to its label (width:
      // null), and those two widths were animated by tweening this widget's
      // own BoxConstraints — which can't interpolate a finite width against
      // an unbounded one. That threw "Cannot interpolate between finite
      // constraints and unbounded constraints" on every tab switch and,
      // during that broken frame, the nav pill's Row measured wrong and
      // overflowed the whole bar to the right (the black/yellow-striped red
      // screen). AnimatedSize instead measures the child's actual (always
      // finite) Size each frame and tweens that, sidestepping the
      // BoxConstraints-lerp path entirely.
      child: AnimatedSize(
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOut,
        child: Container(
          height: 44,
          padding: EdgeInsets.symmetric(horizontal: active ? 14 : 0),
          width: active ? null : 44,
          decoration: BoxDecoration(
            color: active ? WPColors.accent : Colors.white.withOpacity(0.07),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 19, color: color),
              if (active) ...[
                const SizedBox(width: 7),
                Text(label, style: WPText.sans(size: 12.5, weight: FontWeight.w700, color: Colors.white)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Line-icon set matching the design's inline SVGs (home/box/leave-roof/
/// payslip/profile) — Material's closest equivalents rather than
/// re-vendoring raw SVG paths for a 1:1 trace.
class _WPIcons {
  _WPIcons._();
  static const home = Icons.home_outlined;
  static const attendance = Icons.badge_outlined;
  static const leave = Icons.holiday_village_outlined;
  static const pay = Icons.receipt_long_outlined;
  static const profile = Icons.person_outline;
}
