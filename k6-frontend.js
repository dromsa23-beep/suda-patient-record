import http from 'k6/http';
import { check, sleep, group } from 'k6/metrics';

const BASE = 'https://suda-patient-record.web.app';

export const options = {
  stages: [
    { duration: '20s', target: 50 },    // ramp to 50
    { duration: '30s', target: 200 },   // ramp to 200
    { duration: '1m',  target: 400 },   // ramp to 400
    { duration: '2m',  target: 400 },   // hold 400
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<8000'],
  },
};

export default function () {
  // 1. Homepage
  group('Homepage', () => {
    const r = http.get(BASE);
    check(r, { 'status 200': (r) => r.status === 200 });
  });
  sleep(1);

  // 2. Login page assets
  group('Login Page', () => {
    const r = http.get(`${BASE}/login`);
    check(r, { 'login page ok': (r) => r.status === 200 });
  });
  sleep(1);

  // 3. SPA routes (all return index.html due to SPA rewrite)
  group('SPA Routes', () => {
    const routes = ['/', '/search', '/add', '/stats', '/complaint', '/admin'];
    const route = routes[Math.floor(Math.random() * routes.length)];
    const r = http.get(`${BASE}${route}`);
    check(r, { 'route ok': (r) => r.status === 200 });
  });
  sleep(1);

  // 4. Static assets
  group('Static Assets', () => {
    const r = http.get(`${BASE}/favicon.ico`, { tags: { static: true } });
    // Just hit the page to trigger asset loading
    http.get(BASE);
  });
  sleep(Math.random() * 2 + 1);

  // 5. Concurrent page loads
  group('Rapid Navigation', () => {
    http.get(`${BASE}/`);
    http.get(`${BASE}/search`);
    http.get(`${BASE}/add`);
  });
  sleep(2);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const total = data.metrics.http_reqs?.values?.count || 0;
  const failed = data.metrics.http_req_failed?.values?.count || 0;
  const avg = data.metrics.http_req_duration?.values?.avg || 0;

  return {
    stdout: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  K6 LOAD TEST — Suda Website
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Requests:  ${total}
  Failed:          ${failed}
  P95 Latency:     ${p95.toFixed(0)}ms
  Avg Latency:     ${avg.toFixed(0)}ms
  Max Latency:     ${(data.metrics.http_req_duration?.values?.max || 0).toFixed(0)}ms
  Status:          ${failed / total < 0.1 ? '✅ PASS' : '❌ FAIL'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    'k6-results.json': JSON.stringify(data, null, 2),
  };
}
