import { env } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * Minimal placeholder — real SMTP/SendGrid delivery is wired in Phase 12
 * (Notifications) once SMTP_HOST/SMTP_USER/SMTP_PASS are populated. Kept as
 * its own module now (rather than inlined in auth.service.ts) so swapping in
 * a real provider later doesn't touch auth logic at all.
 */
export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const resetLink = `https://app.ai-management-system.app/reset-password?token=${rawToken}`;

  if (!env.SMTP_HOST) {
    logger.info(`[dev-only, no SMTP configured] Password reset link for ${to}: ${resetLink}`);
    return;
  }

  // TODO(Phase 12): send via nodemailer/SendGrid once an email provider is wired in.
  logger.warn('SMTP_HOST is configured but email sending is not implemented yet.', { to });
}

export async function sendWelcomeEmail(
  to: string,
  info: { employeeCode: string; temporaryPassword: string },
): Promise<void> {
  if (!env.SMTP_HOST) {
    logger.info(
      `[dev-only, no SMTP configured] Welcome email for ${to} (${info.employeeCode}): ` +
        `temporary password "${info.temporaryPassword}" — change on first login.`,
    );
    return;
  }

  // TODO(Phase 12): send via nodemailer/SendGrid once an email provider is wired in.
  logger.warn('SMTP_HOST is configured but email sending is not implemented yet.', { to });
}
