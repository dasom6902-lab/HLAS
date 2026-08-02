/**
 * @fileoverview HLAS-0039 Cache Performance Optimization Test
 */

/**
 * HLAS-0039 Test Main
 *
 * @returns {Object} Test Evidence
 */
function test_CachePerformanceOptimization() {
  const report = {
    task: 'HLAS-0039',
    passed: 0,
    failed: 0,
    coldMs: 0,
    warmMs: 0,
    inventoryLoadCalls: 0,
    metrics: null
  };

  const originalLoad =
    InventoryManager._loadInventoryData;

  try {
    _testCachePerformanceAssert_(
      typeof InventoryAnalyticsManager !== 'undefined',
      'InventoryAnalyticsManager Module'
    );
    report.passed++;

    _testCachePerformanceAssert_(
      typeof CacheInvalidationManager.onInventoryQuantityChanged === 'function' &&
      typeof CacheInvalidationManager.onInventoryStructureChanged === 'function',
      'Inventory Event API'
    );
    report.passed++;

    _testCachePerformanceRemoveRaw_('INVENTORY', 'LIST');
    _testCachePerformanceRemoveRaw_('INVENTORY', 'ANALYTICS');
    CacheMetricManager.clear('INVENTORY', 'ANALYTICS');
    InventoryManager._inventoryCache = null;
    InventoryAnalyticsManager._clearMemoryCache();

    InventoryManager._loadInventoryData = function() {
      report.inventoryLoadCalls++;
      return originalLoad.apply(
        InventoryManager,
        arguments
      );
    };

    const coldStart = Date.now();
    const coldSummary =
      InventoryAnalyticsManager.getInventorySummary();
    report.coldMs = Date.now() - coldStart;

    const warmStart = Date.now();
    const warmStatus =
      InventoryAnalyticsManager.getStockStatus();
    const warmKpi =
      InventoryAnalyticsManager.getInventoryKPI();
    report.warmMs = Date.now() - warmStart;

    report.metrics =
      CacheMetricManager.getMetric(
        'INVENTORY',
        'ANALYTICS'
      );

    _testCachePerformanceAssert_(
      report.metrics.miss >= 1,
      'Cache Miss recorded'
    );
    report.passed++;

    _testCachePerformanceAssert_(
      report.metrics.hit >= 2,
      'Cache Hit increased'
    );
    report.passed++;

    _testCachePerformanceAssert_(
      report.metrics.create === 1,
      'Cache Create minimized'
    );
    report.passed++;

    _testCachePerformanceAssert_(
      report.inventoryLoadCalls === 1,
      'Inventory Data Load reduced'
    );
    report.passed++;

    _testCachePerformanceAssert_(
      coldSummary.TOTAL_ITEM === warmKpi.TOTAL_ITEM &&
      coldSummary.TOTAL_QTY === warmKpi.TOTAL_QTY &&
      coldSummary.AVAILABLE_ITEM === warmStatus.AVAILABLE,
      'Analytics result consistency'
    );
    report.passed++;

    const kpiBefore =
      JSON.stringify(
        KPIManager.getInventoryKPI()
      );
    const dashboardBefore =
      JSON.stringify(
        DashboardManager.getInventorySummary()
      );

    CacheManager.set('INVENTORY', 'LIST', {test: true}, 300);
    CacheManager.set('INVENTORY', 'ANALYTICS', {test: true}, 300);
    CacheManager.set('KPI', 'SUMMARY', {test: true}, 300);
    CacheManager.set('DASHBOARD', 'SUMMARY', {test: true}, 300);

    CacheInvalidationManager
      .onInventoryQuantityChanged();

    _testCachePerformanceAssert_(
      !_testCachePerformanceExistsRaw_('INVENTORY', 'LIST') &&
      !_testCachePerformanceExistsRaw_('INVENTORY', 'ANALYTICS') &&
      _testCachePerformanceExistsRaw_('KPI', 'SUMMARY') &&
      _testCachePerformanceExistsRaw_('DASHBOARD', 'SUMMARY'),
      'Quantity Invalidation policy'
    );
    report.passed++;

    CacheManager.set('INVENTORY', 'LIST', {test: true}, 300);
    CacheManager.set('INVENTORY', 'ANALYTICS', {test: true}, 300);
    CacheManager.set('KPI', 'SUMMARY', {test: true}, 300);
    CacheManager.set('DASHBOARD', 'SUMMARY', {test: true}, 300);

    CacheInvalidationManager
      .onInventoryStructureChanged();

    InventoryManager._inventoryCache = null;
    InventoryAnalyticsManager._clearMemoryCache();

    _testCachePerformanceAssert_(
      !_testCachePerformanceExistsRaw_('INVENTORY', 'LIST') &&
      !_testCachePerformanceExistsRaw_('INVENTORY', 'ANALYTICS') &&
      !_testCachePerformanceExistsRaw_('KPI', 'SUMMARY') &&
      !_testCachePerformanceExistsRaw_('DASHBOARD', 'SUMMARY'),
      'Structure Invalidation policy'
    );
    report.passed++;

    const kpiAfter =
      JSON.stringify(
        KPIManager.getInventoryKPI()
      );
    const dashboardAfter =
      JSON.stringify(
        DashboardManager.getInventorySummary()
      );

    _testCachePerformanceAssert_(
      kpiBefore === kpiAfter &&
      dashboardBefore === dashboardAfter,
      'KPI and Dashboard regression'
    );
    report.passed++;

    Logger.log(
      '[PASS] HLAS-0039 ' +
      JSON.stringify(report)
    );

    return report;
  } catch (error) {
    report.failed++;
    Logger.log(
      '[FAIL] HLAS-0039 ' +
      error.message +
      ' ' +
      JSON.stringify(report)
    );
    throw error;
  } finally {
    InventoryManager._loadInventoryData =
      originalLoad;
  }
}

/**
 * Assertion
 */
function _testCachePerformanceAssert_(
  condition,
  message
) {
  if (!condition) {
    throw new Error(
      '[HLAS-0039] ' + message
    );
  }
}

/**
 * Metric을 발생시키지 않는 Cache 존재 확인
 */
function _testCachePerformanceExistsRaw_(
  domain,
  key
) {
  return CacheService
    .getScriptCache()
    .get(
      CacheManager.createKey(
        domain,
        key
      )
    ) !== null;
}

/**
 * Metric을 발생시키지 않는 Cache 삭제
 */
function _testCachePerformanceRemoveRaw_(
  domain,
  key
) {
  CacheService
    .getScriptCache()
    .remove(
      CacheManager.createKey(
        domain,
        key
      )
    );
}