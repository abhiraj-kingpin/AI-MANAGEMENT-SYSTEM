import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

/**
 * Covers only what rejects before touching the database — RBAC and
 * validation — same DB-free approach as every other *.routes.test.ts suite.
 */
describe('face routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role, employeeId: 'emp-1' });
  }

  it('POST /face/register rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/v1/face/register');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('POST /face/register-embeddings rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/v1/face/register-embeddings');
    expect(res.status).toBe(401);
  });

  it('POST /face/register-embeddings rejects fewer than 3 embeddings (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/face/register-embeddings')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ embeddings: [Array(67).fill(0.1), Array(67).fill(0.2)] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /face/register-embeddings rejects an embedding that is too short', async () => {
    const res = await request(app)
      .post('/api/v1/face/register-embeddings')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ embeddings: [[1, 2, 3], Array(67).fill(0.2), Array(67).fill(0.3)] });
    expect(res.status).toBe(422);
  });

  it('POST /face/verify rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/v1/face/verify').send({ embedding: [] });
    expect(res.status).toBe(401);
  });

  it('POST /face/verify rejects an embedding that is too short (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/face/verify')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ embedding: [1, 2, 3] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('DELETE /face/:employeeId rejects a plain employee (right-to-erasure is HR/Admin only)', async () => {
    const res = await request(app)
      .delete('/api/v1/face/emp-2')
      .set('Authorization', `Bearer ${tokenFor('employee')}`);
    expect(res.status).toBe(403);
  });

  it('DELETE /face/:employeeId rejects a Manager', async () => {
    const res = await request(app)
      .delete('/api/v1/face/emp-2')
      .set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(res.status).toBe(403);
  });
});
