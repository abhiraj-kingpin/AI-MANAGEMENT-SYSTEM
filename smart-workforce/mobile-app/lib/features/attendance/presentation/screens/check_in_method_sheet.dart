import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

/// "How do you want to check in?" bottom sheet — Face is highlighted as
/// recommended (fastest, matches the design), QR is the other real option.
/// GPS was intentionally removed as a standalone method earlier this
/// project (folded into Face check-in's own location capture instead —
/// see attendance_repository_impl.dart), so it isn't offered here.
Future<void> showCheckInMethodSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.white,
    // Without this, the sheet attaches to the Home tab's own nested
    // Navigator (inside StatefulShellRoute) rather than the app's root one,
    // so it renders *below* WPShell's floating bottom-nav pill instead of
    // above it — the pill visually covered (and blocked taps on) the QR
    // option. Same fix as ProfileScreen's Employee Details sheet.
    useRootNavigator: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (sheetContext) => Padding(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 34),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(color: const Color(0xFFE2E2EA), borderRadius: BorderRadius.circular(3)),
            ),
          ),
          const SizedBox(height: 16),
          Text('How do you want to check in?', style: WPText.sans(size: 18, weight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(
            'Face check-in also records your location, in one step.',
            style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: WPColors.textDim),
          ),
          const SizedBox(height: 16),
          _MethodOption(
            title: 'Face check',
            subtitle: 'Fastest · verifies identity and location together',
            icon: Icons.face_retouching_natural_outlined,
            recommended: true,
            onTap: () {
              Navigator.of(sheetContext).pop();
              context.push(faceCheckInPath);
            },
          ),
          const SizedBox(height: 10),
          _MethodOption(
            title: 'Scan office QR',
            subtitle: 'Posted at reception and on your floor',
            icon: Icons.qr_code_scanner_outlined,
            onTap: () {
              Navigator.of(sheetContext).pop();
              context.push(qrCheckInPath);
            },
          ),
        ],
      ),
    ),
  );
}

class _MethodOption extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool recommended;
  final VoidCallback onTap;

  const _MethodOption({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
    this.recommended = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: recommended ? const Color(0xFFF8F6FF) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: recommended ? WPColors.accent : WPColors.borderMed,
            width: recommended ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(color: WPColors.accentLight, borderRadius: BorderRadius.circular(12)),
              alignment: Alignment.center,
              child: Icon(icon, size: 19, color: WPColors.accent),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: WPText.sans(size: 14, weight: FontWeight.w700)),
                  const SizedBox(height: 1),
                  Text(subtitle, style: WPText.sans(size: 11.5, weight: FontWeight.w500, color: WPColors.textDim)),
                ],
              ),
            ),
            if (recommended)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: WPColors.accentLight, borderRadius: BorderRadius.circular(7)),
                child: Text('RECOMMENDED',
                    style: WPText.sans(size: 9.5, weight: FontWeight.w800, color: WPColors.accent),),
              ),
          ],
        ),
      ),
    );
  }
}
