import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GovernanceDashboardService, buildDashboardModel, createReadOnlyAdapter, dashboardDigest, securityFilter, validateDataSource } from '../lib/governance-dashboard.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(readFileSync(resolve(root, 'examples/governance-source.json'), 'utf8'));
const generated = buildDashboardModel(source, '2026-08-11T00:00:00.000Z');
const thresholdMs = 250;
const performanceEvidence = {};

const tests = [
  ['Dashboard Load Test', async () => assert.equal(validateDataSource(source), true)],
  ['Revision Data Mapping Test', async () => assert.equal(generated.tasks[0].revisionValidationStatus, 'PASS')],
  ['CHANGELOG Mapping Test', async () => assert.equal(generated.tasks[1].changelogVerificationStatus, 'PASS')],
  ['Commit Metadata Mapping Test', async () => assert.equal(generated.tasks[1].commitId, source.tasks[1].commit.commitId)],
  ['Evidence Validation Mapping Test', async () => assert.equal(generated.tasks[0].integrityStatus, 'PASS')],
  ['Governance Status Mapping Test', async () => {
    const mismatch = structuredClone(source);
    mismatch.tasks[0].changelog.commitId = '0'.repeat(40);
    assert.equal(buildDashboardModel(mismatch).tasks[0].mappingStatus, 'MISMATCH');
  }],
  ['Read Only Protection Test', async () => {
    const adapter = createReadOnlyAdapter(async () => source);
    assert.equal('write' in adapter || 'update' in adapter || 'delete' in adapter, false);
    const readOnlySource = await adapter.read();
    assert.throws(() => { readOnlySource.tasks[0].status = 'FAIL'; }, TypeError);
    assert.equal(source.tasks[0].status, 'PASS');
  }],
  ['Refresh Test', async () => {
    const service = new GovernanceDashboardService(async () => source, { cacheTtlMs: 100 });
    assert.equal((await service.refresh({ now: 1_000 })).refreshSource, 'SOURCE');
    assert.equal((await service.refresh({ now: 1_001 })).refreshSource, 'CACHE');
    assert.equal((await service.refresh({ force: true, now: 1_002 })).refreshSource, 'FORCED');
    assert.equal((await service.scheduledRefresh(1_003)).refreshSource, 'SCHEDULED');
  }],
  ['Cache Consistency Test', async () => {
    const service = new GovernanceDashboardService(async () => source, { cacheTtlMs: 10 });
    const initial = await service.refresh({ now: 1_000 });
    const hit = await service.refresh({ now: 1_001 });
    const stale = await service.refresh({ now: 1_011 });
    assert.equal(hit.cacheState, 'HIT');
    assert.equal(hit.sourceDigest, initial.sourceDigest);
    assert.equal(stale.cacheState, 'STALE_REFRESHED');
    assert.equal(stale.sourceCacheConsistency, 'MATCH');
  }],
  ['Performance Test', async () => {
    const service = new GovernanceDashboardService(async () => source);
    let started = performance.now();
    await service.refresh({ now: 1_000 });
    performanceEvidence.cacheMissDurationMs = +(performance.now() - started).toFixed(3);
    started = performance.now();
    await service.refresh({ now: 1_001 });
    performanceEvidence.cacheHitDurationMs = +(performance.now() - started).toFixed(3);
    started = performance.now();
    await service.refresh({ force: true, now: 1_002 });
    performanceEvidence.forcedRefreshDurationMs = +(performance.now() - started).toFixed(3);
    assert.ok(Math.max(...Object.values(performanceEvidence)) < thresholdMs);
  }],
  ['Security Filtering Test', async () => {
    const filtered = securityFilter({ safe: 'PASS', token: 'x', credential: 'x', password: 'x', authorization: 'x', privateKey: 'x', email: 'x', phone: 'x' });
    assert.deepEqual(filtered, { safe: 'PASS' });
    assert.equal(JSON.stringify(generated).includes('TEST_FILTER_SENTINEL'), false);
  }]
];

const results = [];
const startedAt = performance.now();
for (const [name, run] of tests) {
  const started = performance.now();
  try {
    await run();
    results.push({ name, status: 'PASS', durationMs: +(performance.now() - started).toFixed(3) });
  } catch (error) {
    results.push({ name, status: 'FAIL', durationMs: +(performance.now() - started).toFixed(3), error: error.message });
  }
}
const totalDurationMs = +(performance.now() - startedAt).toFixed(3);
const passed = results.filter(({ status }) => status === 'PASS').length;
const summary = {
  taskId: 'HLAS-0076', status: passed === tests.length ? 'PASS' : 'FAIL', passed, total: tests.length,
  environment: { runtime: process.version, platform: process.platform, architecture: process.arch },
  dataVolume: { tasks: source.tasks.length, sourceBytes: Buffer.byteLength(JSON.stringify(source), 'utf8') },
  performance: { ...performanceEvidence, totalDurationMs, thresholdMs, result: Math.max(...Object.values(performanceEvidence)) < thresholdMs ? 'PASS' : 'FAIL' },
  dashboardDigest: dashboardDigest(generated), results
};
writeFileSync(resolve(root, 'examples/generated-dashboard-model.json'), `${JSON.stringify(generated, null, 2)}\n`);
writeFileSync(resolve(root, 'examples/test-result.json'), `${JSON.stringify(summary, null, 2)}\n`);
const rows = results.map((r) => `| ${r.name} | ${r.status} | ${r.durationMs}ms |`).join('\n');
writeFileSync(resolve(root, 'ValidationResult.md'), `# HLAS-0076 Runtime Validation Result\n\n- Result: ${passed} / ${tests.length} PASS\n- Runtime: ${process.version} (${process.platform}/${process.arch})\n- Data volume: ${source.tasks.length} tasks, ${summary.dataVolume.sourceBytes} bytes\n- Cache miss: ${performanceEvidence.cacheMissDurationMs}ms\n- Cache hit: ${performanceEvidence.cacheHitDurationMs}ms\n- Forced refresh: ${performanceEvidence.forcedRefreshDurationMs}ms\n- Threshold: ${thresholdMs}ms\n- Performance: ${summary.performance.result}\n\n| Test | Result | Duration |\n| --- | --- | ---: |\n${rows}\n\nDashboard digest: \`${summary.dashboardDigest}\`\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== 'PASS') process.exitCode = 1;
