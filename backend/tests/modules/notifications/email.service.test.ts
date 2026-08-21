// The whole env module is mocked (not just one field) so this test controls
// SMTP_HOST directly — same approach as push.service.test.ts's
// FIREBASE_PROJECT_ID mock, one module-level env flag deciding whether a
// "would send for real" branch is reachable in this environment.
jest.mock('../../../src/config/env', () => ({ env: { SMTP_HOST: undefined } }));

import { env } from '../../../src/config/env';
import { logger } from '../../../src/config/logger';
import { sendPasswordResetEmail } from '../../../src/modules/notifications/email.service';

describe('sendPasswordResetEmail (Phase 3 placeholder — see backend/README.md)', () => {
  afterEach(() => {
    (env as { SMTP_HOST?: string }).SMTP_HOST = undefined;
    jest.restoreAllMocks();
  });

  it('logs the reset link instead of sending an email when no SMTP is configured', async () => {
    const infoSpy = jest.spyOn(logger, 'info');

    await expect(sendPasswordResetEmail('jane@acme.com', 'raw-token')).resolves.toBeUndefined();

    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('jane@acme.com'));
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('raw-token'));
  });

  it('never throws once SMTP_HOST is configured — still a documented placeholder, no real send is attempted', async () => {
    (env as { SMTP_HOST?: string }).SMTP_HOST = 'smtp.example.com';
    const warnSpy = jest.spyOn(logger, 'warn');

    await expect(sendPasswordResetEmail('jane@acme.com', 'raw-token')).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not implemented'),
      expect.objectContaining({ to: 'jane@acme.com' }),
    );
  });
});
