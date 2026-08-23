import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:ai_management_system/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:ai_management_system/features/attendance/presentation/screens/check_in_method_sheet.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

final _timeFormat = DateFormat.jm();
final _monthFormat = DateFormat.MMMM();
final _dayFormat = DateFormat.d();
final _dowShort = DateFormat.E();

// Same default as the design's own `dailyHours` prop — no per-org
// configurable value exists on the backend to read this from.
const _dailyGoalMinutes = 8 * 60;

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  late final Ticker _ticker;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _ticker = Ticker((_) {
      if (mounted) setState(() => _now = DateTime.now());
    })
      ..start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(attendanceControllerProvider);
    final controller = ref.read(attendanceControllerProvider.notifier);
    final today = state.today;
    final isCheckedIn = today != null && today.isCheckedIn;
    final isDone = today != null && today.checkOutAt != null;

    final elapsedMs = today?.checkInAt == null
        ? 0
        : (today!.checkOutAt ?? (isCheckedIn ? _now : today.checkInAt!))
            .difference(today.checkInAt!)
            .inMilliseconds;
    const goalMs = _dailyGoalMinutes * 60 * 1000;
    final pct = goalMs == 0 ? 0.0 : math.min(1.0, elapsedMs / goalMs);
    final remainMs = math.max(0, goalMs - elapsedMs);

    return Scaffold(
      backgroundColor: WPColors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: controller.loadHistory,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 132),
            children: [
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined, size: 18, color: WPColors.text),
                  const SizedBox(width: 9),
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(text: '${_monthFormat.format(_now)} ', style: WPText.sans(size: 19, weight: FontWeight.w800)),
                        TextSpan(
                          text: '${_now.year}',
                          style: WPText.sans(size: 19, weight: FontWeight.w600, color: WPColors.textDim),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  InkWell(
                    onTap: () => context.push(attendanceCalendarPath),
                    borderRadius: BorderRadius.circular(11),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(color: WPColors.borderMed),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Calendar', style: WPText.sans(size: 12, weight: FontWeight.w700)),
                          const SizedBox(width: 5),
                          const Icon(Icons.chevron_right, size: 15, color: WPColors.text),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _WeekStrip(now: _now, history: state.history),
              const SizedBox(height: 18),
              WPCard(
                radius: WPRadius.cardLg,
                padding: const EdgeInsets.fromLTRB(16, 22, 16, 16),
                shadow: [BoxShadow(color: const Color(0xFF141432).withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 2))],
                child: Column(
                  children: [
                    SizedBox(
                      width: 212,
                      height: 212,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 212,
                            height: 212,
                            child: CustomPaint(painter: _RingPainter(pct)),
                          ),
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Work Duration',
                                  style: WPText.sans(size: 11, weight: FontWeight.w600, color: WPColors.textDim),),
                              const SizedBox(height: 2),
                              Text(_hms(elapsedMs), style: WPText.mono(size: 30, weight: FontWeight.w500)),
                              const SizedBox(height: 4),
                              Text('Remaining Time',
                                  style: WPText.sans(size: 10.5, weight: FontWeight.w600, color: WPColors.textDim),),
                              const SizedBox(height: 3),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(color: WPColors.accentLight, borderRadius: BorderRadius.circular(8)),
                                child: Text(
                                  isDone
                                      ? 'Shift complete'
                                      : isCheckedIn
                                          ? '${_hoursShort(remainMs ~/ 60000)} left today'
                                          : 'Shift not started',
                                  style: WPText.sans(size: 10.5, weight: FontWeight.w700, color: WPColors.accentText),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _MiniStat(
                              label: 'CHECK-IN',
                              color: WPColors.warning,
                              value: today?.checkInAt != null ? _timeFormat.format(today!.checkInAt!.toLocal()) : '--:--',),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MiniStat(
                              label: 'CHECK-OUT',
                              color: WPColors.danger,
                              value: today?.checkOutAt != null ? _timeFormat.format(today!.checkOutAt!.toLocal()) : '--:--',),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _MiniStat(
                              label: 'TOTAL',
                              color: WPColors.info,
                              value: today != null ? _hoursShort(today.workingMinutes) : '--:--',),
                        ),
                      ],
                    ),
                    if (state.errorMessage != null) ...[
                      const SizedBox(height: 10),
                      Text(state.errorMessage!,
                          style: WPText.sans(size: 12, color: WPColors.danger), textAlign: TextAlign.center,),
                    ],
                    if (state.infoMessage != null) ...[
                      const SizedBox(height: 10),
                      Text(state.infoMessage!,
                          style: WPText.sans(size: 12, color: WPColors.textDim), textAlign: TextAlign.center,),
                    ],
                    const SizedBox(height: 4),
                    WPButton(
                      label: isDone
                          ? "You're done for today"
                          : isCheckedIn
                              ? 'Check Out'
                              : 'Check In',
                      variant: isCheckedIn
                          ? WPButtonVariant.dark
                          : isDone
                              ? WPButtonVariant.ghost
                              : WPButtonVariant.purple,
                      isLoading: state.isActionInProgress,
                      onPressed: isDone
                          ? null
                          : isCheckedIn
                              ? () => controller.checkOut()
                              : () => showCheckInMethodSheet(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Text('CHECK IN WITH',
                  style: WPText.sans(size: 11, weight: FontWeight.w700, color: WPColors.textDim, letterSpacing: 0.6),),
              const SizedBox(height: 9),
              Row(
                children: [
                  Expanded(
                    child: _MethodTile(
                      icon: Icons.qr_code_scanner_outlined,
                      label: 'QR',
                      onTap: isDone ? null : () => context.push(qrCheckInPath),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _MethodTile(
                      icon: Icons.face_retouching_natural_outlined,
                      label: 'Face',
                      onTap: isDone ? null : () => context.push(faceCheckInPath),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Attendance History', style: WPText.sans(size: 14, weight: FontWeight.w700)),
                  InkWell(
                    onTap: () => context.push(attendanceCalendarPath),
                    child: Text('View all', style: WPText.sans(size: 12, weight: FontWeight.w600, color: WPColors.accent)),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              WPCard(
                padding: EdgeInsets.zero,
                child: state.history.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text('No attendance records yet.',
                            style: WPText.sans(size: 12.5, color: WPColors.textDim), textAlign: TextAlign.center,),
                      )
                    : Column(
                        children: [
                          for (final record in state.history.take(3))
                            _HistoryRow(record: record, isLast: record == state.history.take(3).last),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _hms(int ms) {
    final secs = ms ~/ 1000;
    final h = secs ~/ 3600;
    final m = (secs ~/ 60) % 60;
    final s = secs % 60;
    return [h, m, s].map((v) => v.toString().padLeft(2, '0')).join(':');
  }

  String _hoursShort(int minutes) => '${minutes ~/ 60}h ${(minutes % 60).toString().padLeft(2, '0')}m';
}

class _RingPainter extends CustomPainter {
  final double pct;
  const _RingPainter(this.pct);

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2 - 6;
    final track = Paint()
      ..color = const Color(0xFFF1F0F8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;
    final fill = Paint()
      ..color = WPColors.accent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, track);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * pct,
      false,
      fill,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) => oldDelegate.pct != pct;
}

class _WeekStrip extends StatelessWidget {
  final DateTime now;
  final List<AttendanceEntity> history;
  const _WeekStrip({required this.now, required this.history});

  @override
  Widget build(BuildContext context) {
    final monday = now.subtract(Duration(days: now.weekday - 1));
    final days = List.generate(7, (i) => monday.add(Duration(days: i)));

    return Row(
      children: [
        for (final day in days)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Builder(builder: (context) {
                final isToday = day.year == now.year && day.month == now.month && day.day == now.day;
                return InkWell(
                  onTap: () {
                    final match = history.where((h) => h.isSameDayAs(day)).toList();
                    final label = match.isEmpty
                        ? 'No record for ${_dowShort.format(day)} ${_dayFormat.format(day)}'
                        : '${_dowShort.format(day)} ${_dayFormat.format(day)} · ${match.first.workingMinutes ~/ 60}h ${match.first.workingMinutes % 60}m recorded';
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(label)));
                  },
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: isToday ? WPColors.accent : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: isToday ? null : Border.all(color: WPColors.border),
                    ),
                    child: Column(
                      children: [
                        Text(_dayFormat.format(day),
                            style: WPText.sans(size: 13, weight: FontWeight.w700, color: isToday ? Colors.white : WPColors.text),),
                        const SizedBox(height: 1),
                        Text(_dowShort.format(day).substring(0, 1),
                            style: WPText.sans(
                                size: 9.5,
                                weight: FontWeight.w600,
                                color: isToday ? Colors.white.withOpacity(0.7) : WPColors.textDim,),),
                      ],
                    ),
                  ),
                );
              },),
            ),
          ),
      ],
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final Color color;
  final String value;
  const _MiniStat({required this.label, required this.color, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: WPColors.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: WPColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: WPText.sans(size: 10, weight: FontWeight.w700, color: color, letterSpacing: 0.4)),
          const SizedBox(height: 5),
          Text(value, style: WPText.mono(size: 14.5, weight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _MethodTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  const _MethodTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return WPCard(
      radius: WPRadius.tile + 4,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      onTap: onTap,
      child: Column(
        children: [
          Icon(icon, size: 20, color: onTap == null ? WPColors.textFainter : WPColors.accent),
          const SizedBox(height: 7),
          Text(label, style: WPText.sans(size: 12, weight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  final AttendanceEntity record;
  final bool isLast;
  const _HistoryRow({required this.record, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final range = record.checkInAt == null
        ? '— — —'
        : record.checkOutAt == null
            ? '${_timeFormat.format(record.checkInAt!.toLocal())} — ongoing'
            : '${_timeFormat.format(record.checkInAt!.toLocal())} — ${_timeFormat.format(record.checkOutAt!.toLocal())}';
    final total = record.status == 'on_leave' ? 'On leave' : '${record.workingMinutes ~/ 60}h ${record.workingMinutes % 60}m';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        border: isLast ? null : const Border(bottom: BorderSide(color: WPColors.borderLight)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 38,
            child: Column(
              children: [
                Text(_dayFormat.format(record.date), style: WPText.sans(size: 15, weight: FontWeight.w800)),
                Text(_dowShort.format(record.date).substring(0, 3),
                    style: WPText.sans(size: 9.5, weight: FontWeight.w600, color: WPColors.textDim),),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(range, style: WPText.mono(size: 12.5, weight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(total, style: WPText.sans(size: 11, weight: FontWeight.w500, color: WPColors.textDim)),
              ],
            ),
          ),
          WPStatusPill(status: record.status),
        ],
      ),
    );
  }
}

/// Minimal per-second ticker for the live work-duration display — avoids
/// pulling in a Timer.periodic + manual dispose dance duplicated per
/// screen.
class Ticker {
  final void Function(Duration) onTick;
  bool _running = false;
  Ticker(this.onTick);

  void start() {
    _running = true;
    _tick();
  }

  void _tick() async {
    while (_running) {
      await Future<void>.delayed(const Duration(seconds: 1));
      if (_running) onTick(Duration.zero);
    }
  }

  void dispose() => _running = false;
}
