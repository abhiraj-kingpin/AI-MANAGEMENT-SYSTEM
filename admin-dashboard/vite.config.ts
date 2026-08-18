/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  // `globals: true` matches how the backend's Jest suite is written (no
  // explicit `import { describe, it, expect } from ...` there either) —
  // same test-writing convention across both suites rather than diverging.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // `pool: 'forks'` (process isolation) instead of Vitest's default
    // `'threads'` — the suite passed locally (Windows) every time but
    // failed on `ci-admin.yml`'s Linux runner with no reproducible cause
    // found locally (clean `npm ci`, `CI=true`/`GITHUB_ACTIONS=true` env,
    // no peer-dependency mismatch, no missing platform-specific optional
    // dependency in the lockfile — all checked, all fine). jsdom's timer
    // handling under Vitest's worker-thread pool has documented,
    // Linux-specific flakiness; `forks` is the standard mitigation.
    pool: 'forks',
  },
});
