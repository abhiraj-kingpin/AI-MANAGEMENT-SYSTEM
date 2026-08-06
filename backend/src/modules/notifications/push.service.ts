import { env } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * Minimal placeholder — same honest pattern as email.service.ts. Real
 * Firebase Cloud Messaging delivery needs a Firebase project + service
 * account credentials (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/
 * FIREBASE_PRIVATE_KEY — already reserved in config/env.ts since Phase 1)
 * that this dev environment doesn't have. Logs what would have been sent in
 * dev; this is the one function a real firebase-admin integration replaces
 * later — nothing else in the app needs to change when that happens.
 *
 * Never throws: a failed/unavailable push must not fail the business action
 * that triggered it (the in-app Notification document is already written
 * by the time this runs) — same fire-and-forget contract as recordAudit.
 */
export async function sendPushNotification(
  deviceTokens: string[],
  title: string,
  body: string,
): Promise<void> {
  if (deviceTokens.length === 0) {
    return; // nobody has a registered device — not an error, just nothing to do
  }

  if (!env.FIREBASE_PROJECT_ID) {
    logger.info(
      `[dev-only, no Firebase project configured] Would push to ${deviceTokens.length} device(s): "${title}" — ${body}`,
    );
    return;
  }

  // TODO(Phase 19/deployment): send via firebase-admin once a Firebase
  // project + service account are actually provisioned.
  logger.warn('FIREBASE_PROJECT_ID is configured but push sending is not implemented yet.', {
    deviceCount: deviceTokens.length,
  });
}
