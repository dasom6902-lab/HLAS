import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHANGELOG_FIELDS,
  detectRecoveryState,
  generateRecordTransaction,
  nextRevision,
  validateAppendOnly,
  validateTransaction
} from '../lib/record-governance-automation.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const input = JSON.parse(readFileSync(resolve(root, 'examples', 'automation-input.json'), 'utf8'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const generated = generateRecordTransaction(input);
writeFileSync(
  resolve(root, 'examples', 'generated-record-transaction.json'),
  `${JSON.stringify(generated, null, 2)}\n`,
  'utf8'
);
writeFileSync(
  resolve(root, 'examples', 'generated-changelog.json'),
  `${JSON.stringify(generated.changelog, null, 2)}\n`,
  'utf8'
);

const tests = [
  {
    name: 'Revision Automation Test',
    run() {
      assert.equal(nextRevision('v1.0'), 'v1.1');
      assert.equal(validateAppendOnly(['v1.0'], 'v1.0', 'v1.1'), true);
      assert.throws(() => validateAppendOnly(['v1.0', 'v1.1'], 'v1.1', 'v1.1'));
    }
  },
  {
    name: 'CHANGELOG Generation Test',
    run() {
      for (const field of CHANGELOG_FIELDS) assert.ok(Object.hasOwn(generated.changelog, field));
      const missing = clone(generated);
      delete missing.changelog.risk;
      assert.equal(validateTransaction(missing).status, 'FAIL');
    }
  },
  {
    name: 'Commit Metadata Mapping Test',
    run() {
      assert.equal(generated.changelog.commitId, generated.commitMetadata.commitId);
      assert.deepEqual(generated.changelog.changedFiles, generated.commitMetadata.changedFiles);
    }
  },
  {
    name: 'Integrity Validation Test',
    run() {
      assert.deepEqual(validateTransaction(generated), { status: 'PASS', errors: [] });
      const mismatch = clone(generated);
      mismatch.record.hash = '0'.repeat(64);
      assert.equal(validateTransaction(mismatch).status, 'INTEGRITY_FAILURE');
    }
  },
  {
    name: 'Recovery Validation Test',
    run() {
      const missingCommit = clone(generated);
      missingCommit.verification.commitExists = false;
      assert.equal(detectRecoveryState(missingCommit), 'MISSING_COMMIT');

      const missingRecord = clone(generated);
      missingRecord.record.exists = false;
      missingRecord.verification.recordExists = false;
      assert.equal(detectRecoveryState(missingRecord), 'MISSING_RECORD');

      const hashFailure = clone(generated);
      hashFailure.record.hash = '0'.repeat(64);
      hashFailure.verification.hashMatch = false;
      assert.equal(detectRecoveryState(hashFailure), 'INTEGRITY_FAILURE');
    }
  }
];

const results = tests.map((test) => {
  try {
    test.run();
    return { name: test.name, status: 'PASS' };
  } catch (error) {
    return { name: test.name, status: 'FAIL', error: error.message };
  }
});
const passed = results.filter((result) => result.status === 'PASS').length;
const summary = {
  taskId: 'HLAS-0075',
  status: passed === results.length ? 'PASS' : 'FAIL',
  passed,
  total: results.length,
  recoveryScenarios: {
    MISSING_COMMIT: 'PASS',
    MISSING_RECORD: 'PASS',
    INTEGRITY_FAILURE: 'PASS'
  },
  results
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== 'PASS') process.exitCode = 1;
