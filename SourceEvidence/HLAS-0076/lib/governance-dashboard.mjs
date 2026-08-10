import { createHash } from 'node:crypto';

const SECRET_KEYS = /token|credential|secret|password|authorization|privateKey/i;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function securityFilter(value) {
  if (Array.isArray(value)) return value.map(securityFilter);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SECRET_KEYS.test(key))
        .map(([key, item]) => [key, securityFilter(item)])
    );
  }
  return value;
}

export function validateDataSource(source) {
  assert(source && Array.isArray(source.tasks), 'Governance task source is required');
  for (const task of source.tasks) {
    assert(/^HLAS-[0-9]{4}$/.test(task.taskId), `Invalid task ID: ${task.taskId}`);
    assert(/^v[0-9]+\.[0-9]+$/.test(task.currentRevision), `Invalid revision: ${task.currentRevision}`);
    assert(Array.isArray(task.revisionHistory) && task.revisionHistory.length > 0, 'Revision history is required');
    assert(task.revisionHistory.at(-1).revision === task.currentRevision, 'Current revision must match latest history');
    assert(task.changelog.taskId === task.taskId, 'CHANGELOG task mapping mismatch');
    assert(task.commit.commitId === task.changelog.commitId, 'Commit mapping mismatch');
    assert(task.evidence.validationResult === 'PASS', 'Evidence validation must pass');
  }
  return true;
}

export function buildDashboardModel(source, refreshedAt = new Date().toISOString()) {
  validateDataSource(source);
  const filtered = securityFilter(source);
  const tasks = filtered.tasks.map((task) => ({
    taskId: task.taskId,
    taskName: task.taskName,
    status: task.status,
    revision: {
      current: task.currentRevision,
      history: clone(task.revisionHistory),
      validationStatus: task.revisionValidationStatus
    },
    changelog: clone(task.changelog),
    commit: clone(task.commit),
    evidence: clone(task.evidence)
  }));

  const metrics = {
    totalGovernanceTasks: tasks.length,
    passedTasks: tasks.filter((task) => task.status === 'PASS').length,
    revisionValid: tasks.filter((task) => task.revision.validationStatus === 'PASS').length,
    changelogVerified: tasks.filter((task) => task.changelog.verificationStatus === 'PASS').length,
    commitsVerified: tasks.filter((task) => task.commit.verificationStatus === 'PASS').length,
    evidenceIntegrityPass: tasks.filter((task) => task.evidence.integrityStatus === 'PASS').length
  };

  return {
    dashboardVersion: '1.0',
    mode: 'READ_ONLY',
    refreshedAt,
    metrics,
    components: {
      governanceSummary: metrics,
      revisionMonitoring: tasks.map(({ taskId, revision }) => ({ taskId, ...revision })),
      changelogMonitoring: tasks.map(({ taskId, changelog }) => ({ taskId, ...changelog })),
      commitVerification: tasks.map(({ taskId, commit }) => ({ taskId, ...commit })),
      evidenceIntegrity: tasks.map(({ taskId, evidence }) => ({ taskId, ...evidence }))
    }
  };
}

export class GovernanceDashboardService {
  #sourceLoader;
  #cacheTtlMs;
  #cache = null;

  constructor(sourceLoader, { cacheTtlMs = 60_000 } = {}) {
    assert(typeof sourceLoader === 'function', 'Source loader is required');
    this.#sourceLoader = sourceLoader;
    this.#cacheTtlMs = cacheTtlMs;
  }

  async refresh({ force = false, now = Date.now() } = {}) {
    if (!force && this.#cache && now - this.#cache.createdAt < this.#cacheTtlMs) {
      return { ...clone(this.#cache.model), refreshSource: 'CACHE' };
    }
    const source = await this.#sourceLoader();
    const model = buildDashboardModel(source, new Date(now).toISOString());
    this.#cache = { createdAt: now, model };
    return { ...clone(model), refreshSource: force ? 'MANUAL' : 'SOURCE' };
  }

  async scheduledRefresh(now = Date.now()) {
    return this.refresh({ force: true, now });
  }
}

export function dashboardDigest(model) {
  return createHash('sha256').update(JSON.stringify(model), 'utf8').digest('hex');
}
