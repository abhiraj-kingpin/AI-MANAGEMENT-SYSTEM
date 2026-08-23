import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Office App design system. Colors/radii/type scale are copied verbatim
/// from the design spec so the app matches it exactly rather than
/// approximating it. Brand accent is Midnight Navy (#14304F).
class WPColors {
  WPColors._();

  static const bg = Color(0xFFF4F4F7);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceMuted = Color(0xFFFAFAFC);
  static const dark = Color(0xFF14141C);

  static const text = Color(0xFF14141C);
  static const textDim = Color(0xFF8A8A9C);
  static const textFaint = Color(0xFFB0B0BE);
  static const textFainter = Color(0xFFC6C6D2);

  static const border = Color(0x12141428); // rgba(20,20,40,.07)
  static const borderLight = Color(0x0D141428); // .05
  static const borderMed = Color(0x15141428); // .08

  static const accent = Color(0xFF14304F);
  static const accentLight = Color(0xFFECEEF1);
  static const accentText = Color(0xFF14304F);

  static const success = Color(0xFF0FB57F);
  static const successText = Color(0xFF0A8C63);
  static const successBg = Color(0xFFE0F6EE);

  static const warning = Color(0xFFDE8E1B);
  static const warningText = Color(0xFFB0740F);
  static const warningBg = Color(0xFFFDF0DC);

  static const danger = Color(0xFFEF5B5B);
  static const dangerText = Color(0xFFC43F3F);
  static const dangerBg = Color(0xFFFDE7E7);

  static const info = Color(0xFF3E63F5);
  static const infoText = Color(0xFF2B47C4);
  static const infoBg = Color(0xFFE4EAFE);
}

class WPText {
  WPText._();

  static TextStyle sans({
    double size = 14,
    FontWeight weight = FontWeight.w500,
    Color color = WPColors.text,
    double? letterSpacing,
    double? height,
  }) =>
      GoogleFonts.plusJakartaSans(
        fontSize: size,
        fontWeight: weight,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );

  // Roboto Mono, not DM Mono — DM Mono draws "0" with a slash through it,
  // which at small sizes on real devices reads as a stray dash cutting
  // through times/money figures. Roboto Mono's zero is a plain oval.
  static TextStyle mono({
    double size = 13,
    FontWeight weight = FontWeight.w500,
    Color color = WPColors.text,
  }) =>
      GoogleFonts.robotoMono(fontSize: size, fontWeight: weight, color: color);
}

class WPRadius {
  WPRadius._();
  static const card = 20.0;
  static const cardLg = 24.0;
  static const tile = 14.0;
  static const pill = 999.0;
}

/// A white rounded card with the standard 1px hairline border — the base
/// container every screen in the design builds on.
class WPCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;
  final Color color;
  final List<BoxShadow>? shadow;

  const WPCard({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = WPRadius.card,
    this.onTap,
    this.color = WPColors.surface,
    this.shadow,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: WPColors.border),
        boxShadow: shadow,
      ),
      child: child,
    );
    if (onTap == null) return card;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radius),
      child: card,
    );
  }
}

/// A small rounded status label — "On time" / "Late" / "Pending" / etc.
/// Colors mirror the design's `pillFor(status)` map exactly.
class WPStatusPill extends StatelessWidget {
  final String status;
  const WPStatusPill({required this.status, super.key});

  static const _map = <String, (Color, Color)>{
    'On time': (WPColors.successBg, WPColors.successText),
    'present': (WPColors.successBg, WPColors.successText),
    'Late': (WPColors.warningBg, WPColors.warningText),
    'late': (WPColors.warningBg, WPColors.warningText),
    'Overtime': (WPColors.infoBg, WPColors.infoText),
    'Leave': (WPColors.accentLight, WPColors.accentText),
    'on_leave': (WPColors.accentLight, WPColors.accentText),
    'Approved': (WPColors.successBg, WPColors.successText),
    'approved': (WPColors.successBg, WPColors.successText),
    'Pending': (WPColors.warningBg, WPColors.warningText),
    'pending': (WPColors.warningBg, WPColors.warningText),
    'Rejected': (WPColors.dangerBg, WPColors.dangerText),
    'rejected': (WPColors.dangerBg, WPColors.dangerText),
    'Cancelled': (WPColors.bg, WPColors.textDim),
    'cancelled': (WPColors.bg, WPColors.textDim),
    'Absent': (WPColors.dangerBg, WPColors.dangerText),
    'half_day': (WPColors.warningBg, WPColors.warningText),
  };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _map[status] ?? (WPColors.bg, const Color(0xFF5A5A6C));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(
        status[0].toUpperCase() + status.substring(1).replaceAll('_', ' '),
        style: WPText.sans(size: 10.5, weight: FontWeight.w700, color: fg),
      ),
    );
  }
}

enum WPButtonVariant { purple, dark, ghost }

/// The three button treatments used throughout the design: solid navy
/// (primary action — `purple` is a legacy enum name, kept as-is since it's
/// an internal identifier, not user-visible text), solid dark (secondary
/// strong action, e.g. Check Out), and a disabled-looking light-grey ghost
/// (e.g. "Shift closed for today").
class WPButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final WPButtonVariant variant;
  final bool isLoading;

  const WPButton({
    required this.label,
    required this.onPressed,
    this.variant = WPButtonVariant.purple,
    this.isLoading = false,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final bg = switch (variant) {
      WPButtonVariant.purple => WPColors.accent,
      WPButtonVariant.dark => WPColors.dark,
      WPButtonVariant.ghost => const Color(0xFFF4F4F7),
    };
    final fg = switch (variant) {
      WPButtonVariant.ghost => WPColors.textDim,
      _ => Colors.white,
    };
    final content = isLoading
        ? SizedBox(
            height: 18,
            width: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: fg),
          )
        : Text(label, style: WPText.sans(size: 14.5, weight: FontWeight.w700, color: fg));

    return InkWell(
      onTap: isLoading ? null : onPressed,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 15),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
          border: variant == WPButtonVariant.ghost
              ? Border.all(color: WPColors.borderMed)
              : null,
          boxShadow: variant == WPButtonVariant.purple
              ? [BoxShadow(color: WPColors.accent.withOpacity(0.26), blurRadius: 18, offset: const Offset(0, 8))]
              : null,
        ),
        child: content,
      ),
    );
  }
}

/// A small rounded icon square with a tinted background — used for
/// notification glyphs, leave-type initials, profile row icons.
class WPIconTile extends StatelessWidget {
  final String label;
  final Color bg;
  final Color fg;
  final double size;

  const WPIconTile({
    required this.label,
    required this.bg,
    required this.fg,
    this.size = 34,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(size * 0.32)),
      alignment: Alignment.center,
      child: Text(label, style: WPText.sans(size: size * 0.36, weight: FontWeight.w800, color: fg)),
    );
  }
}
