import { env } from '../../config/env';
import { logger } from '../../config/logger';

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const resetLink = `https://app.ai-management-system.app/reset-password?token=${rawToken}`;

  if (!env.SMTP_HOST) {
    logger.info(`[dev-only, no SMTP configured] Password reset link for ${to}: ${resetLink}`);
    return;
  }

  logger.warn('SMTP_HOST is configured but email sending is not implemented yet.', { to });
}
