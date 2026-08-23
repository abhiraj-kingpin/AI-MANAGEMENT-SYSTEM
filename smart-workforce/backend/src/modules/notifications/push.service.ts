import { env } from '../../config/env';
import { logger } from '../../config/logger';

export async function sendPushNotification(
  deviceTokens: string[],
  title: string,
  body: string,
): Promise<void> {
  if (deviceTokens.length === 0) {
    return;
  }

  if (!env.FIREBASE_PROJECT_ID) {
    logger.info(
      `[dev-only, no Firebase project configured] Would push to ${deviceTokens.length} device(s): "${title}" — ${body}`,
    );
    return;
  }

  logger.warn('FIREBASE_PROJECT_ID is configured but push sending is not implemented yet.', {
    deviceCount: deviceTokens.length,
  });
}
