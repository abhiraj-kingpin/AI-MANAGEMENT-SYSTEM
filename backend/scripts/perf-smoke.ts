/**
 * Lightweight, dependency-free latency smoke-test for a handful of hot read
 * endpoints. Not a replacement for a real load-testing tool (k6, autocannon)
 * run against a staging environment under concurrent load — this is
 * single-connection, sequential, and meant for a quick "did I just regress
 * this" check during development, not a capacity/throughput benchmark.
 * Genuinely runnable, not illustrative: it makes real HTTP requests against
 * a running instance of this API and reports real numbers.
 *
 * Deliberately outside `src/` (and so outside tsconfig.json's `src`-only
 * `include`, same as `jest.config.js`) — a dev-only tool, not part of the
 * shipped build, run directly via `tsx` (already a devDependency).
 *
 * Usage:
 *   npm run dev                              # in one terminal
 *   TOKEN=<a valid access token> npm run perf:smoke   # in another
 *
 * `TOKEN` is optional — without one, every protected endpoint below
 * responds 401, which still measures a real round trip (auth middleware +
 * routing + JSON serialization) even though it skips the actual query.
 */

interface EndpointResult {
  path: string;
  durationsMs: number[];
  statusCounts: Map<number, number>;
}

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000/api/v1';
const TOKEN = process.env.TOKEN;
const REQUESTS_PER_ENDPOINT = Number(process.env.REQUESTS ?? 20);

// The reads most likely to be polled repeatedly by a live dashboard — the
// same ones Phase 17 added in-memory caching for (analytics.service.ts).
const ENDPOINTS = [
  '/health',
  '/analytics/dashboard',
  '/analytics/attendance-trend',
  '/analytics/department-comparison',
];

async function timeRequest(path: string): Promise<{ durationMs: number; status: number }> {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  });
  await res.arrayBuffer(); // drain the body — otherwise timing stops before the response is fully received
  return { durationMs: performance.now() - start, status: res.status };
}

function percentile(sortedAsc: number[], p: number): number {
  const index = Math.ceil((p / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.max(0, Math.min(sortedAsc.length - 1, index))];
}

async function benchmarkEndpoint(path: string): Promise<EndpointResult> {
  const durationsMs: number[] = [];
  const statusCounts = new Map<number, number>();

  for (let i = 0; i < REQUESTS_PER_ENDPOINT; i += 1) {
    const { durationMs, status } = await timeRequest(path);
    durationsMs.push(durationMs);
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  return { path, durationsMs, statusCounts };
}

function formatStatusCounts(statusCounts: Map<number, number>): string {
  return [...statusCounts.entries()].map(([status, count]) => `${status}×${count}`).join(' ');
}

// This is a CLI reporting tool — its entire job is printing results, so
// `console.log` here is the intended output channel, not a stray debug
// statement the shared `no-console` rule (aimed at app code) is meant to
// catch.
/* eslint-disable no-console */
async function main(): Promise<void> {
  if (!TOKEN) {
    console.warn(
      'No TOKEN set — protected endpoints will show as 401s (still a real, measured round trip).\n',
    );
  }
  console.log(
    `Benchmarking ${ENDPOINTS.length} endpoint(s), ${REQUESTS_PER_ENDPOINT} sequential request(s) each, against ${BASE_URL}\n`,
  );

  for (const path of ENDPOINTS) {
    const { durationsMs, statusCounts } = await benchmarkEndpoint(path);
    const sorted = [...durationsMs].sort((a, b) => a - b);
    const avg = durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length;

    console.log(
      `${path.padEnd(30)} avg ${avg.toFixed(1)}ms  p50 ${percentile(sorted, 50).toFixed(1)}ms  ` +
        `p95 ${percentile(sorted, 95).toFixed(1)}ms  [${formatStatusCounts(statusCounts)}]`,
    );
  }
}
/* eslint-enable no-console */

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
