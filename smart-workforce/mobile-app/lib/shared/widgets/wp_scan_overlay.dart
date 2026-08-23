import 'package:flutter/material.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

/// Corner-bracket reticle + a slow vertical scan line, purely decorative —
/// signals "actively scanning" over a live camera feed underneath. Shared
/// between the Face check-in and QR check-in screens.
class WPScanOverlay extends StatelessWidget {
  final Animation<double> animation;
  final double width;
  final double height;

  const WPScanOverlay({
    required this.animation,
    this.width = 260,
    this.height = 320,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: width,
        height: height,
        child: AnimatedBuilder(
          animation: animation,
          builder: (context, _) => CustomPaint(painter: _BracketPainter(scanProgress: animation.value)),
        ),
      ),
    );
  }
}

class _BracketPainter extends CustomPainter {
  final double scanProgress;
  const _BracketPainter({required this.scanProgress});

  @override
  void paint(Canvas canvas, Size size) {
    const len = 28.0;
    const inset = 4.0;
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.85)
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    void corner(Offset origin, Offset dx, Offset dy) {
      canvas.drawLine(origin, origin + dx, paint);
      canvas.drawLine(origin, origin + dy, paint);
    }

    corner(const Offset(inset, inset), const Offset(len, 0), const Offset(0, len));
    corner(Offset(size.width - inset, inset), const Offset(-len, 0), const Offset(0, len));
    corner(Offset(inset, size.height - inset), const Offset(len, 0), const Offset(0, -len));
    corner(Offset(size.width - inset, size.height - inset), const Offset(-len, 0), const Offset(0, -len));

    final scanPaint = Paint()
      ..shader = LinearGradient(
        colors: [WPColors.accent.withOpacity(0), WPColors.accent.withOpacity(0.9), WPColors.accent.withOpacity(0)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, 3));
    final y = size.height * scanProgress;
    canvas.drawRect(Rect.fromLTWH(inset, y, size.width - inset * 2, 3), scanPaint);
  }

  @override
  bool shouldRepaint(covariant _BracketPainter oldDelegate) => oldDelegate.scanProgress != scanProgress;
}
