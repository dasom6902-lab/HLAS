import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GovernanceDashboardService,
  buildDashboardModel,
  dashboardDigest,
  securityFilter,
  validateDataSource
} from '../lib/governance-dashboard.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = JSON.parse(readFileSync(resolve(root, 'examples', 'governance-source.json'), 'utf8'));
const fixedTime = '2026-08-10T00:00:00.000Z';
const generated = buildDashboardModel(source, fixedTime);

writeFileSync(resolve(root, 'examples', 'generated-dashboard-model.json'), `${JSON.stringify(generated, null, 2)}\n`);

const tests = [
  {
    name: 'Data Source Validation',
    async run() {
      assert.equal(validateDataSource(source), true);
    }
  },
  {
    name: 'Dashboard Metric Validation',
    async run() {
      assert.equal(generated.metrics.totalGovernanceTasks, source.tasks.length);
      assert.equal(generated.metrics.passedTasks, 2);
    }
  },
  {
    name: 'Revision Monitoring Test',
    async run() {
      assert.equal(generated.components.revisionMonitoring[1].current, 'v1.0');
      assert.equal(generated.components.revisionMonitoring[1].validationStatus, 'PASS');
    }
  },
  {
    name: 'CHANGELOG Monitoring Test',
    async run() {
      assert.equal(generated.components.changelogMonitoring[0].taskId, 'HLAS-0073');
      assert.equal(generated.components.changelogMonitoring[0].verificationStatus, 'PASS');
    }
  },
  {
    name: 'Commit Verification Test',
    async run() {
      assert.match(generated.components.commitVerification[1].commitId, /^[0-9a-f]{40}$/);
      assert.equal(generated.components.commitVerification[1].verificationStatus, 'PASS');
    }
  },
  {
    name: 'Evidence Integrity Test',
    async run() {
      assert.equal(generated.components.evidenceIntegrity[0].integrityStatus, 'PASS');
      const filtered = securityFilter({ publicStatus: 'PASS', token: 'TEST_ONLY_SENTINEL' });
      assert.deepEqual(filtered, { publicStatus: 'PASS' });
    }
  },
  {
    name: 'Refresh Performance Test',
    async run() {
      let loads = 0;
      const service = new GovernanceDashboardService(async () => { loads += 1; return source; });
      const start = performance.now();
      const first = await service.refresh({ now: 1_000 });
      const cached = await service.refresh({ now: 1_001 });
      const manual = await service.refresh({ force: true, now: 2_000 });
      const elapsedMs = performance.now() - start;
      assert.equal(first.refreshSource, 'SOURCE');
      assert.equal(cached.refreshSource, 'CACHE');
      assert.equal(manual.refreshSource, 'MANUAL');
      assert.equal(loads, 2);
      assert.ok(elapsedMs < 250, `Refresh exceeded 250ms: ${elapsedMs}`);
    }
  }
];

const results = [];
const startedAt = performance.now();
for (const test of tests) {
  try {
    const testStart = performance.now();
    await test.run();
    results.push({ name: test.name, status: 'PASS', durationMs: Number((performance.now() - testStart).toFixed(3)) });
  } catch (error) {
    results.push({ name: test.name, status: 'FAIL', error: error.message });
  }
}
const totalDurationMs = Number((performance.now() - startedAt).toFixed(3));
const passed = results.filter((result) => result.status === 'PASS').length;
const summary = {
  taskId: 'HLAS-0076',
  status: passed === results.length ? 'PASS' : 'FAIL',
  passed,
  total: results.length,
  totalDurationMs,
  performanceThresholdMs: 250,
  dashboardDigest: dashboardDigest(generated),
  results
};
writeFileSync(resolve(root, 'examples', 'test-result.json'), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== 'PASS') process.exitCode = 1;
