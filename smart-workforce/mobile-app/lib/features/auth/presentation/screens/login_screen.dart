import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ai_management_system/core/router/app_router.dart';
import 'package:ai_management_system/features/auth/presentation/providers/auth_providers.dart';
import 'package:ai_management_system/shared/theme/wp_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authControllerProvider.notifier).login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  InputDecoration _fieldDecoration(String label) {
    OutlineInputBorder border(Color color, {double width = 1}) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: color, width: width),
        );
    return InputDecoration(
      labelText: label,
      labelStyle: WPText.sans(size: 14, color: WPColors.textDim),
      filled: true,
      fillColor: WPColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: border(WPColors.border),
      enabledBorder: border(WPColors.border),
      focusedBorder: border(WPColors.accent, width: 1.5),
      errorBorder: border(WPColors.danger),
      focusedErrorBorder: border(WPColors.danger, width: 1.5),
      errorStyle: WPText.sans(size: 12, color: WPColors.danger),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      backgroundColor: WPColors.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Image.asset(
                        'assets/images/logo.png',
                        width: 88,
                        height: 88,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Office App',
                    style: WPText.sans(size: 22, weight: FontWeight.w800, color: WPColors.text),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Sign in to continue',
                    style: WPText.sans(size: 14, color: WPColors.textDim),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 36),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    style: WPText.sans(size: 15, color: WPColors.text),
                    decoration: _fieldDecoration('Email'),
                    validator: (value) =>
                        (value == null || !value.contains('@'))
                            ? 'Enter a valid email'
                            : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                    style: WPText.sans(size: 15, color: WPColors.text),
                    decoration: _fieldDecoration('Password'),
                    validator: (value) => (value == null || value.length < 8)
                        ? 'Minimum 8 characters'
                        : null,
                    onFieldSubmitted: (_) => _submit(),
                  ),
                  if (authState.errorMessage != null) ...[
                    const SizedBox(height: 14),
                    Text(
                      authState.errorMessage!,
                      style: WPText.sans(size: 13, color: WPColors.danger, weight: FontWeight.w600),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 28),
                  WPButton(
                    label: 'Sign in',
                    isLoading: authState.isLoading,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: 18),
                  Center(
                    child: TextButton(
                      onPressed: () => context.push(registerPath),
                      style: TextButton.styleFrom(foregroundColor: WPColors.accent),
                      child: Text(
                        'New employee? Set up your account',
                        style: WPText.sans(size: 13.5, weight: FontWeight.w600, color: WPColors.accent),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
