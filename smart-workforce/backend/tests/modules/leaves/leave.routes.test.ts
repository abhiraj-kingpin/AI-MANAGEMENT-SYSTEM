import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

describe('leave routes — validation and access control wiring', () => {
  const app = createApp();
  const validBody = {
    leaveTypeId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    startDate: '2026-08-10',
    endDate: '2026-08-11',
    reason: 'Family function',
  };

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee', employeeId?: string) {
    return signAccessToken({ sub: 'user-1', role, employeeId });
  }

  it('rejects an unauthenticated caller on every route', async () => {
    const resApply = await request(app).post('/api/v1/leaves').send(validBody);
    expect(resApply.status).toBe(401);
    expect(resApply.body.error.code).toBe('MISSING_TOKEN');

    const resList = await request(app).get('/api/v1/leaves');
    expect(resList.status).toBe(401);
  });

  it('rejects a plain employee from the review queue (list)', async () => {
    const res = await request(app)
      .get('/api/v1/leaves')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee from approving a leave', async () => {
    const res = await request(app)
      .patch('/api/v1/leaves/leave-1/approve')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee from rejecting a leave', async () => {
    const res = await request(app)
      .patch('/api/v1/leaves/leave-1/reject')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`)
      .send({ comment: 'no' });
    expect(res.status).toBe(403);
  });

  it('POST /leaves rejects a missing reason (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/leaves')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`)
      .send({ ...validBody, reason: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /leaves rejects endDate before startDate (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/leaves')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`)
      .send({ ...validBody, startDate: '2026-08-11', endDate: '2026-08-10' });
    expect(res.status).toBe(422);
  });

  it('POST /leaves rejects a non-ObjectId leaveTypeId', async () => {
    const res = await request(app)
      .post('/api/v1/leaves')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`)
      .send({ ...validBody, leaveTypeId: 'not-an-id' });
    expect(res.status).toBe(422);
  });

  it('GET /leaves/me rejects an invalid status filter', async () => {
    const res = await request(app)
      .get('/api/v1/leaves/me?status=made-up')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`);
    expect(res.status).toBe(422);
  });

  it('GET /leaves rejects an invalid status filter for a reviewer', async () => {
    const res = await request(app)
      .get('/api/v1/leaves?status=made-up')
      .set('Authorization', `Bearer ${tokenFor('hr', 'dddddddddddddddddddddddd')}`);
    expect(res.status).toBe(422);
  });

  it('PATCH /:id/reject requires a non-empty comment (422, not 500)', async () => {
    const res = await request(app)
      .patch('/api/v1/leaves/leave-1/reject')
      .set('Authorization', `Bearer ${tokenFor('hr', 'dddddddddddddddddddddddd')}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('POST /leaves/carry-forward rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/v1/leaves/carry-forward').send({});
    expect(res.status).toBe(401);
  });

  it('POST /leaves/carry-forward rejects a plain employee (year-end batch action is Super Admin/HR only)', async () => {
    const res = await request(app)
      .post('/api/v1/leaves/carry-forward')
      .set('Authorization', `Bearer ${tokenFor('employee', 'aaaaaaaaaaaaaaaaaaaaaaaa')}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('POST /leaves/carry-forward rejects a Manager (org-wide action, not team-scoped)', async () => {
    const res = await request(app)
      .post('/api/v1/leaves/carry-forward')
      .set('Authorization', `Bearer ${tokenFor('manager', 'bbbbbbbbbbbbbbbbbbbbbbbb')}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('POST /leaves/carry-forward rejects a non-numeric fromYear (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/leaves/carry-forward')
      .set('Authorization', `Bearer ${tokenFor('hr', 'dddddddddddddddddddddddd')}`)
      .send({ fromYear: 'not-a-year' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
