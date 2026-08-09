import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const schema = JSON.parse(readFileSync(resolve(root, 'transaction.schema.json'), 'utf8'));
const baseline = JSON.parse(
  readFileSync(resolve(root, 'examples', 'HLAS-0072-v1.0-transaction.json'), 'utf8')
);

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const TASK_PATTERN = /^HLAS-[0-9]{4}$/;
const REVISION_PATTERN = /^v([0-9]+)\.([0-9]+)$/;
const REQUIRED_CHANGELOG_FIELDS = [
  'taskId',
  'revision',
  'date',
  'changeSummary',
  'changedLayer',
  'changedFiles',
  'commitId',
  'risk',
  'verificationStatus'
];
const REQUIRED_COMMIT_FIELDS = [
  'repository',
  'branch',
  'commitId',
  'changedFiles',
  'hash',
  'verificationStatus'
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireFields(value, fields, label) {
  for (const field of fields) {
    assert.ok(Object.hasOwn(value, field), `${label}.${field} is required`);
  }
}

function compareRevision(left, right) {
  const leftMatch = REVISION_PATTERN.exec(left);
  const rightMatch = REVISION_PATTERN.exec(right);
  assert.ok(leftMatch, `Invalid revision: ${left}`);
  assert.ok(rightMatch, `Invalid revision: ${right}`);
  const leftValue = Number(leftMatch[1]) * 1_000_000 + Number(leftMatch[2]);
  const rightValue = Number(rightMatch[1]) * 1_000_000 + Number(rightMatch[2]);
  return Math.sign(leftValue - rightValue);
}

export function validateTransaction(transaction) {
  requireFields(transaction, schema.required, 'transaction');
  assert.equal(transaction.schemaVersion, '1.0');
  assert.match(transaction.taskId, TASK_PATTERN);
  assert.match(transaction.commitMetadata.commitId, SHA_PATTERN);
  assert.match(transaction.commitMetadata.hash, HASH_PATTERN);
  assert.match(transaction.record.hash, HASH_PATTERN);

  const expectedId = [
    transaction.taskId,
    transaction.revisionMapping.newRevision,
    transaction.commitMetadata.commitId
  ].join(':');
  assert.equal(transaction.transactionId, expectedId);

  assert.equal(transaction.revisionMapping.appendOnly, true);
  assert.ok(transaction.revisionMapping.changeReason.trim());
  if (transaction.revisionMapping.previousRevision !== null) {
    assert.equal(
      compareRevision(
        transaction.revisionMapping.newRevision,
        transaction.revisionMapping.previousRevision
      ),
      1,
      'New revision must be greater than previous revision'
    );
  }

  requireFields(transaction.changelog, REQUIRED_CHANGELOG_FIELDS, 'changelog');
  requireFields(transaction.commitMetadata, REQUIRED_COMMIT_FIELDS, 'commitMetadata');
  assert.equal(transaction.changelog.taskId, transaction.taskId);
  assert.equal(
    transaction.changelog.revision,
    transaction.revisionMapping.newRevision
  );
  assert.equal(
    transaction.changelog.commitId,
    transaction.commitMetadata.commitId
  );
  assert.deepEqual(
    transaction.changelog.changedFiles,
    transaction.commitMetadata.changedFiles
  );
  assert.equal(
    transaction.record.hash,
    transaction.commitMetadata.hash,
    'Record and commit metadata hashes must match'
  );

  return true;
}

export function detectRecoveryState(transaction) {
  if (!transaction.verification.recordExists || !transaction.record.exists) {
    return 'MISSING_RECORD';
  }
  if (!transaction.verification.commitExists) {
    return 'MISSING_COMMIT';
  }
  if (
    !transaction.verification.hashMatch ||
    transaction.record.hash !== transaction.commitMetadata.hash
  ) {
    return 'INTEGRITY_FAILURE';
  }
  return 'PASS';
}

const tests = [
  {
    name: 'Transaction Identifier Validation',
    run() {
      assert.equal(validateTransaction(clone(baseline)), true);
    }
  },
  {
    name: 'Revision Append Only Test',
    run() {
      const value = clone(baseline);
      value.revisionMapping.previousRevision = 'v1.0';
      value.revisionMapping.newRevision = 'v1.1';
      value.changelog.revision = 'v1.1';
      value.transactionId = `${value.taskId}:v1.1:${value.commitMetadata.commitId}`;
      assert.equal(validateTransaction(value), true);

      const regression = clone(value);
      regression.revisionMapping.newRevision = 'v1.0';
      regression.changelog.revision = 'v1.0';
      regression.transactionId = `${regression.taskId}:v1.0:${regression.commitMetadata.commitId}`;
      assert.throws(() => validateTransaction(regression));
    }
  },
  {
    name: 'CHANGELOG Mapping Test',
    run() {
      const value = clone(baseline);
      delete value.changelog.risk;
      assert.throws(() => validateTransaction(value));
    }
  },
  {
    name: 'Commit Metadata Validation',
    run() {
      const value = clone(baseline);
      value.commitMetadata.commitId = '0'.repeat(40);
      assert.throws(() => validateTransaction(value));
    }
  },
  {
    name: 'Recovery Scenario Test',
    run() {
      const missingRecord = clone(baseline);
      missingRecord.record.exists = false;
      missingRecord.verification.recordExists = false;
      assert.equal(detectRecoveryState(missingRecord), 'MISSING_RECORD');

      const missingCommit = clone(baseline);
      missingCommit.verification.commitExists = false;
      assert.equal(detectRecoveryState(missingCommit), 'MISSING_COMMIT');

      const hashMismatch = clone(baseline);
      hashMismatch.record.hash = '0'.repeat(64);
      hashMismatch.verification.hashMatch = false;
      assert.equal(detectRecoveryState(hashMismatch), 'INTEGRITY_FAILURE');
    }
  }
];

const results = [];
for (const test of tests) {
  try {
    test.run();
    results.push({ name: test.name, status: 'PASS' });
  } catch (error) {
    results.push({ name: test.name, status: 'FAIL', error: error.message });
  }
}

const passed = results.filter((result) => result.status === 'PASS').length;
const summary = {
  taskId: 'HLAS-0073',
  status: passed === results.length ? 'PASS' : 'FAIL',
  passed,
  total: results.length,
  results
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== 'PASS') {
  process.exitCode = 1;
}
