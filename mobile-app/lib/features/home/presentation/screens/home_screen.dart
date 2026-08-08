import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Management System'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Welcome 👋', style: Theme.of(context).textTheme.headlineSmall),
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
            const _HomeCard(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              subtitle: 'Coming soon',
              onTap: null,
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
