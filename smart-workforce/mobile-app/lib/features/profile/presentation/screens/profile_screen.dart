import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_providers.dart';
import 'package:ai_management_system/features/face/presentation/providers/face_registration_providers.dart';
import 'package:ai_management_system/features/profile/presentation/providers/employee_profile_provider.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

final _dateFormat = DateFormat('d MMM yyyy');

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final profileAsync = ref.watch(employeeProfileProvider);
    final faceState = ref.watch(faceRegistrationControllerProvider);
    final employee = authState.employee;

    final initials = employee?.initials ?? (authState.user?.email.substring(0, 1).toUpperCase() ?? '?');
    final name = employee?.fullName ?? authState.user?.email ?? 'Employee';

    return Scaffold(
      backgroundColor: WPColors.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 20, 18, 132),
          children: [
            WPCard(
              radius: WPRadius.cardLg,
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  WPIconTile(label: initials, bg: WPColors.accentLight, fg: WPColors.accent, size: 74),
                  const SizedBox(height: 12),
                  Text(name, style: WPText.sans(size: 19, weight: FontWeight.w800, color: WPColors.text)),
                  const SizedBox(height: 3),
                  profileAsync.when(
                    data: (p) => Text(
                      p != null ? '${p.designation} · ${p.departmentName}' : authState.user?.role ?? '',
                      style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: WPColors.textDim),
                    ),
                    loading: () => Text('Loading…',
                        style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: WPColors.textDim),),
                    error: (_, __) => Text(authState.user?.role ?? '',
                        style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: WPColors.textDim),),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: WPColors.bg, borderRadius: BorderRadius.circular(9)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(employee?.employeeCode ?? '—',
                            style: WPText.mono(size: 11, color: const Color(0xFF5A5A6C)),),
                        const SizedBox(width: 8),
                        Container(width: 1, height: 11, color: const Color(0xFFD8D8E2)),
                        const SizedBox(width: 8),
                        profileAsync.when(
                          data: (p) => Text(
                            (p?.employmentStatus ?? 'active').replaceAll('_', ' '),
                            style: WPText.sans(size: 11, weight: FontWeight.w700, color: WPColors.successText),
                          ),
                          loading: () => const SizedBox(width: 40, height: 11),
                          error: (_, __) => const SizedBox.shrink(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            WPCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  _ProfileRow(
                    glyph: 'E',
                    label: 'Employee Details',
                    onTap: () => _showEmployeeDetails(context, ref),
                  ),
                  _ProfileRow(
                    glyph: 'F',
                    label: 'Face Registration',
                    badge: faceState.status?.isRegistered == true ? 'Enrolled' : null,
                    onTap: () => context.push(faceRegistrationPath),
                  ),
                  _ProfileRow(
                    glyph: 'N',
                    label: 'Notifications',
                    onTap: () => context.push(notificationsPath),
                  ),
                  _ProfileRow(
                    glyph: 'S',
                    label: 'My Shift',
                    onTap: () => context.push(shiftPath),
                    isLast: true,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            InkWell(
              onTap: () => _confirmLogout(context, ref),
              borderRadius: BorderRadius.circular(18),
              child: Container(
                padding: const EdgeInsets.all(15),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: WPColors.danger.withOpacity(0.25)),
                ),
                child: Text('Log out',
                    style: WPText.sans(size: 13.5, weight: FontWeight.w700, color: WPColors.danger),),
              ),
            ),
            const SizedBox(height: 14),
            Center(
              child: Text('Office App · v2.4.1',
                  style: WPText.mono(size: 10.5, color: WPColors.textFaint),),
            ),
          ],
        ),
      ),
    );
  }

  void _showEmployeeDetails(BuildContext context, WidgetRef ref) {
    final profile = ref.read(employeeProfileProvider).valueOrNull;
    final authState = ref.read(authControllerProvider);
    final employee = authState.employee;
    // The full profile (with a separate first/last name) may still be
    // loading when this opens — fall back to the whole cached employee name
    // as one unit rather than only ever grabbing its first word while
    // profile.lastName silently defaults to empty, which used to drop the
    // last name entirely whenever the sheet was opened before profile
    // finished loading.
    final fullName = profile != null
        ? '${profile.firstName} ${profile.lastName}'.trim()
        : employee?.fullName ?? authState.user?.email ?? '—';

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: WPColors.bg,
      // isScrollControlled lets the sheet grow past the default ~half-screen
      // cap, and the SingleChildScrollView below means content that still
      // doesn't fit (small phones, a future added field, landscape) scrolls
      // internally instead of being silently clipped by the sheet's own
      // rounded-corner clip — that clipping, with no scroll fallback at all,
      // is what was cutting off the bottom of this list before.
      isScrollControlled: true,
      // showModalBottomSheet attaches to the nearest Navigator by default,
      // which inside a StatefulShellRoute branch is the branch's own nested
      // Navigator — that sits *below* WPShell's floating bottom-nav pill in
      // the widget tree, so without this the pill visually overlapped the
      // sheet's last row regardless of how much padding/scroll room the
      // sheet itself had. useRootNavigator puts it above the entire app
      // shell, pill included, where a modal actually belongs.
      useRootNavigator: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(sheetContext).size.height * 0.85),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 34),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Employee Details', style: WPText.sans(size: 17, weight: FontWeight.w800)),
                const SizedBox(height: 16),
                WPCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Column(
                    children: [
                      _DetailRow('Name', fullName.isEmpty ? '—' : fullName),
                      _DetailRow('Employee ID', employee?.employeeCode ?? '—'),
                      _DetailRow('Designation', profile?.designation ?? '—'),
                      _DetailRow('Department', profile?.departmentName ?? '—'),
                      _DetailRow('Email', profile?.email ?? authState.user?.email ?? '—'),
                      _DetailRow('Phone', profile?.phone ?? '—'),
                      if (profile?.managerName != null) _DetailRow('Reporting to', profile!.managerName!),
                      _DetailRow(
                        'Joined',
                        profile != null ? _dateFormat.format(profile.dateOfJoining) : '—',
                        isLast: true,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Log out of Office App?',
                  style: WPText.sans(size: 18, weight: FontWeight.w800),),
              const SizedBox(height: 8),
              Text(
                "You'll need to sign in again to check in or view your data.",
                style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: WPColors.textDim, height: 1.4),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => Navigator.of(dialogContext).pop(),
                      borderRadius: BorderRadius.circular(15),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: WPColors.bg,
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: Text('Stay', style: WPText.sans(size: 13.5, weight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.of(dialogContext).pop();
                        ref.read(authControllerProvider.notifier).logout();
                      },
                      borderRadius: BorderRadius.circular(15),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: WPColors.danger,
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: Text('Log out',
                            style: WPText.sans(size: 13.5, weight: FontWeight.w700, color: Colors.white),),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  final String glyph;
  final String label;
  final String? badge;
  final VoidCallback onTap;
  final bool isLast;

  const _ProfileRow({
    required this.glyph,
    required this.label,
    required this.onTap,
    this.badge,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
        decoration: BoxDecoration(
          border: isLast
              ? null
              : const Border(bottom: BorderSide(color: WPColors.borderLight)),
        ),
        child: Row(
          children: [
            WPIconTile(label: glyph, bg: WPColors.bg, fg: WPColors.accent, size: 32),
            const SizedBox(width: 12),
            Expanded(
              child: Text(label, style: WPText.sans(size: 13.5, weight: FontWeight.w600)),
            ),
            if (badge != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: WPColors.successBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(badge!,
                    style: WPText.sans(size: 10.5, weight: FontWeight.w700, color: WPColors.successText),),
              ),
              const SizedBox(width: 8),
            ],
            const Icon(Icons.chevron_right, size: 18, color: WPColors.textFainter),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String k;
  final String v;
  final bool isLast;
  const _DetailRow(this.k, this.v, {this.isLast = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: isLast ? null : const Border(bottom: BorderSide(color: WPColors.borderLight)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: WPText.sans(size: 12.5, weight: FontWeight.w600, color: WPColors.textDim)),
          Text(v, style: WPText.sans(size: 12.5, weight: FontWeight.w700)),
        ],
      ),
    );
  }
}
