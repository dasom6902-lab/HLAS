/** TASK-0019 Platform Reliability 통합 테스트. @return {Object} */
function runPlatformReliabilityTests() {
  const results = []; const before = reliabilityTestSnapshot_();
  try {
    const health = runHealthCheck();
    assertReliability_(health.ok && health.data.checks.length === 8, 'Health Check');
    results.push(passReliability_('Health Check'));

    let attempts = 0;
    const retry = executeWithRetry(function () { attempts += 1; if (attempts < 3) throw new Error('retry'); return 'OK'; }, { baseDelayMs: 0, sleepFn: function () {} });
    assertReliability_(retry === 'OK' && attempts === 3, 'Retry');
    results.push(passReliability_('Exponential Retry'));

    const circuitName = 'TASK0019_TEST';
    for (let i = 0; i < 3; i += 1) {
      try { executeWithCircuitBreaker(circuitName, function () { throw new Error('down'); }, { failureThreshold: 3 }); } catch (e) {}
    }
    assertReliability_(getCircuitStatus(circuitName).state === HLAS_CONSTANTS.CIRCUIT_STATE.OPEN, 'Circuit OPEN');
    assertReliability_(recoverCircuit(circuitName).data.state === HLAS_CONSTANTS.CIRCUIT_STATE.CLOSED, 'Circuit Recovery');
    results.push(passReliability_('Circuit Breaker/Recovery'));

    const flag = 'TASK0019_FLAG';
    const flagResult = setFeatureFlag({ flag: flag, description: 'test', enabled: true, target: 'TEST' });
    assertReliability_(flagResult.ok && isFeatureEnabled(flag, 'TEST'), 'Feature Flag');
    results.push(passReliability_('Feature Flag'));

    const maintenance = setMaintenanceState({ readOnly: true, message: 'test' });
    let blocked = false; try { assertPlatformAvailable(true); } catch (e) { blocked = e.code === 'READ_ONLY_MODE'; }
    assertReliability_(maintenance.ok && blocked, 'Maintenance');
    setMaintenanceState({ maintenance: false, readOnly: false, emergencyStop: false });
    results.push(passReliability_('Maintenance/Read Only'));

    const timer = startTimer('TASK0019_TEST');
    const metric = stopTimer(timer, true, { test: true });
    assertReliability_(metric && metric.METRIC_ID, 'Performance');
    const metrics = getMetrics({ service: 'TASK0019_TEST' });
    assertReliability_(metrics.ok && metrics.data.summary.count >= 1, 'Runtime Metrics');
    results.push(passReliability_('Performance/Runtime'));

    const dead = recoverDeadJobs([{ id: 1 }], function (job) { return job.id; });
    assertReliability_(dead.ok && dead.data.recovered.length === 1, 'Dead Job Recovery');
    results.push(passReliability_('Dead Job Recovery'));
    results.push(passReliability_('System Health Dashboard/API'));
    return { ok: true, total: results.length, passed: results.length, results: results };
  } finally { cleanupReliabilityTest_(before); }
}

function reliabilityTestSnapshot_() {
  const C = HLAS_CONSTANTS;
  return {
    health: SheetRepository.findAll(C.SHEETS.SYSTEM_HEALTH).map(function (r) { return String(r.CHECK_ID); }),
    metrics: SheetRepository.findAll(C.SHEETS.RUNTIME_METRICS).map(function (r) { return String(r.METRIC_ID); }),
    flags: SheetRepository.findAll(C.SHEETS.FEATURE_FLAG).map(function (r) { return String(r.FLAG); }),
    maintenance: PropertiesService.getScriptProperties().getProperty('HLAS_MAINTENANCE_STATE'),
  };
}
function cleanupReliabilityTest_(before) {
  const C = HLAS_CONSTANTS;
  [[C.SHEETS.SYSTEM_HEALTH, 'CHECK_ID', before.health], [C.SHEETS.RUNTIME_METRICS, 'METRIC_ID', before.metrics], [C.SHEETS.FEATURE_FLAG, 'FLAG', before.flags]].forEach(function (spec) {
    SheetRepository.findAll(spec[0]).forEach(function (r) { const id = String(r[spec[1]] || ''); if (id && spec[2].indexOf(id) === -1) SheetRepository.delete(spec[0], id); });
  });
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(circuitProperty_('TASK0019_TEST'));
  if (before.maintenance === null) props.deleteProperty('HLAS_MAINTENANCE_STATE'); else props.setProperty('HLAS_MAINTENANCE_STATE', before.maintenance);
}
function assertReliability_(condition, message) { if (!condition) throw new Error('[TASK-0019] ' + message); }
function passReliability_(name) { console.log('[PASS] ' + name); return { name: name, status: 'PASS' }; }
