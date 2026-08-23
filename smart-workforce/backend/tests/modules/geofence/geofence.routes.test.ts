import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

describe('geofence routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).get('/api/v1/geofences');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects a Manager (office-location management is Super Admin/HR only)', async () => {
    const res = await request(app)
      .get('/api/v1/geofences')
      .set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee', async () => {
    const res = await request(app)
      .post('/api/v1/geofences')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ branchName: 'HQ', center: { lat: 12.9716, lng: 77.5946 } });
    expect(res.status).toBe(403);
  });

  it('POST /geofences rejects an out-of-range coordinate (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/geofences')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ branchName: 'HQ', center: { lat: 200, lng: 0 } });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /geofences/nearby rejects a missing lat/lng', async () => {
    const res = await request(app)
      .get('/api/v1/geofences/nearby')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
  });
});
