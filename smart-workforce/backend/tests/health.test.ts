import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /api/v1/health/live', () => {
  it('returns 200 and an ok status without needing a DB connection', async () => {
    const app = createApp();

    const res = await request(app).get('/api/v1/health/live');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
  });
});

describe('unknown route', () => {
  it('returns a 404 in the standard error envelope', async () => {
    const app = createApp();

    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
