import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_balance_entity.dart';
import 'package:ai_management_system/features/leave/domain/entities/leave_entity.dart';
import 'package:ai_management_system/features/leave/presentation/providers/leave_providers.dart';
import 'package:ai_management_system/features/leave/presentation/screens/apply_leave_sheet.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

final _dateFormat = DateFormat.MMMd();

// Cycled by index so any number of org-configured leave types gets a
// distinct, stable color without a per-type field on the backend model.
const _palette = [
  (WPColors.accent, WPColors.accentLight),
  (WPColors.info, WPColors.infoBg),
  (WPColors.warning, WPColors.warningBg),
  (WPColors.success, WPColors.successBg),
];

class LeaveScreen extends ConsumerWidget {
  const LeaveScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(leaveControllerProvider);
    final controller = ref.read(leaveControllerProvider.notifier);

    return Scaffold(
      backgroundColor: WPColors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: controller.load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 132),
            children: [
              Text('Leave', style: WPText.sans(size: 22, weight: FontWeight.w800)),
              const SizedBox(height: 3),
              Text('Track your balance and manage requests',
                  style: WPText.sans(size: 12.5, weight: FontWeight.w500, color: WPColors.textDim),),
              const SizedBox(height: 18),
              if (state.errorMessage != null) ...[
                Text(state.errorMessage!, style: WPText.sans(size: 12.5, color: WPColors.danger)),
                const SizedBox(height: 12),
              ],
              if (!state.isLoading && state.leaveTypes.isEmpty)
                WPCard(
                  child: Text(
                    "No leave types are configured yet, so there's nothing to apply for. Ask HR to set these up first.",
                    style: WPText.sans(size: 12.5, color: WPColors.textDim, height: 1.4),
                  ),
                )
              else if (state.balances.isNotEmpty) ...[
                SizedBox(
                  height: 138,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: state.balances.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (context, i) {
                      final (fg, bg) = _palette[i % _palette.length];
                      return _BalanceRing(balance: state.balances[i], fg: fg, bg: bg);
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],
              InkWell(
                onTap: state.leaveTypes.isEmpty
                    ? null
                    : () => showModalBottomSheet<void>(
                          context: context,
                          isScrollControlled: true,
                          // Same nested-Navigator fix as the other sheets in
                          // this app — without it this renders below
                          // WPShell's floating bottom-nav pill instead of
                          // above the whole app shell.
                          useRootNavigator: true,
                          backgroundColor: Colors.white,
                          shape: const RoundedRectangleBorder(
                            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                          ),
                          builder: (_) => ApplyLeaveSheet(leaveTypes: state.leaveTypes),
                        ),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: state.leaveTypes.isEmpty ? WPColors.textFainter : WPColors.accent,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: state.leaveTypes.isEmpty
                        ? null
                        : [BoxShadow(color: WPColors.accent.withOpacity(0.28), blurRadius: 18, offset: const Offset(0, 8))],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(13)),
                        alignment: Alignment.center,
                        child: const Icon(Icons.add, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 13),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Apply for leave', style: WPText.sans(size: 15, weight: FontWeight.w800, color: Colors.white)),
                            const SizedBox(height: 2),
                            Text('Pick your dates and submit for approval',
                                style: WPText.sans(size: 11.5, weight: FontWeight.w500, color: Colors.white.withOpacity(0.78)),),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: Colors.white, size: 20),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 22),
              Text('MY REQUESTS',
                  style: WPText.sans(size: 11, weight: FontWeight.w700, color: WPColors.textDim, letterSpacing: 0.6),),
              const SizedBox(height: 10),
              if (state.isLoading && state.leaves.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (state.leaves.isEmpty)
                WPCard(
                  child: Center(
                    child: Text('No leave requests yet.', style: WPText.sans(size: 12.5, color: WPColors.textDim)),
                  ),
                )
              else
                Column(
                  children: [
                    for (int i = 0; i < state.leaves.length; i++) ...[
                      _LeaveCard(
                        leave: state.leaves[i],
                        color: _palette[i % _palette.length].$1,
                        onCancel: state.leaves[i].isCancellable ? () => controller.cancelLeave(state.leaves[i].id) : null,
                      ),
                      if (i != state.leaves.length - 1) const SizedBox(height: 10),
                    ],
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BalanceRing extends StatelessWidget {
  final LeaveBalanceEntity balance;
  final Color fg;
  final Color bg;
  const _BalanceRing({required this.balance, required this.fg, required this.bg});

  @override
  Widget build(BuildContext context) {
    final total = balance.allocated + balance.carriedForward;
    final pct = total <= 0 ? 0.0 : (balance.remaining / total).clamp(0.0, 1.0).toDouble();

    return SizedBox(
      width: 108,
      child: WPCard(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(
          children: [
            SizedBox(
              width: 66,
              height: 66,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 66,
                    height: 66,
                    child: CustomPaint(painter: _MiniRingPainter(pct: pct, color: fg, track: bg)),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('${balance.remaining}', style: WPText.mono(size: 16, weight: FontWeight.w600, color: WPColors.text)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              balance.leaveTypeName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: WPText.sans(size: 10.5, weight: FontWeight.w700),
            ),
            Text('of $total', style: WPText.sans(size: 9.5, weight: FontWeight.w500, color: WPColors.textDim)),
          ],
        ),
      ),
    );
  }
}

class _MiniRingPainter extends CustomPainter {
  final double pct;
  final Color color;
  final Color track;
  const _MiniRingPainter({required this.pct, required this.color, required this.track});

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2 - 5;
    final trackPaint = Paint()
      ..color = track
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round;
    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, trackPaint);
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -1.5708, 6.2832 * pct, false, fillPaint);
  }

  @override
  bool shouldRepaint(covariant _MiniRingPainter oldDelegate) =>
      oldDelegate.pct != pct || oldDelegate.color != color;
}

class _LeaveCard extends StatelessWidget {
  final LeaveEntity leave;
  final Color color;
  final VoidCallback? onCancel;
  const _LeaveCard({required this.leave, required this.color, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    final sameDay = leave.startDate.year == leave.endDate.year &&
        leave.startDate.month == leave.endDate.month &&
        leave.startDate.day == leave.endDate.day;
    final dateRange = sameDay
        ? _dateFormat.format(leave.startDate)
        : '${_dateFormat.format(leave.startDate)} – ${_dateFormat.format(leave.endDate)}';

    return WPCard(
      padding: EdgeInsets.zero,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 4, decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.horizontal(left: Radius.circular(20)))),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(13, 14, 14, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(leave.leaveTypeName ?? 'Leave',
                              style: WPText.sans(size: 14, weight: FontWeight.w700),),
                        ),
                        WPStatusPill(status: leave.status),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text('$dateRange · ${leave.totalDays} day${leave.totalDays == 1 ? '' : 's'}',
                        style: WPText.sans(size: 12, weight: FontWeight.w600, color: WPColors.text),),
                    const SizedBox(height: 3),
                    Text(leave.reason,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: WPText.sans(size: 11.5, weight: FontWeight.w500, color: WPColors.textDim),),
                    const SizedBox(height: 4),
                    Text('Applied ${_dateFormat.format(leave.createdAt)}',
                        style: WPText.sans(size: 10.5, weight: FontWeight.w500, color: WPColors.textFaint),),
                    if (leave.status == 'rejected' && (leave.managerComment?.isNotEmpty ?? false)) ...[
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(color: WPColors.dangerBg, borderRadius: BorderRadius.circular(11)),
                        child: Text('Reason: ${leave.managerComment}',
                            style: WPText.sans(size: 11, weight: FontWeight.w600, color: WPColors.dangerText),),
                      ),
                    ],
                    if (onCancel != null) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: InkWell(
                          onTap: onCancel,
                          borderRadius: BorderRadius.circular(10),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                            child: Text('Cancel request',
                                style: WPText.sans(size: 12, weight: FontWeight.w700, color: WPColors.danger),),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
