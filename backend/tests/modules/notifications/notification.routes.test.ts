import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Covers only what rejects before touching the database — RBAC and
 * validation — same DB-free approach as every other *.routes.test.ts suite.
 */
describe('notification routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller on every route', async () => {
    const resMe = await request(app).get('/api/v1/notifications/me');
    expect(resMe.status).toBe(401);
    expect(resMe.body.error.code).toBe('MISSING_TOKEN');

    const resBroadcast = await request(app)
      .post('/api/v1/notifications/broadcast')
      .send({ title: 'X', body: 'Y' });
    expect(resBroadcast.status).toBe(401);
  });

  it('rejects a manager from broadcasting (Super Admin/HR only)', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/broadcast')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({ title: 'Announcement', body: 'Body text' });
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee from broadcasting', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/broadcast')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ title: 'Announcement', body: 'Body text' });
    expect(res.status).toBe(403);
  });

  it('POST /notifications/broadcast rejects a missing title/body', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/broadcast')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /notifications/device-token rejects an empty token', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/device-token')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ token: '' });
    expect(res.status).toBe(422);
  });

  it('GET /notifications/me rejects a non-numeric page', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/me?page=not-a-number')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(res.status).toBe(422);
  });

  it('GET /notifications/me rejects an unread value that is not exactly "true"/"false"', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/me?unread=maybe')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(res.status).toBe(422);
  });
});
