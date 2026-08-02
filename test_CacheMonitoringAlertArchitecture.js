/**
 * @fileoverview HLAS-0040 Cache Monitoring & Alert Architecture Test
 * 운영 Sheet를 변경하지 않는 비파괴 테스트
 */

function test_CacheMonitoringAlertArchitecture() {
  const testDomain = 'HLAS0040_TEST';
  const testKey = 'MONITORING';
  let passed = 0;

  Logger.log('=== HLAS-0040 Cache Monitoring Test 시작 ===');

  try {
    CacheMetricManager.clear(testDomain, testKey);

    _assertHLAS0040(
      typeof CacheMetricManager !== 'undefined' &&
      typeof CacheMonitoringManager !== 'undefined',
      'Monitoring Module 존재'
    );
    passed++;

    CacheMetricManager.recordHit(testDomain, testKey);
    CacheMetricManager.recordMiss(testDomain, testKey);
    CacheMetricManager.recordCreate(testDomain, testKey);
    CacheMetricManager.recordInvalidate(testDomain, testKey);

    const metric = CacheMetricManager.getMetric(testDomain, testKey);
    _assertHLAS0040(
      metric.hit === 1 &&
      metric.miss === 1 &&
      metric.create === 1 &&
      metric.invalidate === 1,
      'Metric 기록'
    );
    passed++;

    const eventState = CacheMetricManager.getEventState(testDomain, testKey);
    _assertHLAS0040(
      eventState && eventState.type === 'INVALIDATE',
      '최근 Cache Event 추적'
    );
    passed++;

    const monitoring = CacheMetricManager.getMonitoringData(
      testDomain,
      testKey
    );
    _assertHLAS0040(
      monitoring.sampleCount === 2 &&
      monitoring.hitRate === 0.5 &&
      monitoring.missRate === 0.5,
      'Hit/Miss Monitoring 계산'
    );
    passed++;

    const healthy = CacheMonitoringManager.evaluate(
      _createHLAS0040Metric(9, 1, 1, 0),
      {MIN_SAMPLE_SIZE: 10}
    );
    _assertHLAS0040(
      healthy.health === 'HEALTHY' && healthy.alerts.length === 0,
      'Healthy 기준'
    );
    passed++;

    const warning = CacheMonitoringManager.evaluate(
      _createHLAS0040Metric(7, 3, 1, 0),
      {MIN_SAMPLE_SIZE: 10}
    );
    _assertHLAS0040(
      warning.health === 'WARN' &&
      warning.alerts[0].code === 'CACHE_MISS_RATE_WARN',
      'Miss Rate Warning 기준'
    );
    passed++;

    const critical = CacheMonitoringManager.evaluate(
      _createHLAS0040Metric(5, 5, 1, 0),
      {MIN_SAMPLE_SIZE: 10}
    );
    _assertHLAS0040(
      critical.health === 'CRITICAL' &&
      critical.alerts[0].code === 'CACHE_MISS_RATE_CRITICAL',
      'Miss Rate Critical 기준'
    );
    passed++;

    const invalidation = CacheMonitoringManager.evaluate(
      _createHLAS0040Metric(9, 1, 0, 10),
      {MIN_SAMPLE_SIZE: 10}
    );
    _assertHLAS0040(
      invalidation.alerts.some(function(alert) {
        return alert.code === 'CACHE_INVALIDATION_RATE_WARN';
      }),
      'Invalidation Warning 기준'
    );
    passed++;

    const cooldownAlert = warning.alerts[0];
    CacheMonitoringManager.clearTrigger(cooldownAlert);
    _assertHLAS0040(
      CacheMonitoringManager.shouldTrigger(cooldownAlert) === true,
      'Alert 최초 Trigger'
    );
    passed++;

    CacheMonitoringManager.markTriggered(cooldownAlert);
    _assertHLAS0040(
      CacheMonitoringManager.shouldTrigger(cooldownAlert) === false,
      'Alert 중복 방지 Cooldown'
    );
    passed++;
    CacheMonitoringManager.clearTrigger(cooldownAlert);

    const dashboard = DashboardManager.getCacheMonitoringSummary();
    _assertHLAS0040(
      typeof dashboard.HEALTH === 'string' &&
      typeof dashboard.HIT_RATE_PERCENT === 'number' &&
      typeof dashboard.ALERT_COUNT === 'number',
      'Dashboard Monitoring 데이터 연계'
    );
    passed++;

    _assertHLAS0040(
      typeof ErrorHandler.handle === 'function' &&
      typeof writeWarn === 'function' &&
      typeof writeError === 'function',
      'ErrorHandler / LogUtils 연계'
    );
    passed++;

    const start = Date.now();
    for (let i = 0; i < 10; i++) {
      CacheMetricManager.recordHit(testDomain, testKey);
    }
    const duration = Date.now() - start;
    _assertHLAS0040(
      duration < 10000,
      `Metric 기록 성능 ${duration}ms`
    );
    passed++;

    Logger.log(`[PASS] HLAS-0040 ${passed}/13 PASS`);
    Logger.log(`METRIC_RECORD_10_DURATION_MS=${duration}`);
  } catch (error) {
    Logger.log(`[FAIL] HLAS-0040 ${passed}/13 PASS: ${error.message}`);
    throw error;
  } finally {
    CacheMetricManager.clear(testDomain, testKey);
  }

  Logger.log('=== HLAS-0040 Cache Monitoring Test 완료 ===');
}

function _createHLAS0040Metric(hit, miss, create, invalidate) {
  const sampleCount = hit + miss;
  const totalEventCount = sampleCount + create + invalidate;

  return {
    domain: 'HLAS0040_TEST',
    key: 'EVALUATE',
    hit: hit,
    miss: miss,
    create: create,
    invalidate: invalidate,
    sampleCount: sampleCount,
    totalEventCount: totalEventCount,
    hitRate: sampleCount > 0 ? hit / sampleCount : 0,
    missRate: sampleCount > 0 ? miss / sampleCount : 0,
    invalidationRate: totalEventCount > 0
      ? invalidate / totalEventCount
      : 0,
    lastEvent: null
  };
}

function _assertHLAS0040(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  Logger.log(`[PASS] ${message}`);
}

