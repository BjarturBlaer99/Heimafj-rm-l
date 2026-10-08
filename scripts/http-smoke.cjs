// Read-only HTTP smoke checks. No login, writes, cookies, or customer data.
// Measures response timing from this machine, not browser rendering/Core Web Vitals.
const fs = require('node:fs/promises');
const path = require('node:path');
const arg = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const origin = new URL(arg('origin', 'https://minfjarmal.vercel.app')).origin;
const output = arg('output', 'next-qa-http-results.json');
const publicPages = ['/', '/login', '/signup', '/forgot-password', '/help', '/privacy', '/demo'];
const privatePages = ['/dashboard', '/monthly-overview', '/income', '/expenses', '/transactions', '/bills', '/budgets', '/savings-goals', '/real-estate', '/markets', '/analytics', '/settings'];
const samples = [];
async function check(route, expectation, round) {
  const start = performance.now();
  try {
    const response = await fetch(new URL(route, origin), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    const headersMs = performance.now() - start;
    const body = await response.arrayBuffer();
    const totalMs = performance.now() - start;
    const location = response.headers.get('location');
    const passed = expectation === 'login'
      ? [302,303,307,308].includes(response.status) && location && new URL(location, origin).origin === origin && new URL(location, origin).pathname === '/login'
      : response.status === expectation;
    const sample = { route, round, status: response.status, headersMs: Math.round(headersMs), totalMs: Math.round(totalMs), decodedBytes: body.byteLength, cache: response.headers.get('x-vercel-cache'), location, passed: Boolean(passed) };
    samples.push(sample);
    console.log(JSON.stringify(sample));
  } catch (error) {
    const sample = { route, round, passed: false, error: error.message, cause: error.cause?.code, elapsedMs: Math.round(performance.now() - start) };
    samples.push(sample);
    console.log(JSON.stringify(sample));
  }
}
(async () => {
  for (let round = 1; round <= 3; round++) for (const route of publicPages) await check(route, 200, round);
  for (const route of privatePages) await check(route, 'login', 1);
  await check('/api/data/export?format=json', 401, 1);
  await check('/api/data/export?format=csv', 401, 1);
  const summary = publicPages.map(route => {
    const rows = samples.filter(sample => sample.route === route && sample.passed);
    const sorted = key => rows.map(row => row[key]).sort((a,b)=>a-b);
    const median = key => sorted(key)[Math.floor(rows.length / 2)] ?? null;
    return { route, successfulSamples: rows.length, medianHeadersMs: median('headersMs'), medianTotalMs: median('totalMs'), maxTotalMs: rows.length ? Math.max(...sorted('totalMs')) : null };
  });
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fs.writeFile(output, JSON.stringify({ timestamp: new Date().toISOString(), origin, method: 'Sequential anonymous HTTP GET, three public-page rounds, no artificial throttling; headers timing includes connection setup. Full response timing does not measure browser rendering.', summary, samples }, null, 2));
  console.log(JSON.stringify({ passed: samples.filter(row=>row.passed).length, failed: samples.filter(row=>!row.passed).length, summary }));
  if (samples.some(row=>!row.passed)) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
