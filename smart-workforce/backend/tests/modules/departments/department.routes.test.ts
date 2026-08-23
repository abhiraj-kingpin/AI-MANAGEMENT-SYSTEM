import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

describe('department routes — validation and access control wiring', () => {
  const app = createApp();

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee') {
    return signAccessToken({ sub: 'user-1', role });
  }

  it('rejects an unauthenticated caller on every route', async () => {
    const resList = await request(app).get('/api/v1/departments');
    expect(resList.status).toBe(401);
    expect(resList.body.error.code).toBe('MISSING_TOKEN');

    const resCreate = await request(app).post('/api/v1/departments').send({ name: 'X', code: 'X' });
    expect(resCreate.status).toBe(401);
  });

  it('rejects a plain employee from creating a department', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({ name: 'Engineering', code: 'ENG' });
    expect(res.status).toBe(403);
  });

  it('rejects a manager from creating a department (Super Admin/HR only)', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({ name: 'Engineering', code: 'ENG' });
    expect(res.status).toBe(403);
  });

  it('rejects a manager from updating a department', async () => {
    const res = await request(app)
      .patch('/api/v1/departments/dept-1')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({ isActive: false });
    expect(res.status).toBe(403);
  });

  it('POST /departments rejects a missing name', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ code: 'ENG' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /departments rejects an invalid headOfDepartment id', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ name: 'Engineering', code: 'ENG', headOfDepartment: 'not-an-id' });
    expect(res.status).toBe(422);
  });

  it('PATCH /departments/:id rejects an empty update body', async () => {
    const res = await request(app)
      .patch('/api/v1/departments/dept-1')
      .set('Authorization', `Bearer ${tokenFor('super_admin')}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('GET /departments rejects a malformed includeInactive filter', async () => {
    const res = await request(app)
      .get('/api/v1/departments?includeInactive=maybe')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
  });
});
