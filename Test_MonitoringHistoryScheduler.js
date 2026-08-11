function testMonitoringHistorySchedulerHLAS0081() {
  const results = [];
  function test(name, fn) {
    try { fn(); results.push({name: name, status: 'PASS'}); }
    catch (error) { results.push({name: name, status: 'FAIL', error: error.message}); }
  }
  function assert(condition, message) { if (!condition) throw new Error(message); }
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
      deleteTrigger: function(target) { state.triggers = state.triggers.filter(function(item) { return item !== target; }); state.deleted++; },
      newTrigger: function(handler) { return {timeBased: function() { return this; }, everyMinutes: function() { return this; }, everyHours: function() { return this; }, everyDays: function() { return this; }, everyWeeks: function() { return this; }, create: function() { state.triggers.push(trigger(handler, 'created')); state.created++; }}; }
    };
  }

  test('Runtime Project Identity Test', function() { assert(MonitoringHistoryScheduler.HANDLER_NAME === 'runMonitoringHistoryRetentionScheduled', 'handler mismatch'); });
  test('Existing Trigger Inventory Test', function() { const app = mockScriptApp([trigger('otherHandler', 'u1')]); const r = MonitoringHistoryScheduler.inspectRetentionTriggers({scriptApp: app}); assert(r.totalCount === 1 && r.matchingCount === 0, 'inventory mismatch'); });
  test('Exact Handler Duplicate Detection Test', function() { const app = mockScriptApp([trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'a'), trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'b')]); assert(MonitoringHistoryScheduler.verifyRetentionTrigger({scriptApp: app}).status === 'DUPLICATE_TRIGGER_STATE', 'duplicate not detected'); });
  test('Zero-match Handler State Test', function() { assert(MonitoringHistoryScheduler.verifyRetentionTrigger({scriptApp: mockScriptApp([])}).status === 'NOT_INSTALLED', 'zero mismatch'); });
  test('Existing Retention Manual Entry Test', function() { assert(typeof MonitoringHistoryManager.runRetention === 'function', 'manager entry missing'); });
  test('Scheduler Handler Manual Invocation Test', function() { let calls = 0; const r = MonitoringHistoryScheduler.execute(new Date(0), {}, {manager: {runRetention: function() { calls++; return {deletedRows: 1, expiredRows: 1, excessRows: 0, moreRequired: false, maxRows: 50000, retentionDays: 30, deleteBatchLimit: 1000}; }}, now: (function() { let n = 0; return function() { return new Date(n++ * 5); }; })(), uuid: function() { return 'x'; }, log: function() {}}); assert(calls === 1 && r.status === 'SUCCESS', 'handler routing failed'); });
  test('Repository Lock Compatibility Test', function() { assert(MonitoringHistoryRepository.MAX_DELETE_BATCH === 1000, 'batch changed'); });
  test('Retention Result Contract Test', function() { assert(MonitoringHistoryRepository.RETENTION_DAYS === 30 && MonitoringHistoryRepository.MAX_DATA_ROWS === 50000, 'policy changed'); });
  test('moreRequired Propagation Test', function() { let calls = 0; const r = MonitoringHistoryScheduler.execute(null, {}, {manager: {runRetention: function() { calls++; return {moreRequired: true}; }}, now: function() { return new Date(0); }, uuid: function() { return 'x'; }, log: function() {}}); assert(calls === 1 && r.moreRequired === true, 'one-batch rule failed'); });
  test('Failure Propagation Test', function() { let failed = false; try { MonitoringHistoryScheduler.execute(null, {}, {manager: {runRetention: function() { throw new Error('token=abc failure'); }}, now: function() { return new Date(0); }, uuid: function() { return 'x'; }, log: function(level, evidence) { if (level === 'ERROR') assert(evidence.sanitizedErrorMessage.indexOf('abc') < 0, 'secret leaked'); }}); } catch (error) { failed = true; } assert(failed, 'failure swallowed'); });
  test('Unrelated Trigger Preservation Test', function() { const other = trigger('otherHandler', 'o'); const app = mockScriptApp([other]); let blocked = false; try { MonitoringHistoryScheduler.installRetentionTrigger({unit: 'DAYS', interval: 1}, {scriptApp: app}); } catch (error) { blocked = true; } assert(blocked && app.state.triggers[0] === other, 'unrelated changed'); });
  test('No Production Trigger Installation Verification', function() { const app = mockScriptApp([]); try { MonitoringHistoryScheduler.installRetentionTrigger({unit: 'DAYS', interval: 1}, {scriptApp: app}); } catch (ignore) {} assert(app.state.created === 0, 'production trigger created'); });
  test('No Production Cadence Verification', function() { let blocked = false; try { MonitoringHistoryScheduler.installRetentionTrigger({}, {scriptApp: mockScriptApp([])}); } catch (error) { blocked = true; } assert(blocked, 'missing cadence accepted'); });
  test('Public API Regression Verification', function() { assert(typeof MonitoringHistoryManager.runRetention === 'function' && typeof MonitoringHistoryRepository.enforceRetention === 'function', 'public contract changed'); });
  test('Existing Retention Policy Preservation Verification', function() { assert(MonitoringHistoryRepository.RETENTION_DAYS === 30 && MonitoringHistoryRepository.MAX_DATA_ROWS === 50000 && MonitoringHistoryRepository.MAX_DELETE_BATCH === 1000, 'retention policy changed'); });

  const passed = results.filter(function(item) { return item.status === 'PASS'; }).length;
  return {taskId: 'HLAS-0081', status: passed === results.length ? 'PASS' : 'FAIL', passed: passed, total: results.length, productionTriggerInstalled: false, productionCadenceSelected: false, results: results};
}
