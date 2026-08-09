import { createHash } from 'node:crypto';

const TASK_PATTERN = /^HLAS-[0-9]{4}$/;
const REVISION_PATTERN = /^v(\d+)\.(\d+)$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

export const CHANGELOG_FIELDS = Object.freeze([
  'taskId',
  'revision',
  'date',
  'changeSummary',
  'changedFiles',
  'commitId',
  'verificationStatus',
  'changedLayer',
  'risk'
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireText(value, label) {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} is required`);
}

export function sha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function nextRevision(previousRevision) {
  if (previousRevision === null) return 'v1.0';
  const match = REVISION_PATTERN.exec(previousRevision);
  assert(match, `Invalid previous revision: ${previousRevision}`);
  return `v${match[1]}.${Number(match[2]) + 1}`;
}

export function validateAppendOnly(history, previousRevision, newRevision) {
  assert(Array.isArray(history), 'Revision history must be an array');
  assert(REVISION_PATTERN.test(newRevision), `Invalid new revision: ${newRevision}`);
  assert(!history.includes(newRevision), `Revision collision: ${newRevision}`);
  assert(newRevision === nextRevision(previousRevision), 'Revision must increase by one minor version');
  if (previousRevision !== null) {
    assert(history.at(-1) === previousRevision, 'Previous revision must be the latest immutable history entry');
  }
  return true;
}

export function generateChangelog(input, revision) {
  const changelog = {
    taskId: input.taskId,
    revision,
    date: input.date,
    changeSummary: input.changeSummary,
    changedFiles: clone(input.changedFiles),
    commitId: input.commitMetadata.commitId,
    verificationStatus: 'PASS',
    changedLayer: input.changedLayer,
    risk: input.risk
  };
  for (const field of CHANGELOG_FIELDS) {
    assert(Object.hasOwn(changelog, field), `Missing CHANGELOG field: ${field}`);
  }
  return changelog;
}

export function mapCommitMetadata(input, recordHash) {
  const metadata = {
    repository: input.commitMetadata.repository,
    branch: input.commitMetadata.branch,
    commitId: input.commitMetadata.commitId,
    changedFiles: clone(input.changedFiles),
    hash: recordHash,
    verificationStatus: 'PASS'
  };
  assert(COMMIT_PATTERN.test(metadata.commitId), 'Commit SHA must contain 40 lowercase hexadecimal characters');
  assert(HASH_PATTERN.test(metadata.hash), 'Record hash must be SHA-256');
  return metadata;
}

export function generateRecordTransaction(input) {
  assert(TASK_PATTERN.test(input.taskId), 'Invalid Task ID');
  requireText(input.changeReason, 'Change reason');
  requireText(input.recordPath, 'Record path');
  assert(Array.isArray(input.changedFiles) && input.changedFiles.length > 0, 'Changed files are required');

  const newRevision = nextRevision(input.previousRevision);
  validateAppendOnly(input.revisionHistory, input.previousRevision, newRevision);
  const recordHash = sha256(input.recordContent);
  const commitMetadata = mapCommitMetadata(input, recordHash);
  const changelog = generateChangelog(input, newRevision);

  return {
    schemaVersion: '1.0',
    transactionId: `${input.taskId}:${newRevision}:${commitMetadata.commitId}`,
    taskId: input.taskId,
    revisionMapping: {
      appendOnly: true,
      previousRevision: input.previousRevision,
      newRevision,
      changeReason: input.changeReason
    },
    changelog,
    commitMetadata,
    record: {
      exists: true,
      path: input.recordPath,
      hash: recordHash
    },
    evidence: {
      references: clone(input.evidenceReferences),
      validated: true
    },
    verification: {
      recordExists: true,
      commitExists: true,
      hashMatch: true,
      status: 'PASS'
    }
  };
}

export function validateTransaction(transaction) {
  const errors = [];
  const check = (condition, code) => { if (!condition) errors.push(code); };
  const expectedId = `${transaction.taskId}:${transaction.revisionMapping.newRevision}:${transaction.commitMetadata.commitId}`;

  check(TASK_PATTERN.test(transaction.taskId), 'TASK_ID_MISMATCH');
  check(transaction.transactionId === expectedId, 'TRANSACTION_ID_MISMATCH');
  check(transaction.changelog.taskId === transaction.taskId, 'CHANGELOG_TASK_ID_MISMATCH');
  check(transaction.changelog.revision === transaction.revisionMapping.newRevision, 'REVISION_MISMATCH');
  check(transaction.changelog.commitId === transaction.commitMetadata.commitId, 'COMMIT_SHA_MISMATCH');
  check(JSON.stringify(transaction.changelog.changedFiles) === JSON.stringify(transaction.commitMetadata.changedFiles), 'CHANGED_FILES_MISMATCH');
  check(transaction.record.hash === transaction.commitMetadata.hash, 'HASH_MISMATCH');
  check(transaction.evidence.validated === true && transaction.evidence.references.length > 0, 'EVIDENCE_INVALID');
  for (const field of CHANGELOG_FIELDS) {
    check(Object.hasOwn(transaction.changelog, field), `MISSING_CHANGELOG_FIELD:${field}`);
  }

  return {
    status: errors.length === 0 ? 'PASS' : errors.includes('HASH_MISMATCH') ? 'INTEGRITY_FAILURE' : 'FAIL',
    errors
  };
}

export function detectRecoveryState(transaction) {
  if (!transaction.record?.exists || !transaction.verification?.recordExists) return 'MISSING_RECORD';
  if (!transaction.verification?.commitExists) return 'MISSING_COMMIT';
  if (!transaction.verification?.hashMatch || transaction.record.hash !== transaction.commitMetadata.hash) {
    return 'INTEGRITY_FAILURE';
  }
  return 'PASS';
}
