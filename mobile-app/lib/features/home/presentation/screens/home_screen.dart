import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ai_management_system/core/providers/core_providers.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Reading this once here (return value unused) is what starts the
    // offline-sync connectivity listener — `syncServiceProvider`'s body
    // runs only on this first read and is cached for the app's lifetime,
    // and this screen is the first one reached once actually
    // authenticated (unlike Splash/Login, where syncing has nothing to do
    // yet — /attendance/sync is itself behind auth).
    ref.watch(syncServiceProvider);

    final authState = ref.watch(authControllerProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('WorkPulse AI'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      // A plain Column here overflowed (visibly, with the debug-mode
      // "bottom overflowed" banner) any time the six cards' combined
      // height exceeded the viewport — landscape orientation, a small
      // screen, or a larger accessibility text scale. SingleChildScrollView
      // is the same fix LoginScreen already uses for its own column.
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Welcome 👋',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text('Signed in as ${user?.email ?? ''} (${user?.role ?? ''})'),
            const SizedBox(height: 24),
            _HomeCard(
              icon: Icons.location_on_outlined,
              title: 'Attendance',
              subtitle: 'GPS check-in / check-out and your history',
              onTap: () => context.push(attendancePath),
            ),
            const SizedBox(height: 12),
            _HomeCard(
              icon: Icons.beach_access_outlined,
              title: 'Leave',
              subtitle: 'Apply, cancel, and check your balance',
              onTap: () => context.push(leavePath),
            ),
            const SizedBox(height: 12),
            _HomeCard(
              icon: Icons.receipt_long_outlined,
              title: 'Payslips',
              subtitle: 'View and download your released payslips',
              onTap: () => context.push(payslipsPath),
            ),
            const SizedBox(height: 12),
            _HomeCard(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              subtitle: 'Your inbox',
              onTap: () => context.push(notificationsPath),
            ),
            const SizedBox(height: 12),
            _HomeCard(
              icon: Icons.face_retouching_natural_outlined,
              title: 'Face Registration',
              subtitle: 'Set up or update your face for check-in',
              onTap: () => context.push(faceRegistrationPath),
            ),
            const SizedBox(height: 12),
            _HomeCard(
              icon: Icons.event_note_outlined,
              title: 'My Shift',
              subtitle: 'Your assigned working hours',
              onTap: () => context.push(shiftPath),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const _HomeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        enabled: onTap != null,
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: onTap != null ? const Icon(Icons.chevron_right) : null,
        onTap: onTap,
      ),
    );
  }
}
