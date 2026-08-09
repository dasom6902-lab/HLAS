/**
 * @fileoverview
 * HLAS-0071 Revision Registry Recovery Safe Test
 *
 * 운영 Business Key와 GitHub를 변경하지 않는다.
 * Test Key의 기존 상태를 Snapshot한 뒤 반드시 복구한다.
 */

/**
 * HLAS-0071 전체 Safe Test.
 *
 * 실행 함수:
 * testRevisionRegistryRecoveryHLAS0071
 *
 * @return {Object}
 */
function testRevisionRegistryRecoveryHLAS0071() {
  const started = Date.now();
  const businessKey = 'TEST:RECOVERY:001';
  const propertyKey = RevisionRegistryService.key(businessKey);
  const properties = PropertiesService.getScriptProperties();
  const snapshot = properties.getProperty(propertyKey);
  const results = [];
  let cleanupResult = 'NOT_RUN';

  try {
    _h71SetRegistryState(properties, propertyKey, null);

    results.push(_h71RunRecoveryCase(
      'CASE_1_SYNCED',
      function() {
        RevisionRegistryService.set(businessKey, 'v1.1');

        const result = RevisionRegistryService._recover(
          businessKey,
          'v1.1'
        );

        _h71AssertEqual('SYNCED', result.status, 'Case 1 status');
        _h71AssertEqual('v1.1', result.registryBefore, 'Case 1 before');
        _h71AssertEqual('v1.1', result.registryAfter, 'Case 1 after');

        return result;
      }
    ));

    results.push(_h71RunRecoveryCase(
      'CASE_2_REPAIRED',
      function() {
        RevisionRegistryService.set(businessKey, 'v1.1');

        const result = RevisionRegistryService._recover(
          businessKey,
          'v1.2'
        );

        _h71AssertEqual('REPAIRED', result.status, 'Case 2 status');
        _h71AssertEqual('v1.1', result.registryBefore, 'Case 2 before');
        _h71AssertEqual('v1.2', result.registryAfter, 'Case 2 after');
        _h71AssertEqual(
          'v1.2',
          RevisionRegistryService.get(businessKey),
          'Case 2 stored value'
        );

        return result;
      }
    ));

    results.push(_h71RunRecoveryCase(
      'CASE_3_REGRESSION_BLOCKED',
      function() {
        RevisionRegistryService.set(businessKey, 'v1.2');

        const result = RevisionRegistryService._recover(
          businessKey,
          'v1.1'
        );

        _h71AssertEqual('BLOCKED', result.status, 'Case 3 status');
        _h71AssertEqual(
          'REGISTRY_AHEAD_OF_GITHUB',
          result.error,
          'Case 3 decision'
        );
        _h71AssertEqual(
          'v1.2',
          RevisionRegistryService.get(businessKey),
          'Case 3 unchanged'
        );

        return result;
      }
    ));

    results.push(_h71RunRecoveryCase(
      'CASE_4_INITIALIZED',
      function() {
        _h71SetRegistryState(properties, propertyKey, null);

        const result = RevisionRegistryService._recover(
          businessKey,
          'v1.0'
        );

        _h71AssertEqual('INITIALIZED', result.status, 'Case 4 status');
        _h71AssertEqual(null, result.registryBefore, 'Case 4 before');
        _h71AssertEqual('v1.0', result.registryAfter, 'Case 4 after');

        return result;
      }
    ));

    results.push(_h71RunRecoveryCase(
      'CASE_5_GITHUB_REVISION_MISSING',
      function() {
        RevisionRegistryService.set(businessKey, 'v1.0');

        const result = RevisionRegistryService._recover(
          businessKey,
          null
        );

        _h71AssertEqual('BLOCKED', result.status, 'Case 5 status');
        _h71AssertEqual(
          'GITHUB_REVISION_REQUIRED',
          result.error,
          'Case 5 decision'
        );
        _h71AssertEqual(
          'v1.0',
          RevisionRegistryService.get(businessKey),
          'Case 5 unchanged'
        );

        return result;
      }
    ));

    results.push(_h71RunRecoveryCase(
      'CASE_6_INVALID_REVISION',
      function() {
        RevisionRegistryService.set(businessKey, 'v1.0');

        const result = RevisionRegistryService._recover(
          businessKey,
          'INVALID'
        );

        _h71AssertEqual('FAILED', result.status, 'Case 6 status');
        _h71AssertContains(
          result.error,
          'REVISION_INVALID',
          'Case 6 error'
        );
        _h71AssertEqual(
          'v1.0',
          RevisionRegistryService.get(businessKey),
          'Case 6 unchanged'
        );

        return result;
      }
    ));

    results.push(_h71RunRecoveryCase(
      'CASE_7_LOCK_FAILURE',
      function() {
        RevisionRegistryService.set(businessKey, 'v1.0');

        const fakeLock = {
          tryLock: function() {
            return false;
          },
          releaseLock: function() {
            throw new Error('UNEXPECTED_RELEASE');
          }
        };

        const result = RevisionRegistryService._recover(
          businessKey,
          'v1.1',
          {
            lock: fakeLock,
            lockTimeoutMs: 0
          }
        );

        _h71AssertEqual('FAILED', result.status, 'Case 7 status');
        _h71AssertEqual(
          'REVISION_RECOVERY_LOCK_FAILED',
          result.error,
          'Case 7 error'
        );
        _h71AssertEqual(
          'v1.0',
          RevisionRegistryService.get(businessKey),
          'Case 7 unchanged'
        );

        return result;
      }
    ));

    results.push(_h71RunRecoveryCase(
      'PUBLIC_API_REGRESSION',
      function() {
        _h71SetRegistryState(properties, propertyKey, null);

        const saveResult = RevisionRegistryService.set(
          businessKey,
          'v2.3'
        );
        const getResult = RevisionRegistryService.get(businessKey);
        const listResult = RevisionRegistryService.list();
        const compareResult = RevisionManager._compare('v2.4', 'v2.3');

        _h71AssertEqual('SAVED', saveResult.status, 'Public set status');
        _h71AssertEqual('v2.3', getResult, 'Public get');
        _h71AssertEqual(
          'v2.3',
          listResult[propertyKey],
          'Public list'
        );
        _h71AssertEqual(1, compareResult, 'Numeric compare');

        return {
          status: 'PASS',
          registryBefore: null,
          registryAfter: getResult,
          elapsedMs: 0
        };
      }
    ));

  } finally {
    _h71SetRegistryState(
      properties,
      propertyKey,
      snapshot === null ? null : snapshot
    );

    const restored = properties.getProperty(propertyKey);

    if (snapshot === null) {
      cleanupResult = restored === null ? 'PASS' : 'FAIL';
    } else {
      cleanupResult = restored === snapshot ? 'PASS' : 'FAIL';
    }
  }

  const failed = results.filter(function(result) {
    return result.result !== 'PASS';
  });

  const summary = {
    taskId: 'HLAS-0071',
    testBusinessKey: businessKey,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    cleanupResult: cleanupResult,
    githubWriteApiCalls: 0,
    githubCommits: 0,
    officialRecordChanges: 0,
    changeLogChanges: 0,
    elapsedMs: Date.now() - started,
    results: results
  };

  Logger.log(
    'HLAS-0071_RESULT=' +
    JSON.stringify(summary)
  );

  if (cleanupResult !== 'PASS') {
    throw new Error(
      'HLAS-0071 CLEANUP_FAILED: ' +
      JSON.stringify(summary)
    );
  }

  if (failed.length > 0) {
    throw new Error(
      'HLAS-0071 TEST_FAILED: ' +
      JSON.stringify(summary)
    );
  }

  return summary;
}

/**
 * @param {string} name
 * @param {Function} testFunction
 * @return {Object}
 */
function _h71RunRecoveryCase(name, testFunction) {
  const started = Date.now();

  try {
    const evidence = testFunction();

    return {
      name: name,
      result: 'PASS',
      status: evidence.status || '',
      registryBefore:
        evidence.registryBefore === undefined
          ? null
          : evidence.registryBefore,
      registryAfter:
        evidence.registryAfter === undefined
          ? null
          : evidence.registryAfter,
      error: evidence.error || '',
      elapsedMs: Date.now() - started
    };

  } catch (error) {
    return {
      name: name,
      result: 'FAIL',
      status: '',
      registryBefore: null,
      registryAfter: null,
      error: error && error.message
        ? error.message
        : String(error),
      elapsedMs: Date.now() - started
    };
  }
}

/**
 * @param {GoogleAppsScript.Properties.Properties} properties
 * @param {string} propertyKey
 * @param {string|null} revision
 */
function _h71SetRegistryState(properties, propertyKey, revision) {
  if (revision === null || revision === undefined) {
    properties.deleteProperty(propertyKey);
    return;
  }

  properties.setProperty(propertyKey, revision);
}

/**
 * @param {*} expected
 * @param {*} actual
 * @param {string} label
 */
function _h71AssertEqual(expected, actual, label) {
  if (expected !== actual) {
    throw new Error(
      label +
      ': expected=' +
      expected +
      ', actual=' +
      actual
    );
  }
}

/**
 * @param {string} actual
 * @param {string} expectedPart
 * @param {string} label
 */
function _h71AssertContains(actual, expectedPart, label) {
  if (String(actual).indexOf(expectedPart) === -1) {
    throw new Error(
      label +
      ': expected part=' +
      expectedPart +
      ', actual=' +
      actual
    );
  }
}
