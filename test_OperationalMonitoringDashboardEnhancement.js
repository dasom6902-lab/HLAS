/**
 * @fileoverview HLAS-0043 Operational Monitoring Dashboard Enhancement Test
 */

function test_OperationalMonitoringDashboardEnhancement() {
  let passed = 0;
  const alertCountBefore = _getHLAS0043AlertCount_();

  Logger.log('=== HLAS-0043 Dashboard Monitoring Test 시작 ===');

  try {
    _assertHLAS0043_(
      typeof DashboardManager !== 'undefined',
      'DashboardManager Module 존재'
    );
    passed++;

    const publicMethods = [
      'refresh',
      'getOrderSummary',
      'getPickingSummary',
      'getInventorySummary',
      'getShipmentSummary',
      'getCacheMonitoringSummary',
      'getErrorSummary'
    ];

    _assertHLAS0043_(
      publicMethods.every(function(name) {
        return typeof DashboardManager[name] === 'function';
      }),
      'Dashboard Public API 유지'
    );
    passed++;

    const expectedInventory = DashboardManager.getInventorySummary();
    const firstStartedAt = Date.now();

    DashboardManager.refresh();

    const firstDurationMs = Date.now() - firstStartedAt;
    const firstMetric = DashboardManager._lastRefreshMetric;
    const firstSnapshot = _readHLAS0043Dashboard_();

    _assertHLAS0043_(
      firstMetric && firstMetric.success === true,
      'Dashboard Refresh 정상 완료'
    );
    passed++;

    _assertHLAS0043_(
      _containsHLAS0043Inventory_(
        firstSnapshot.values,
        expectedInventory
      ),
      'KPI Inventory 결과 동일성'
    );
    passed++;

    _assertHLAS0043_(
      firstSnapshot.columnCount === 3,
      'Dashboard 3열 Schema 유지'
    );
    passed++;

    const requiredCategories = [
      'KPI',
      'CACHE',
      'ALERT',
      'PERFORMANCE'
    ];

    _assertHLAS0043_(
      requiredCategories.every(function(category) {
        return firstSnapshot.categories.indexOf(category) >= 0;
      }),
      'Monitoring Category 표시'
    );
    passed++;

    _assertHLAS0043_(
      _hasHLAS0043Keys_(firstSnapshot.values, 'KPI', [
        'STATUS'
      ]),
      'KPI Monitoring 표시'
    );
    passed++;

    _assertHLAS0043_(
      _hasHLAS0043Keys_(firstSnapshot.values, 'CACHE', [
        'HEALTH',
        'CACHE_HIT',
        'CACHE_MISS',
        'HIT_RATE_PERCENT',
        'ALERT_COUNT'
      ]),
      'Cache Metric 표시'
    );
    passed++;

    _assertHLAS0043_(
      _hasHLAS0043Keys_(firstSnapshot.values, 'ALERT', [
        'STATUS',
        'TOTAL_COUNT',
        'OPEN_COUNT',
        'CRITICAL_COUNT',
        'WARN_COUNT',
        'LAST_LEVEL'
      ]),
      'Alert 상태 표시'
    );
    passed++;

    _assertHLAS0043_(
      _hasHLAS0043Keys_(firstSnapshot.values, 'PERFORMANCE', [
        'PREPARE_MS',
        'STATUS_READ_MS',
        'KPI_MS',
        'MONITORING_MS',
        'STATUS_READ_CALLS',
        'SCHEMA_COLUMNS'
      ]),
      'Performance Metric 표시'
    );
    passed++;

    _assertHLAS0043_(
      firstMetric.statusReadCalls === 1,
      'ORDER/PICKING Batch Read 1회 유지'
    );
    passed++;

    _assertHLAS0043_(
      firstMetric.dashboardWriteCalls === 1,
      'Dashboard Batch Write 1회 유지'
    );
    passed++;

    const secondStartedAt = Date.now();

    DashboardManager.refresh();

    const secondDurationMs = Date.now() - secondStartedAt;
    const secondMetric = DashboardManager._lastRefreshMetric;
    const secondSnapshot = _readHLAS0043Dashboard_();

    _assertHLAS0043_(
      firstSnapshot.schemaHash === secondSnapshot.schemaHash,
      '연속 Refresh Schema 안정성'
    );
    passed++;

    _assertHLAS0043_(
      firstSnapshot.stableHash === secondSnapshot.stableHash,
      '연속 Refresh 안정 데이터 동일성'
    );
    passed++;

    _assertHLAS0043_(
      alertCountBefore === _getHLAS0043AlertCount_(),
      'Dashboard Refresh Alert Read-Only 연계'
    );
    passed++;

    _assertHLAS0043_(
      firstDurationMs < 15000 &&
      secondDurationMs < 15000 &&
      secondMetric.success === true,
      `Refresh 안정성 ${firstDurationMs}ms / ${secondDurationMs}ms`
    );
    passed++;

    Logger.log(
      `[PASS] HLAS-0043 ${passed}/16 PASS ` +
      JSON.stringify({
        firstRefreshMs: firstDurationMs,
        secondRefreshMs: secondDurationMs,
        averageRefreshMs: Math.round(
          (firstDurationMs + secondDurationMs) / 2
        ),
        rowCount: secondSnapshot.values.length,
        schemaColumns: secondSnapshot.columnCount,
        statusReadCalls: secondMetric.statusReadCalls,
        dashboardWriteCalls: secondMetric.dashboardWriteCalls,
        schemaHash: secondSnapshot.schemaHash,
        stableHash: secondSnapshot.stableHash
      })
    );
  } catch (error) {
    Logger.log(
      `[FAIL] HLAS-0043 ${passed}/16 PASS: ${error.message}`
    );
    throw error;
  }
}

function _readHLAS0043Dashboard_() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName('DASHBOARD');
  const values = sheet.getDataRange().getDisplayValues();
  const categories = [];
  const schemaValues = [];
  const stableValues = [];

  values.forEach(function(row, index) {
    if (index >= 2 && categories.indexOf(row[0]) < 0) {
      categories.push(row[0]);
    }

    schemaValues.push([row[0], row[1]]);

    if (
      index < 2 ||
      (row[0] !== 'CACHE' && row[0] !== 'PERFORMANCE')
    ) {
      stableValues.push(row);
    }
  });

  return {
    values: values,
    categories: categories,
    columnCount: values.length > 0 ? values[0].length : 0,
    schemaHash: _createHLAS0043Hash_(schemaValues),
    stableHash: _createHLAS0043Hash_(stableValues)
  };
}

function _containsHLAS0043Inventory_(values, expected) {
  const dashboardValues = {};

  values.forEach(function(row) {
    if (row[0] === 'INVENTORY') {
      dashboardValues[row[1]] = row[2];
    }
  });

  return Object.keys(expected).every(function(key) {
    return String(dashboardValues[key]) === String(expected[key]);
  });
}

function _hasHLAS0043Keys_(values, category, keys) {
  const found = {};

  values.forEach(function(row) {
    if (row[0] === category) {
      found[row[1]] = true;
    }
  });

  return keys.every(function(key) {
    return found[key] === true;
  });
}

function _getHLAS0043AlertCount_() {
  if (
    typeof AlertManager === 'undefined' ||
    typeof AlertManager.getAlerts !== 'function'
  ) {
    return 0;
  }

  return AlertManager.getAlerts().length;
}

function _createHLAS0043Hash_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(value),
    Utilities.Charset.UTF_8
  );

  return digest.map(function(item) {
    const normalized = item < 0 ? item + 256 : item;
    return (`0${normalized.toString(16)}`).slice(-2);
  }).join('');
}

function _assertHLAS0043_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  Logger.log(`[PASS] ${message}`);
}
