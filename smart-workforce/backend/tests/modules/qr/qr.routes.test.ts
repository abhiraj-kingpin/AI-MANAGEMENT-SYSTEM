import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

describe('qr routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/v1/qr/generate').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects a plain employee (QR generation is Super Admin/HR only)', async () => {
    const res = await request(app)
      .post('/api/v1/qr/generate')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ geofenceId: '507f1f77bcf86cd799439011' });
    expect(res.status).toBe(403);
  });

  it('rejects a Manager', async () => {
    const res = await request(app)
      .get('/api/v1/qr/active?geofenceId=507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(res.status).toBe(403);
  });

  it('POST /qr/generate rejects an invalid geofenceId (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/qr/generate')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ geofenceId: 'not-an-id' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /qr/active rejects a missing geofenceId', async () => {
    const res = await request(app)
      .get('/api/v1/qr/active')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
  });
});
