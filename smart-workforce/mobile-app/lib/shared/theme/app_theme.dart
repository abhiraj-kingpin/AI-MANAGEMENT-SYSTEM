import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  // Office App brand — Midnight Navy. Material3 derives the full
  // light/dark ColorScheme (primary, onPrimary, containers, ...) from this
  // single seed, so screens that lean on ambient Theme.of(context) colors
  // (rather than WPColors directly) pick up the new brand hue too.
  static const Color _seed = Color(0xFF14304F);

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorSchemeSeed: _seed,
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorSchemeSeed: _seed,
      );
}
