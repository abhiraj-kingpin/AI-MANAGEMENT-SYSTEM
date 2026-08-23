jest.mock('../../../src/config/env', () => ({ env: { FIREBASE_PROJECT_ID: undefined } }));

import { env } from '../../../src/config/env';
import { sendPushNotification } from '../../../src/modules/notifications/push.service';

describe('sendPushNotification (Phase 12 placeholder — see backend/README.md)', () => {
  afterEach(() => {
    (env as { FIREBASE_PROJECT_ID?: string }).FIREBASE_PROJECT_ID = undefined;
  });

  it('is a no-op when there are no registered device tokens', async () => {
    await expect(sendPushNotification([], 'Title', 'Body')).resolves.toBeUndefined();
  });

  it('never throws in dev mode (no Firebase project configured)', async () => {
    await expect(
      sendPushNotification(['token-1', 'token-2'], 'Title', 'Body'),
    ).resolves.toBeUndefined();
  });

  it('never throws even once a Firebase project id is configured — still a documented placeholder, no real send is attempted', async () => {
    (env as { FIREBASE_PROJECT_ID?: string }).FIREBASE_PROJECT_ID = 'demo-project';
    await expect(sendPushNotification(['token-1'], 'Title', 'Body')).resolves.toBeUndefined();
  });
});
