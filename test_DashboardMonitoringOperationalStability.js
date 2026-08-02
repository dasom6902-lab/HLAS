/**
 * @fileoverview HLAS-0044 Dashboard Monitoring 운영 안정화 Test
 */

function test_DashboardMonitoringOperationalStability() {
  let passed = 0;
  const originalKpiSummary = KPIManager.getSummary;
  const originalCacheDashboard =
    CacheMonitoringManager.getDashboardData;
  const originalAlertRead = AlertManager.getAlerts;
  const originalDashboardWrite = _writeDashboardOutput;

  Logger.log('=== HLAS-0044 Dashboard Stability Test 시작 ===');

  try {
    _assertHLAS0044_(
      typeof DashboardManager !== 'undefined' &&
      typeof KPIManager !== 'undefined' &&
      typeof CacheMonitoringManager !== 'undefined' &&
      typeof AlertManager !== 'undefined',
      'Monitoring Module 존재'
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

    _assertHLAS0044_(
      publicMethods.every(function(name) {
        return typeof DashboardManager[name] === 'function';
      }),
      'Dashboard Public API 유지'
    );
    passed++;

    const expectedInventory = DashboardManager.getInventorySummary();
    const alertCountBefore = _getHLAS0044AlertCount_();
    const logCountBefore = _getHLAS0044LogCount_();
    const baselineStartedAt = Date.now();

    DashboardManager.refresh();

    const baselineDurationMs = Date.now() - baselineStartedAt;
    const baselineMetric = DashboardManager._lastRefreshMetric;
    const baselineSnapshot = _readHLAS0044Dashboard_();
    const logCountAfterBaseline = _getHLAS0044LogCount_();

    _assertHLAS0044_(
      baselineMetric.success === true &&
      baselineMetric.partialFailureCount === 0,
      '정상 Refresh 성공'
    );
    passed++;

    _assertHLAS0044_(
      _containsHLAS0044Inventory_(
        baselineSnapshot.values,
        expectedInventory
      ),
      'KPI 표시 동일성'
    );
    passed++;

    _assertHLAS0044_(
      baselineSnapshot.columnCount === 3 &&
      ['KPI', 'CACHE', 'ALERT', 'PERFORMANCE'].every(
        function(category) {
          return baselineSnapshot.categories.indexOf(category) >= 0;
        }
      ),
      'Dashboard 3열 Monitoring Schema 유지'
    );
    passed++;

    _assertHLAS0044_(
      _hasHLAS0044Keys_(baselineSnapshot.values, 'CACHE', [
        'HEALTH',
        'CACHE_HIT',
        'CACHE_MISS'
      ]) &&
      _hasHLAS0044Keys_(baselineSnapshot.values, 'ALERT', [
        'STATUS',
        'OPEN_COUNT',
        'LAST_LEVEL'
      ]) &&
      _hasHLAS0044Keys_(baselineSnapshot.values, 'KPI', [
        'STATUS'
      ]),
      'Monitoring Integration 유지'
    );
    passed++;

    _assertHLAS0044_(
      _hasHLAS0044Keys_(baselineSnapshot.values, 'PERFORMANCE', [
        'STATUS',
        'REFRESH_ID',
        'PARTIAL_FAILURE_COUNT',
        'PREPARE_MS',
        'STATUS_READ_CALLS'
      ]) &&
      _getHLAS0044Value_(
        baselineSnapshot.values,
        'PERFORMANCE',
        'STATUS'
      ) === 'HEALTHY',
      'Performance/Refresh 추적 표시'
    );
    passed++;

    _assertHLAS0044_(
      baselineMetric.statusReadCalls === 1 &&
      baselineMetric.dashboardWriteCalls === 1,
      'Batch Read/Write 최적화 유지'
    );
    passed++;

    _assertHLAS0044_(
      logCountAfterBaseline > logCountBefore &&
      baselineMetric.logWriteCalls >= 1,
      '정상 Refresh 운영 Log 기록'
    );
    passed++;

    KPIManager.getSummary = function() {
      throw new Error('HLAS0044_KPI_PARTIAL_FAILURE');
    };
    CacheMonitoringManager.getDashboardData = function() {
      throw new Error('HLAS0044_CACHE_PARTIAL_FAILURE');
    };
    AlertManager.getAlerts = function() {
      throw new Error('HLAS0044_ALERT_PARTIAL_FAILURE');
    };

    const partialStartedAt = Date.now();

    DashboardManager.refresh();

    const partialDurationMs = Date.now() - partialStartedAt;
    const partialMetric = DashboardManager._lastRefreshMetric;
    const partialSnapshot = _readHLAS0044Dashboard_();

    KPIManager.getSummary = originalKpiSummary;
    CacheMonitoringManager.getDashboardData = originalCacheDashboard;
    AlertManager.getAlerts = originalAlertRead;

    const logCountAfterPartial = _getHLAS0044LogCount_();

    _assertHLAS0044_(
      partialMetric.success === true,
      'Partial Failure 상태에서도 Refresh 완료'
    );
    passed++;

    _assertHLAS0044_(
      partialMetric.partialFailureCount === 3,
      'Partial Failure 3건 Metric 기록'
    );
    passed++;

    _assertHLAS0044_(
      ['KPI', 'CACHE', 'ALERT'].every(function(stage) {
        return partialMetric.failedStages.indexOf(stage) >= 0;
      }),
      '실패 Stage 추적'
    );
    passed++;

    _assertHLAS0044_(
      _getHLAS0044Value_(
        partialSnapshot.values,
        'PERFORMANCE',
        'STATUS'
      ) === 'DEGRADED' &&
      _getHLAS0044Value_(
        partialSnapshot.values,
        'KPI',
        'STATUS'
      ) === 'ERROR' &&
      _getHLAS0044Value_(
        partialSnapshot.values,
        'CACHE',
        'HEALTH'
      ) === 'ERROR' &&
      _getHLAS0044Value_(
        partialSnapshot.values,
        'ALERT',
        'STATUS'
      ) === 'ERROR',
      'Partial Failure 상태 표시'
    );
    passed++;

    _assertHLAS0044_(
      _createHLAS0044Hash_(
        _getHLAS0044Category_(baselineSnapshot.values, 'INVENTORY')
      ) ===
      _createHLAS0044Hash_(
        _getHLAS0044Category_(partialSnapshot.values, 'INVENTORY')
      ),
      'Partial Failure 이전 KPI 표시 보존'
    );
    passed++;

    _assertHLAS0044_(
      alertCountBefore === _getHLAS0044AlertCount_(),
      'Refresh Alert Read-Only 유지'
    );
    passed++;

    _assertHLAS0044_(
      logCountAfterPartial >= logCountAfterBaseline + 4 &&
      partialMetric.logWriteCalls >= 4,
      'Partial Failure WARN/Success Log 기록'
    );
    passed++;

    const beforeFatalSnapshot = _readHLAS0044Dashboard_();
    let fatalCaught = false;

    _writeDashboardOutput = function() {
      throw new Error('HLAS0044_FATAL_WRITE_FAILURE');
    };

    try {
      DashboardManager.refresh();
    } catch (fatalError) {
      fatalCaught = fatalError.message ===
        'HLAS0044_FATAL_WRITE_FAILURE';
    } finally {
      _writeDashboardOutput = originalDashboardWrite;
    }

    const fatalMetric = DashboardManager._lastRefreshMetric;
    const afterFatalSnapshot = _readHLAS0044Dashboard_();
    const logCountAfterFatal = _getHLAS0044LogCount_();

    _assertHLAS0044_(
      fatalCaught,
      '치명적 Refresh 실패 재전달'
    );
    passed++;

    _assertHLAS0044_(
      fatalMetric.success === false &&
      fatalMetric.error === 'HLAS0044_FATAL_WRITE_FAILURE',
      '치명적 Refresh 실패 Metric 기록'
    );
    passed++;

    _assertHLAS0044_(
      beforeFatalSnapshot.fullHash === afterFatalSnapshot.fullHash &&
      logCountAfterFatal > logCountAfterPartial &&
      fatalMetric.logWriteCalls >= 1,
      'Write 실패 시 Dashboard 보존 및 ERROR Log 기록'
    );
    passed++;

    const recoveryStartedAt = Date.now();

    DashboardManager.refresh();

    const recoveryDurationMs = Date.now() - recoveryStartedAt;
    const recoveryMetric = DashboardManager._lastRefreshMetric;
    const recoverySnapshot = _readHLAS0044Dashboard_();

    _assertHLAS0044_(
      recoveryMetric.success === true &&
      recoveryMetric.partialFailureCount === 0 &&
      recoverySnapshot.stableHash === baselineSnapshot.stableHash &&
      baselineDurationMs < 15000 &&
      partialDurationMs < 15000 &&
      recoveryDurationMs < 15000,
      '장애 복구 후 데이터/성능 안정성'
    );
    passed++;

    Logger.log(
      `[PASS] HLAS-0044 ${passed}/20 PASS ` +
      JSON.stringify({
        baselineMs: baselineDurationMs,
        partialFailureMs: partialDurationMs,
        recoveryMs: recoveryDurationMs,
        partialFailureCount: partialMetric.partialFailureCount,
        failedStages: partialMetric.failedStages,
        rowCount: recoverySnapshot.values.length,
        schemaColumns: recoverySnapshot.columnCount,
        statusReadCalls: recoveryMetric.statusReadCalls,
        dashboardWriteCalls: recoveryMetric.dashboardWriteCalls,
        successLogWrites: baselineMetric.logWriteCalls,
        partialLogWrites: partialMetric.logWriteCalls,
        fatalLogWrites: fatalMetric.logWriteCalls,
        schemaHash: recoverySnapshot.schemaHash,
        stableHash: recoverySnapshot.stableHash
      })
    );
  } catch (error) {
    Logger.log(
      `[FAIL] HLAS-0044 ${passed}/20 PASS: ${error.message}`
    );
    throw error;
  } finally {
    KPIManager.getSummary = originalKpiSummary;
    CacheMonitoringManager.getDashboardData = originalCacheDashboard;
    AlertManager.getAlerts = originalAlertRead;
    _writeDashboardOutput = originalDashboardWrite;
  }
}

function _readHLAS0044Dashboard_() {
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
      (
        row[0] !== 'CACHE' &&
        row[0] !== 'PERFORMANCE' &&
        row[0] !== 'TREND'
      )
    ) {
      stableValues.push(row);
    }
  });

  return {
    values: values,
    categories: categories,
    columnCount: values.length > 0 ? values[0].length : 0,
    fullHash: _createHLAS0044Hash_(values),
    schemaHash: _createHLAS0044Hash_(schemaValues),
    stableHash: _createHLAS0044Hash_(stableValues)
  };
}

function _containsHLAS0044Inventory_(values, expected) {
  const inventory = _getHLAS0044Category_(values, 'INVENTORY');

  return Object.keys(expected).every(function(key) {
    return String(inventory[key]) === String(expected[key]);
  });
}

function _getHLAS0044Category_(values, category) {
  const result = {};

  values.forEach(function(row) {
    if (row[0] === category) {
      result[row[1]] = row[2];
    }
  });

  return result;
}

function _getHLAS0044Value_(values, category, key) {
  const data = _getHLAS0044Category_(values, category);
  return data[key];
}

function _hasHLAS0044Keys_(values, category, keys) {
  const data = _getHLAS0044Category_(values, category);

  return keys.every(function(key) {
    return Object.prototype.hasOwnProperty.call(data, key);
  });
}

function _getHLAS0044AlertCount_() {
  return AlertManager.getAlerts().length;
}

function _getHLAS0044LogCount_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = typeof CONFIG !== 'undefined' &&
    CONFIG.SHEETS &&
    CONFIG.SHEETS.LOG
    ? CONFIG.SHEETS.LOG
    : 'LOG';
  const sheet = spreadsheet.getSheetByName(sheetName);

  return sheet ? sheet.getLastRow() : 0;
}

function _createHLAS0044Hash_(value) {
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

function _assertHLAS0044_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  Logger.log(`[PASS] ${message}`);
}
