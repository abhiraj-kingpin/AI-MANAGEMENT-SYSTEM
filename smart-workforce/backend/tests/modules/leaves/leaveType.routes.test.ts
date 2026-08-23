import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

describe('leave-type routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).get('/api/v1/leave-types');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects a plain employee from creating a leave type (read-only for them)', async () => {
    const res = await request(app)
      .post('/api/v1/leave-types')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ name: 'Sabbatical', defaultAnnualQuota: 5 });
    expect(res.status).toBe(403);
  });

  it('rejects a manager from creating a leave type (HR/Admin only)', async () => {
    const res = await request(app)
      .post('/api/v1/leave-types')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({ name: 'Sabbatical', defaultAnnualQuota: 5 });
    expect(res.status).toBe(403);
  });

  it('POST /leave-types rejects a missing name (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/leave-types')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ defaultAnnualQuota: 5 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /leave-types rejects a negative quota', async () => {
    const res = await request(app)
      .post('/api/v1/leave-types')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ name: 'Sabbatical', defaultAnnualQuota: -1 });
    expect(res.status).toBe(422);
  });
});
