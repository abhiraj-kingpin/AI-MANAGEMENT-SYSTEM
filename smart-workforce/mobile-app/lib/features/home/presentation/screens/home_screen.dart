import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/features/attendance/presentation/screens/check_in_method_sheet.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_providers.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_providers.dart';
import 'package:ai_management_system/features/notifications/presentation/providers/notification_providers.dart';
import 'package:ai_management_system/features/payslips/presentation/providers/payslip_providers.dart';
import 'package:ai_management_system/features/shifts/presentation/providers/shift_providers.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

final _timeFormat = DateFormat.jm();
final _longDateFormat = DateFormat('EEEE, MMMM d');

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _showTip = true;

  @override
  Widget build(BuildContext context) {
    ref.watch(syncServiceProvider);

    final authState = ref.watch(authControllerProvider);
    final attendanceState = ref.watch(attendanceControllerProvider);
    final leaveState = ref.watch(leaveControllerProvider);
    final shiftState = ref.watch(shiftControllerProvider);
    final payslipState = ref.watch(payslipControllerProvider);
    final notifState = ref.watch(notificationControllerProvider);

    final employee = authState.employee;
    final today = attendanceState.today;
    final isCheckedIn = today != null && today.isCheckedIn;
    final isDoneForToday = today != null && today.checkOutAt != null;

    final status = isCheckedIn ? 'On duty' : isDoneForToday ? 'Shift closed' : 'Not checked in';
    final (statusBg, statusFg) = isCheckedIn
        ? (WPColors.successBg, WPColors.successText)
        : isDoneForToday
            ? (WPColors.infoBg, WPColors.infoText)
            : (WPColors.bg, WPColors.textDim);

    return Scaffold(
      backgroundColor: WPColors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await ref.read(attendanceControllerProvider.notifier).loadHistory();
            await ref.read(leaveControllerProvider.notifier).load();
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 132),
            children: [
              Row(
                children: [
                  WPIconTile(
                    label: employee?.initials ?? '?',
                    bg: WPColors.accentLight,
                    fg: WPColors.accent,
                    size: 44,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          employee?.fullName ?? authState.user?.email ?? '',
                          style: WPText.sans(size: 16, weight: FontWeight.w700),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          employee != null ? '${employee.employeeCode} · ${authState.user?.role ?? ''}' : '',
                          style: WPText.mono(size: 11, color: WPColors.textDim),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  InkWell(
                    onTap: () => context.push(notificationsPath),
                    borderRadius: BorderRadius.circular(13),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(13),
                        border: Border.all(color: WPColors.border),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const Icon(Icons.notifications_outlined, size: 18, color: WPColors.text),
                          if (notifState.unreadCount > 0)
                            Positioned(
                              top: 8,
                              right: 9,
                              child: Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: WPColors.danger,
                                  shape: BoxShape.circle,
                                  border: Border.fromBorderSide(BorderSide(color: Colors.white, width: 1.5)),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              if (_showTip) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                  decoration: BoxDecoration(color: WPColors.accentLight, borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      const Icon(Icons.lightbulb_outline, size: 16, color: WPColors.accent),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Face check-in now records your location too — one tap covers both.',
                          style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: WPColors.accentText, height: 1.35),
                        ),
                      ),
                      InkWell(
                        onTap: () => setState(() => _showTip = false),
                        child: const Icon(Icons.close, size: 14, color: WPColors.accent),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 14),
              WPCard(
                radius: WPRadius.cardLg,
                shadow: [BoxShadow(color: const Color(0xFF141432).withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 2))],
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text("TODAY'S ATTENDANCE",
                                  style: WPText.sans(size: 11, weight: FontWeight.w600, color: WPColors.textDim, letterSpacing: 0.6),),
                              const SizedBox(height: 3),
                              Text(_longDateFormat.format(DateTime.now()),
                                  style: WPText.sans(size: 15, weight: FontWeight.w700),),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                          decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(9)),
                          child: Text(status, style: WPText.sans(size: 11.5, weight: FontWeight.w700, color: statusFg)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: _StatTile(
                            icon: Icons.arrow_upward_rounded,
                            iconBg: WPColors.warningBg,
                            iconFg: WPColors.warning,
                            value: today?.checkInAt != null ? _timeFormat.format(today!.checkInAt!.toLocal()) : '--:--',
                            label: 'Check-In',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _StatTile(
                            icon: Icons.arrow_downward_rounded,
                            iconBg: WPColors.dangerBg,
                            iconFg: WPColors.danger,
                            value: today?.checkOutAt != null ? _timeFormat.format(today!.checkOutAt!.toLocal()) : '--:--',
                            label: 'Check-Out',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _StatTile(
                            icon: Icons.schedule,
                            iconBg: WPColors.infoBg,
                            iconFg: WPColors.info,
                            value: today != null ? _hoursShort(today.workingMinutes) : '--:--',
                            label: 'Working Hours',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    WPButton(
                      label: isDoneForToday
                          ? 'Shift closed for today'
                          : isCheckedIn
                              ? 'Check Out'
                              : 'Check In',
                      variant: isCheckedIn
                          ? WPButtonVariant.dark
                          : isDoneForToday
                              ? WPButtonVariant.ghost
                              : WPButtonVariant.purple,
                      isLoading: attendanceState.isActionInProgress,
                      onPressed: isDoneForToday
                          ? null
                          : isCheckedIn
                              ? () => ref.read(attendanceControllerProvider.notifier).checkOut()
                              : () => showCheckInMethodSheet(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              // IntrinsicHeight is required here: this Row uses
              // CrossAxisAlignment.stretch so the two cards match heights,
              // but the Row sits directly inside a ListView, which gives it
              // an unbounded height constraint (list items can be any
              // height). Stretch needs a real number to stretch children
              // *to* — without IntrinsicHeight to resolve that first, the
              // whole ListView's layout silently corrupts and every item in
              // it (not just this Row) renders as blank, with no exception
              // thrown. See the Home screen "renders totally blank" bug.
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: WPCard(
                        onTap: () => context.push(leavePath),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('LEAVE BALANCE',
                                style: WPText.sans(size: 10.5, weight: FontWeight.w700, color: WPColors.textDim, letterSpacing: 0.5),),
                            const SizedBox(height: 8),
                            Text(
                              leaveState.balances.isNotEmpty
                                  ? '${leaveState.balances.fold<num>(0, (a, b) => a + b.remaining)}'
                                  : '—',
                              style: WPText.sans(size: 26, weight: FontWeight.w800),
                            ),
                            Text('days left', style: WPText.sans(size: 11, weight: FontWeight.w600, color: WPColors.textDim)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: WPCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("TODAY'S SHIFT",
                                style: WPText.sans(size: 10.5, weight: FontWeight.w700, color: WPColors.textDim, letterSpacing: 0.5),),
                            const SizedBox(height: 8),
                            Text(
                              shiftState.assignment != null
                                  ? '${shiftState.assignment!.shift.startTime}–${shiftState.assignment!.shift.endTime}'
                                  : 'Standard',
                              style: WPText.sans(size: 16, weight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: WPColors.successBg, borderRadius: BorderRadius.circular(8)),
                              child: Text(
                                shiftState.assignment?.shift.name ?? 'Default schedule',
                                style: WPText.sans(size: 10, weight: FontWeight.w700, color: WPColors.successText),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              WPCard(
                color: WPColors.dark,
                onTap: () => context.push(payslipsPath),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('LATEST PAYSLIP',
                              style: WPText.sans(size: 10.5, weight: FontWeight.w700, color: Colors.white.withOpacity(0.5), letterSpacing: 0.5),),
                          const SizedBox(height: 6),
                          Text(
                            payslipState.payslips.isNotEmpty
                                ? '\$${payslipState.payslips.first.netPay.toStringAsFixed(2)}'
                                : '—',
                            style: WPText.sans(size: 22, weight: FontWeight.w800, color: Colors.white),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            payslipState.payslips.isNotEmpty ? payslipState.payslips.first.month : 'No payslips yet',
                            style: WPText.sans(size: 11, weight: FontWeight.w500, color: Colors.white.withOpacity(0.55)),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Notifications', style: WPText.sans(size: 14, weight: FontWeight.w700)),
                  InkWell(
                    onTap: () => context.push(notificationsPath),
                    child: Text('See all', style: WPText.sans(size: 12, weight: FontWeight.w600, color: WPColors.accent)),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              WPCard(
                padding: EdgeInsets.zero,
                child: notifState.notifications.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text('No notifications yet.',
                            style: WPText.sans(size: 12.5, color: WPColors.textDim), textAlign: TextAlign.center,),
                      )
                    : Column(
                        children: notifState.notifications.take(2).map((n) {
                          final isLast = n == notifState.notifications.take(2).last;
                          return Container(
                            padding: const EdgeInsets.all(13),
                            decoration: BoxDecoration(
                              border: isLast ? null : const Border(bottom: BorderSide(color: WPColors.borderLight)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  margin: const EdgeInsets.only(top: 5),
                                  decoration: BoxDecoration(
                                    color: n.isRead ? WPColors.textFainter : WPColors.accent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 11),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(n.title, style: WPText.sans(size: 13, weight: FontWeight.w700)),
                                      const SizedBox(height: 2),
                                      Text(n.body,
                                          style: WPText.sans(size: 11.5, weight: FontWeight.w500, color: WPColors.textDim),
                                          maxLines: 2, overflow: TextOverflow.ellipsis,),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }


  String _hoursShort(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '${h}h ${m.toString().padLeft(2, '0')}m';
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final Color iconBg;
  final Color iconFg;
  final String value;
  final String label;

  const _StatTile({
    required this.icon,
    required this.iconBg,
    required this.iconFg,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
      decoration: BoxDecoration(
        color: WPColors.surfaceMuted,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: WPColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 13, color: iconFg),
          ),
          const SizedBox(height: 9),
          Text(value, style: WPText.mono(size: 14, weight: FontWeight.w500)),
          const SizedBox(height: 2),
          Text(label, style: WPText.sans(size: 10, weight: FontWeight.w600, color: WPColors.textDim)),
        ],
      ),
    );
  }
}
