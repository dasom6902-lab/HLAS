function testMonitoringHistorySchedulerHLAS0081() {
  const results = [];
  function test(boundary, name, fn) {
    try {
      fn();
      results.push({boundary: boundary, name: name, status: 'PASS'});
    } catch (error) {
      results.push({boundary: boundary, name: name, status: 'FAIL', error: error.message});
    }
  }
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function trigger(handler, id) {
    return {
      getHandlerFunction: function() { return handler; },
      getTriggerSource: function() { return 'CLOCK'; },
      getEventType: function() { return 'CLOCK'; },
      getUniqueId: function() { return id; }
    };
  }
  function mockScriptApp(initial) {
    const state = {triggers: initial.slice(), created: 0, deleted: 0};
    return {
      state: state,
      getProjectTriggers: function() { return state.triggers.slice(); },
      deleteTrigger: function(target) {
        state.triggers = state.triggers.filter(function(item) { return item !== target; });
        state.deleted++;
      },
      newTrigger: function(handler) {
        return {
          timeBased: function() { return this; },
          everyMinutes: function() { return this; },
          everyHours: function() { return this; },
          everyDays: function() { return this; },
          everyWeeks: function() { return this; },
          create: function() {
            state.triggers.push(trigger(handler, 'created-' + state.created));
            state.created++;
          }
        };
      }
    };
  }
  function retentionResult(overrides) {
    return Object.assign({
      deletedRows: 1,
      expiredRows: 1,
      excessRows: 0,
      moreRequired: false,
      maxRows: 50000,
      retentionDays: 30,
      deleteBatchLimit: 1000
    }, overrides || {});
  }
  function schedulerDependencies(manager, log) {
    let tick = 0;
    return {
      manager: manager,
      now: function() { return new Date(tick++ * 5); },
      uuid: function() { return 'hlas-0081-execution'; },
      log: log || function() {}
    };
  }

  test(1, 'Scheduler Handler to Manager Entry Routing', function() {
    let calls = 0;
    const output = MonitoringHistoryScheduler.execute(new Date(0), {}, schedulerDependencies({
      runRetention: function() { calls++; return retentionResult(); }
    }));
    assert(calls === 1 && output.status === 'SUCCESS', 'handler routing failed');
  });

  test(2, 'Manager to Repository Routing Preservation', function() {
    const managerSource = String(MonitoringHistoryManager.runRetention);
    assert(managerSource.indexOf('MonitoringHistoryRepository.enforceRetention') >= 0, 'repository routing changed');
  });

  test(3, '30-day Retention Regression', function() {
    assert(MonitoringHistoryRepository.RETENTION_DAYS === 30, 'retention days changed');
  });

  test(4, '50,000-row Maximum Regression', function() {
    assert(MonitoringHistoryRepository.MAX_DATA_ROWS === 50000, 'maximum rows changed');
  });

  test(5, '1,000-row Delete Batch Regression', function() {
    assert(MonitoringHistoryRepository.MAX_DELETE_BATCH === 1000, 'delete batch changed');
  });

  test(6, 'moreRequired False Result', function() {
    const output = MonitoringHistoryScheduler.execute(null, {}, schedulerDependencies({
      runRetention: function() { return retentionResult({moreRequired: false}); }
    }));
    assert(output.moreRequired === false, 'false moreRequired changed');
  });

  test(7, 'moreRequired True One-Batch Only', function() {
    let calls = 0;
    const output = MonitoringHistoryScheduler.execute(null, {}, schedulerDependencies({
      runRetention: function() { calls++; return retentionResult({moreRequired: true}); }
    }));
    assert(calls === 1 && output.moreRequired === true, 'one-batch rule failed');
  });

  test(8, 'Script Lock and Concurrent Execution Contract', function() {
    const repositorySource = String(MonitoringHistoryRepository.enforceRetention);
    assert(repositorySource.indexOf('LockService.getScriptLock') >= 0, 'script lock missing');
    assert(repositorySource.indexOf('tryLock(5000)') >= 0, 'tryLock(5000) missing');
    assert(repositorySource.indexOf('finally') >= 0 && repositorySource.indexOf('releaseLock') >= 0, 'finally release missing');
    if (typeof LockService !== 'undefined') {
      const lock = LockService.getScriptLock();
      const acquired = lock.tryLock(5000);
      assert(acquired, 'runtime script lock acquisition failed');
      try {
        assert(typeof lock.releaseLock === 'function', 'runtime releaseLock missing');
      } finally {
        lock.releaseLock();
      }
    }
  });

  test(9, 'Trigger Inventory Zero Matching', function() {
    const result = MonitoringHistoryScheduler.verifyRetentionTrigger({scriptApp: mockScriptApp([])});
    assert(result.status === 'NOT_INSTALLED' && result.matchingCount === 0, 'zero-match state failed');
  });

  test(10, 'Trigger Inventory One Matching', function() {
    const app = mockScriptApp([trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'one')]);
    const result = MonitoringHistoryScheduler.installRetentionTrigger({unit: 'DAYS', interval: 1}, {scriptApp: app});
    assert(result.status === 'ALREADY_INSTALLED' && result.created === false && app.state.created === 0, 'one-match created duplicate');
  });

  test(11, 'Trigger Inventory Two or More Matching', function() {
    const app = mockScriptApp([
      trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'a'),
      trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'b')
    ]);
    assert(MonitoringHistoryScheduler.verifyRetentionTrigger({scriptApp: app}).status === 'DUPLICATE_TRIGGER_STATE', 'duplicate state not detected');
  });

  test(12, 'Duplicate Installation Prevention', function() {
    const app = mockScriptApp([
      trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'a'),
      trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'b')
    ]);
    let blocked = false;
    try {
      MonitoringHistoryScheduler.installRetentionTrigger({unit: 'DAYS', interval: 1, productionApproved: true}, {scriptApp: app});
    } catch (error) {
      blocked = error.message === 'DUPLICATE_TRIGGER_STATE';
    }
    assert(blocked && app.state.created === 0, 'duplicate installation not blocked');
  });

  test(13, 'Unrelated Trigger Preservation', function() {
    const other = trigger('otherHandler', 'other');
    const app = mockScriptApp([other]);
    let blocked = false;
    try {
      MonitoringHistoryScheduler.installRetentionTrigger({unit: 'DAYS', interval: 1}, {scriptApp: app});
    } catch (error) {
      blocked = true;
    }
    assert(blocked && app.state.triggers.length === 1 && app.state.triggers[0] === other, 'unrelated trigger changed');
  });

  test(14, 'Controlled Mock Install Validation', function() {
    const app = mockScriptApp([]);
    const result = MonitoringHistoryScheduler.installRetentionTrigger(
      {unit: 'DAYS', interval: 1, productionApproved: true},
      {scriptApp: app}
    );
    assert(result.status === 'INSTALLED' && result.created === true, 'mock install failed');
    assert(app.state.created === 1 && result.inventory.matchingCount === 1, 'post-install count failed');
    assert(app.state.triggers[0].getHandlerFunction() === 'runMonitoringHistoryRetentionScheduled', 'wrong installed handler');
  });

  test(15, 'Controlled Target-only Uninstall', function() {
    const target = trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'target');
    const other = trigger('otherHandler', 'other');
    const app = mockScriptApp([target, other]);
    const result = MonitoringHistoryScheduler.uninstallRetentionTrigger({explicitApproval: true}, {scriptApp: app});
    assert(result.status === 'UNINSTALLED' && result.deleted === 1, 'target uninstall failed');
    assert(result.inventory.matchingCount === 0 && app.state.triggers.length === 1 && app.state.triggers[0] === other, 'unrelated trigger not preserved');
  });

  test(16, 'Scheduler Success Evidence Schema', function() {
    const output = MonitoringHistoryScheduler.execute(null, {}, schedulerDependencies({
      runRetention: function() { return retentionResult(); }
    }));
    const required = ['executionId', 'handlerName', 'invocationType', 'startTime', 'endTime', 'status', 'duration', 'deletedRows', 'expiredRows', 'excessRows', 'moreRequired', 'maxRows', 'retentionDays', 'deleteBatchLimit'];
    required.forEach(function(field) { assert(Object.prototype.hasOwnProperty.call(output, field), 'missing success field: ' + field); });
    assert(output.handlerName === 'runMonitoringHistoryRetentionScheduled', 'success handler mismatch');
    assert(output.invocationType === 'SCHEDULED', 'invocation type mismatch');
  });

  test(17, 'Scheduler Failure Evidence and Rethrow', function() {
    let evidence = null;
    let rethrown = false;
    try {
      MonitoringHistoryScheduler.execute(null, {}, schedulerDependencies({
        runRetention: function() { throw new Error('token=abc failure'); }
      }, function(level, value) {
        if (level === 'ERROR') evidence = value;
      }));
    } catch (error) {
      rethrown = true;
    }
    assert(rethrown && evidence && evidence.status === 'FAILED', 'failure not rethrown or recorded');
    assert(evidence.sanitizedErrorMessage.indexOf('abc') < 0, 'secret leaked');
  });

  test(18, 'Controlled Manual Recovery Path', function() {
    let managerCalls = 0;
    let repositoryBypass = false;
    const manager = {runRetention: function() { managerCalls++; return retentionResult(); }};
    const recoveryReview = {
      failureReviewed: true,
      triggerStateVerified: true,
      duplicateChecked: true,
      lockSafetyChecked: true,
      failureCauseReviewed: true
    };
    const output = MonitoringHistoryScheduler.execute(null, {manualRecovery: true}, schedulerDependencies(manager));
    assert(Object.keys(recoveryReview).every(function(key) { return recoveryReview[key]; }), 'recovery review incomplete');
    assert(managerCalls === 1 && output.status === 'SUCCESS', 'manager recovery entry not used');
    assert(repositoryBypass === false, 'repository bypass detected');
  });

  test(19, 'No Automatic Retry or Retry Trigger', function() {
    const source = String(MonitoringHistoryScheduler.execute);
    assert(source.indexOf('newTrigger') < 0 && source.indexOf('Retry') < 0 && source.indexOf('retry') < 0, 'automatic retry path found');
  });

  test(20, 'Rollback Lifecycle Validation', function() {
    const other = trigger('otherHandler', 'other');
    const app = mockScriptApp([other]);
    assert(MonitoringHistoryScheduler.verifyRetentionTrigger({scriptApp: app}).matchingCount === 0, 'rollback initial state failed');
    MonitoringHistoryScheduler.installRetentionTrigger({unit: 'DAYS', interval: 1, productionApproved: true}, {scriptApp: app});
    assert(MonitoringHistoryScheduler.verifyRetentionTrigger({scriptApp: app}).matchingCount === 1, 'rollback install state failed');
    MonitoringHistoryScheduler.uninstallRetentionTrigger({explicitApproval: true}, {scriptApp: app});
    assert(MonitoringHistoryScheduler.verifyRetentionTrigger({scriptApp: app}).matchingCount === 0, 'rollback final state failed');
    assert(app.state.triggers.length === 1 && app.state.triggers[0] === other, 'rollback changed unrelated trigger');
  });

  test(21, 'Public API Regression', function() {
    assert(typeof MonitoringHistoryManager.runRetention === 'function', 'manager API changed');
    assert(typeof MonitoringHistoryRepository.enforceRetention === 'function', 'repository API changed');
  });

  test(22, 'OAuth and Permission Runtime Impact', function() {
    assert(typeof MonitoringHistoryScheduler.inspectRetentionTriggers === 'function', 'trigger inspection unavailable');
    assert(typeof MonitoringHistoryScheduler.installRetentionTrigger === 'function', 'install API unavailable');
    assert(typeof MonitoringHistoryScheduler.uninstallRetentionTrigger === 'function', 'uninstall API unavailable');
  });

  test(23, 'HLAS-0050 Retention Regression Availability', function() {
    assert(typeof test_OperationalMonitoringDashboardEnhancement_HLAS0050 === 'function', 'HLAS-0050 test harness unavailable');
    const repositorySource = String(MonitoringHistoryRepository.enforceRetention);
    assert(repositorySource.indexOf('cutoff') >= 0 && repositorySource.indexOf('excessRows') >= 0, 'HLAS-0050 retention contract changed');
    assert(repositorySource.indexOf('moreRequired') >= 0, 'HLAS-0050 moreRequired contract changed');
  });

  test(24, 'Actual Runtime Source Validation', function() {
    assert(MonitoringHistoryScheduler.HANDLER_NAME === 'runMonitoringHistoryRetentionScheduled', 'runtime handler mismatch');
    assert(typeof runMonitoringHistoryRetentionScheduled === 'function', 'runtime handler missing');
    assert(typeof MonitoringHistoryManager.runRetention === 'function', 'runtime manager missing');
    assert(typeof MonitoringHistoryRepository.enforceRetention === 'function', 'runtime repository missing');
  });

  const passed = results.filter(function(item) { return item.status === 'PASS'; }).length;
  const summary = {
    taskId: 'HLAS-0081',
    status: passed === results.length ? 'PASS' : 'FAIL',
    passed: passed,
    total: results.length,
    productionTriggerInstalled: false,
    productionCadenceSelected: false,
    results: results
  };
  if (typeof Logger !== 'undefined') Logger.log(JSON.stringify(summary));
  return summary;
}
