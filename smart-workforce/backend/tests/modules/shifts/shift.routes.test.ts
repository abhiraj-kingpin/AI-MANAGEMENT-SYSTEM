import request from 'supertest';
import { createApp } from '../../../src/app';
import { signAccessToken } from '../../../src/shared/utils/tokens';

describe('shift routes — validation and access control wiring', () => {
  const app = createApp();
  const validShift = {
    name: 'Morning',
    type: 'morning',
    startTime: '09:00',
    endTime: '17:00',
  };

  function tokenFor(role: 'super_admin' | 'hr' | 'manager' | 'employee', employeeId?: string) {
    return signAccessToken({ sub: 'user-1', role, employeeId });
  }

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).get('/api/v1/shifts');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects a manager from the shift-definitions list (HR/Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenFor('manager')}`);
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee from creating a shift', async () => {
    const res = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send(validShift);
    expect(res.status).toBe(403);
  });

  it('rejects a plain employee from assigning a shift', async () => {
    const res = await request(app)
      .post('/api/v1/shifts/assign')
      .set('Authorization', `Bearer ${tokenFor('employee')}`)
      .send({
        employeeId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        shiftId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        effectiveFrom: '2026-08-10',
      });
    expect(res.status).toBe(403);
  });

  it('rejects a manager from bulk-assigning a shift', async () => {
    const res = await request(app)
      .post('/api/v1/shifts/assign/bulk')
      .set('Authorization', `Bearer ${tokenFor('manager')}`)
      .send({
        employeeIds: ['aaaaaaaaaaaaaaaaaaaaaaaa'],
        shiftId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        effectiveFrom: '2026-08-10',
      });
    expect(res.status).toBe(403);
  });

  it('POST /shifts rejects an invalid time format (422, not 500)', async () => {
    const res = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ ...validShift, startTime: '9am' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /shifts rejects an invalid shift type', async () => {
    const res = await request(app)
      .post('/api/v1/shifts')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ ...validShift, type: 'afternoon' });
    expect(res.status).toBe(422);
  });

  it('POST /shifts/assign rejects a non-ObjectId employeeId', async () => {
    const res = await request(app)
      .post('/api/v1/shifts/assign')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({
        employeeId: 'not-an-id',
        shiftId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        effectiveFrom: '2026-08-10',
      });
    expect(res.status).toBe(422);
  });

  it('POST /shifts/assign/bulk rejects an empty employeeIds array', async () => {
    const res = await request(app)
      .post('/api/v1/shifts/assign/bulk')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({ employeeIds: [], shiftId: 'bbbbbbbbbbbbbbbbbbbbbbbb', effectiveFrom: '2026-08-10' });
    expect(res.status).toBe(422);
  });

  it('PATCH /shifts/:id rejects an empty update body', async () => {
    const res = await request(app)
      .patch('/api/v1/shifts/shift-1')
      .set('Authorization', `Bearer ${tokenFor('hr')}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('GET /shifts rejects a non-boolean includeInactive (real bug caught while building Phase 12: z.coerce.boolean() treated the string "false" as true)', async () => {
    const res = await request(app)
      .get('/api/v1/shifts?includeInactive=not-a-boolean')
      .set('Authorization', `Bearer ${tokenFor('hr')}`);
    expect(res.status).toBe(422);
  });
});
