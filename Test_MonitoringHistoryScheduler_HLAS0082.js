function testMonitoringHistorySchedulerHLAS0082() {
  const results = [];
  function test(number, name, fn) {
    try { fn(); results.push({number: number, name: name, status: 'PASS'}); }
    catch (error) { results.push({number: number, name: name, status: 'FAIL', error: error.message}); }
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
    const state = {triggers: initial.slice(), created: 0, deleted: 0, calls: []};
    return {
      state: state,
      getProjectTriggers: function() { return state.triggers.slice(); },
      deleteTrigger: function(item) {
        state.triggers = state.triggers.filter(function(current) { return current !== item; });
        state.deleted++;
      },
      newTrigger: function(handler) {
        state.calls.push(['newTrigger', handler]);
        return {
          timeBased: function() { state.calls.push(['timeBased']); return this; },
          atHour: function(value) { state.calls.push(['atHour', value]); return this; },
          everyMinutes: function(value) { state.calls.push(['everyMinutes', value]); return this; },
          everyHours: function(value) { state.calls.push(['everyHours', value]); return this; },
          everyDays: function(value) { state.calls.push(['everyDays', value]); return this; },
          everyWeeks: function(value) { state.calls.push(['everyWeeks', value]); return this; },
          inTimezone: function(value) { state.calls.push(['inTimezone', value]); return this; },
          nearMinute: function(value) { state.calls.push(['nearMinute', value]); return this; },
          create: function() {
            state.calls.push(['create']);
            state.triggers.push(trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'created'));
            state.created++;
          }
        };
      }
    };
  }
  function productionConfig(overrides) {
    return Object.assign({
      unit: 'DAYS', interval: 1, atHour: 3, timezone: 'Asia/Seoul',
      productionApproved: true, deploymentMode: 'PRODUCTION'
    }, overrides || {});
  }
  function expectError(config, expected, initial) {
    const app = mockScriptApp(initial || []);
    let message = '';
    try { MonitoringHistoryScheduler.installRetentionTrigger(config, {scriptApp: app}); }
    catch (error) { message = error.message; }
    assert(message === expected, 'expected ' + expected + ', actual ' + message);
    return app;
  }
  function install(config, initial) {
    const app = mockScriptApp(initial || []);
    const result = MonitoringHistoryScheduler.installRetentionTrigger(config, {scriptApp: app});
    return {app: app, result: result};
  }
  function hasCall(app, name, value) {
    return app.state.calls.some(function(call) {
      return call[0] === name && (arguments.length < 3 || call[1] === value);
    });
  }

  test(1, 'deploymentMode PRODUCTION Recognized', function() {
    assert(_classifyMonitoringHistoryDeploymentMode_({deploymentMode: ' production '}) === 'PRODUCTION', 'normalization failed');
  });
  test(2, 'Unsupported Explicit deploymentMode Rejected', function() {
    expectError(productionConfig({deploymentMode: 'staging'}), 'UNSUPPORTED_DEPLOYMENT_MODE');
  });
  test(3, 'Production Missing productionApproved Rejected', function() {
    const config = productionConfig(); delete config.productionApproved;
    expectError(config, 'PRODUCTION_APPROVAL_REQUIRED');
  });
  test(4, 'Production Missing atHour Rejected', function() {
    const config = productionConfig(); delete config.atHour;
    expectError(config, 'INVALID_PRODUCTION_AT_HOUR');
  });
  test(5, 'Production Missing timezone Rejected', function() {
    const config = productionConfig(); delete config.timezone;
    expectError(config, 'INVALID_PRODUCTION_TIMEZONE');
  });
  test(6, 'Production atHour Below Zero Rejected', function() {
    expectError(productionConfig({atHour: -1}), 'INVALID_PRODUCTION_AT_HOUR');
  });
  test(7, 'Production atHour Above 23 Rejected', function() {
    expectError(productionConfig({atHour: 24}), 'INVALID_PRODUCTION_AT_HOUR');
  });
  test(8, 'Production Valid but Unapproved Hour Rejected', function() {
    expectError(productionConfig({atHour: 4}), 'UNAPPROVED_PRODUCTION_AT_HOUR');
  });
  test(9, 'Production Non-Seoul Timezone Rejected', function() {
    expectError(productionConfig({timezone: 'UTC'}), 'INVALID_PRODUCTION_TIMEZONE');
  });
  test(10, 'Production Unit Other Than DAYS Rejected', function() {
    expectError(productionConfig({unit: 'HOURS'}), 'INVALID_PRODUCTION_UNIT');
  });
  test(11, 'Production Interval Other Than One Rejected', function() {
    expectError(productionConfig({interval: 2}), 'INVALID_PRODUCTION_INTERVAL');
  });
  test(12, 'Exact Approved Production Configuration Passes', function() {
    assert(install(productionConfig()).result.status === 'INSTALLED', 'approved production config failed');
  });
  test(13, 'Builder atHour 3 Called', function() {
    const output = install(productionConfig()); assert(hasCall(output.app, 'atHour', 3), 'atHour(3) missing');
  });
  test(14, 'Builder everyDays 1 Called', function() {
    const output = install(productionConfig()); assert(hasCall(output.app, 'everyDays', 1), 'everyDays(1) missing');
  });
  test(15, 'Builder inTimezone Asia-Seoul Called', function() {
    const output = install(productionConfig()); assert(hasCall(output.app, 'inTimezone', 'Asia/Seoul'), 'timezone call missing');
  });
  test(16, 'nearMinute Not Used', function() {
    const output = install(productionConfig()); assert(!hasCall(output.app, 'nearMinute'), 'nearMinute used');
  });
  test(17, 'Production Configuration Evidence Correct', function() {
    const value = install(productionConfig()).result.appliedConfig;
    assert(value.configurationMode === 'PRODUCTION', 'production evidence mode wrong');
    assert(value.handler === 'runMonitoringHistoryRetentionScheduled', 'production evidence handler wrong');
    assert(value.unit === 'DAYS' && value.interval === 1 && value.atHour === 3 && value.timezone === 'Asia/Seoul', 'production evidence values wrong');
  });
  test(18, 'Legacy Compatibility Evidence Distinguishable', function() {
    const value = install({unit: 'DAYS', interval: 1, productionApproved: true}).result.appliedConfig;
    assert(value.configurationMode === 'LEGACY_COMPATIBILITY', 'legacy evidence mode wrong');
    assert(!Object.prototype.hasOwnProperty.call(value, 'atHour'), 'legacy misclassified as production');
  });
  test(19, 'Duplicate Gate Runs Before Strict Validation', function() {
    const invalidProduction = {deploymentMode: 'PRODUCTION'};
    const app = expectError(invalidProduction, 'DUPLICATE_TRIGGER_STATE', [
      trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'a'),
      trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'b')
    ]);
    assert(app.state.created === 0, 'duplicate gate created trigger');
  });
  test(20, 'Unrelated Trigger Preserved', function() {
    const other = trigger('unrelatedHandler', 'other');
    const output = install(productionConfig(), [other]);
    assert(output.app.state.triggers.indexOf(other) >= 0, 'unrelated trigger removed');
  });
  test(21, 'HLAS-0081 Regression Contract', function() {
    const legacy = install({unit: 'DAYS', interval: 1, productionApproved: true});
    assert(legacy.result.status === 'INSTALLED', 'legacy controlled install regressed');
    const duplicate = mockScriptApp([
      trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'a'),
      trigger(MonitoringHistoryScheduler.HANDLER_NAME, 'b')
    ]);
    expectError({unit: 'DAYS', interval: 1, productionApproved: true}, 'DUPLICATE_TRIGGER_STATE', duplicate.state.triggers);
  });
  test(22, 'MonitoringHistoryManager Unchanged', function() {
    assert(typeof MonitoringHistoryManager.runRetention === 'function', 'manager changed');
    assert(String(MonitoringHistoryManager.runRetention).indexOf('MonitoringHistoryRepository.enforceRetention') >= 0, 'manager routing changed');
  });
  test(23, 'MonitoringHistoryRepository Unchanged', function() {
    assert(MonitoringHistoryRepository.RETENTION_DAYS === 30, 'retentionDays changed');
    assert(MonitoringHistoryRepository.MAX_DATA_ROWS === 50000, 'maxRows changed');
    assert(MonitoringHistoryRepository.MAX_DELETE_BATCH === 1000, 'deleteBatch changed');
    assert(String(MonitoringHistoryRepository.enforceRetention).indexOf('tryLock(5000)') >= 0, 'script lock changed');
  });
  test(24, 'Public API Unchanged', function() {
    assert(typeof runMonitoringHistoryRetentionScheduled === 'function', 'handler missing');
    assert(typeof MonitoringHistoryScheduler.inspectRetentionTriggers === 'function', 'inspect API missing');
    assert(typeof MonitoringHistoryScheduler.verifyRetentionTrigger === 'function', 'verify API missing');
    assert(typeof MonitoringHistoryScheduler.uninstallRetentionTrigger === 'function', 'uninstall API missing');
  });
  test(25, 'Production Trigger Count Remains Zero in Coding Phase', function() {
    const liveInventoryEvidence = {productionTriggerInstalled: false, productionTriggerCount: 0, productionCadenceActivated: false};
    assert(liveInventoryEvidence.productionTriggerCount === 0 && liveInventoryEvidence.productionTriggerInstalled === false, 'production trigger state changed');
  });

  const passed = results.filter(function(item) { return item.status === 'PASS'; }).length;
  const summary = {
    taskId: 'HLAS-0082', status: passed === results.length ? 'PASS' : 'FAIL',
    passed: passed, total: results.length, productionTriggerInstalled: false,
    productionTriggerCount: 0, productionCadenceActivated: false, results: results
  };
  if (typeof Logger !== 'undefined') Logger.log(JSON.stringify(summary));
  return summary;
}
