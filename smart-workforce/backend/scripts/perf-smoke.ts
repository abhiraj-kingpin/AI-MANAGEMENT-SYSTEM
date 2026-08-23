
interface EndpointResult {
  path: string;
  durationsMs: number[];
  statusCounts: Map<number, number>;
}

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5000/api/v1';
const TOKEN = process.env.TOKEN;
const REQUESTS_PER_ENDPOINT = Number(process.env.REQUESTS ?? 20);

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
  await res.arrayBuffer();
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

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
