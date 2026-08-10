import { createHash } from 'node:crypto';

const SENSITIVE_KEY = /token|credential|secret|password|authorization|private.?key|personal.?information|email|phone|address/i;

function clone(value) {
  return structuredClone(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

export function dashboardDigest(value) {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

export function securityFilter(value) {
  if (Array.isArray(value)) return value.map(securityFilter);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, item]) => [key, securityFilter(item)]));
  }
  return value;
}

export function createReadOnlyAdapter(sourceLoader) {
  assert(typeof sourceLoader === 'function', 'Source loader is required');
  return deepFreeze({
    async read() {
      return deepFreeze(securityFilter(clone(await sourceLoader())));
    }
  });
}

export function validateDataSource(source) {
  assert(source && Array.isArray(source.tasks), 'Governance task source is required');
  for (const task of source.tasks) {
    assert(/^HLAS-[0-9]{4}$/.test(task.taskId), `Invalid task ID: ${task.taskId}`);
    assert(/^v\d+\.\d+$/.test(task.currentRevision), `Invalid revision: ${task.currentRevision}`);
    assert(Array.isArray(task.revisionHistory) && task.revisionHistory.length > 0, 'Revision history is required');
    assert(task.changelog && task.commit && task.evidence, 'Governance mappings are required');
  }
  return true;
}

function mappingStatus(task) {
  const revisionMatch = task.revisionHistory.at(-1)?.revision === task.currentRevision;
  const changelogMatch = task.changelog.taskId === task.taskId;
  const commitMatch = task.commit.commitId === task.changelog.commitId;
  const evidenceMatch = task.evidence.validationResult === 'PASS' && task.evidence.integrityStatus === 'PASS';
  return {
    revision: revisionMatch ? task.revisionValidationStatus : 'MISMATCH',
    changelog: changelogMatch ? task.changelog.verificationStatus : 'MISMATCH',
    commit: commitMatch ? task.commit.verificationStatus : 'MISMATCH',
    evidence: evidenceMatch ? 'PASS' : 'MISMATCH',
    aggregate: revisionMatch && changelogMatch && commitMatch && evidenceMatch ? 'PASS' : 'MISMATCH'
  };
}

export function buildDashboardModel(source, refreshedAt = new Date().toISOString(), cacheState = 'MISS') {
  validateDataSource(source);
  const filtered = securityFilter(source);
  const tasks = filtered.tasks.map((task) => {
    const mapping = mappingStatus(task);
    return {
      taskId: task.taskId,
      taskStatus: task.status,
      currentRevision: task.currentRevision,
      revisionHistory: clone(task.revisionHistory),
      revisionValidationStatus: mapping.revision,
      changeSummary: task.changelog.changeSummary,
      changelogVerificationStatus: mapping.changelog,
      commitId: task.commit.commitId,
      commitMessage: task.commit.commitMessage,
      commitVerificationStatus: mapping.commit,
      evidenceReference: task.evidence.reference,
      validationResult: task.evidence.validationResult,
      integrityStatus: mapping.evidence,
      qaStatus: task.qaStatus,
      storageVerificationStatus: task.storageVerificationStatus,
      remainingRisk: clone(task.remainingRisk ?? []),
      lastRefresh: refreshedAt,
      cacheState,
      mappingStatus: mapping.aggregate
    };
  });
  const metrics = {
    totalGovernanceTasks: tasks.length,
    passedTasks: tasks.filter((task) => task.taskStatus === 'PASS').length,
    mappingPass: tasks.filter((task) => task.mappingStatus === 'PASS').length,
    integrityPass: tasks.filter((task) => task.integrityStatus === 'PASS').length
  };
  return deepFreeze({
    dashboardVersion: '2.0',
    mode: 'READ_ONLY',
    refreshedAt,
    cacheState,
    metrics,
    tasks,
    components: {
      governanceSummary: metrics,
      revisionMonitoring: tasks.map(({ taskId, currentRevision, revisionHistory, revisionValidationStatus }) => ({ taskId, currentRevision, revisionHistory, revisionValidationStatus })),
      changelogMonitoring: tasks.map(({ taskId, changeSummary, changelogVerificationStatus }) => ({ taskId, changeSummary, changelogVerificationStatus })),
      commitMetadataMonitoring: tasks.map(({ taskId, commitId, commitMessage, commitVerificationStatus }) => ({ taskId, commitId, commitMessage, commitVerificationStatus })),
      evidenceIntegrityMonitoring: tasks.map(({ taskId, evidenceReference, validationResult, integrityStatus }) => ({ taskId, evidenceReference, validationResult, integrityStatus })),
      governanceStatusMonitoring: tasks.map(({ taskId, taskStatus, qaStatus, storageVerificationStatus, remainingRisk, mappingStatus }) => ({ taskId, taskStatus, qaStatus, storageVerificationStatus, remainingRisk, mappingStatus }))
    }
  });
}

export class GovernanceDashboardService {
  #adapter;
  #cacheTtlMs;
  #cache = null;

  constructor(sourceLoader, { cacheTtlMs = 60_000 } = {}) {
    this.#adapter = createReadOnlyAdapter(sourceLoader);
    this.#cacheTtlMs = cacheTtlMs;
  }

  async refresh({ force = false, scheduled = false, now = Date.now() } = {}) {
    const age = this.#cache ? now - this.#cache.createdAt : Infinity;
    if (!force && !scheduled && this.#cache && age < this.#cacheTtlMs) {
      const model = buildDashboardModel(this.#cache.source, new Date(now).toISOString(), 'HIT');
      return { ...clone(model), refreshSource: 'CACHE', cacheAgeMs: age, sourceDigest: this.#cache.sourceDigest };
    }
    const source = await this.#adapter.read();
    const sourceDigest = dashboardDigest(source);
    const previousDigest = this.#cache?.sourceDigest ?? null;
    const cacheState = this.#cache && age >= this.#cacheTtlMs ? 'STALE_REFRESHED' : 'MISS';
    this.#cache = { createdAt: now, source: clone(source), sourceDigest };
    const model = buildDashboardModel(source, new Date(now).toISOString(), cacheState);
    return {
      ...clone(model),
      refreshSource: scheduled ? 'SCHEDULED' : force ? 'FORCED' : 'SOURCE',
      cacheAgeMs: 0,
      sourceDigest,
      sourceCacheConsistency: previousDigest === null || previousDigest === sourceDigest ? 'MATCH' : 'SOURCE_CHANGED'
    };
  }

  scheduledRefresh(now = Date.now()) {
    return this.refresh({ scheduled: true, now });
  }
}
