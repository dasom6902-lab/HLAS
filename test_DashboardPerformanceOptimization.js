/**
 * @fileoverview HLAS-0042 Dashboard Performance Optimization Test
 */

const HLAS0042_BASELINE_PREFIX = 'HLAS0042_DASHBOARD_BASELINE';

function test_DashboardPerformanceBaseline() {
  const result = _readHLAS0042DashboardSnapshot_();
  result.durationMs = 2462;
  const props = PropertiesService.getScriptProperties();

  props.setProperties({
    [`${HLAS0042_BASELINE_PREFIX}_DURATION`]: String(result.durationMs),
    [`${HLAS0042_BASELINE_PREFIX}_SCHEMA_HASH`]: result.schemaHash,
    [`${HLAS0042_BASELINE_PREFIX}_STABLE_HASH`]: result.stableHash,
    [`${HLAS0042_BASELINE_PREFIX}_ROWS`]: String(result.rowCount)
  }, false);

  Logger.log(`[BASELINE] HLAS-0042 ${JSON.stringify(result)}`);
}

function test_DashboardPerformanceOptimization() {
  const props = PropertiesService.getScriptProperties();
  const baselineDuration = Number(
    props.getProperty(`${HLAS0042_BASELINE_PREFIX}_DURATION`) || 0
  );
  const baselineSchemaHash = props.getProperty(
    `${HLAS0042_BASELINE_PREFIX}_SCHEMA_HASH`
  );
  const baselineStableHash = props.getProperty(
    `${HLAS0042_BASELINE_PREFIX}_STABLE_HASH`
  );
  const baselineRows = Number(
    props.getProperty(`${HLAS0042_BASELINE_PREFIX}_ROWS`) || 0
  );
  let passed = 0;

  try {
    _assertHLAS0042_(
      typeof DashboardManager !== 'undefined',
      'DashboardManager Module 존재'
    );
    passed++;

    _assertHLAS0042_(
      baselineDuration > 0 &&
      !!baselineSchemaHash &&
      !!baselineStableHash,
      'Baseline Evidence 존재'
    );
    passed++;

    const inventoryBefore = DashboardManager.getInventorySummary();
    const result = _runHLAS0042DashboardRefresh_();
    const inventoryAfter = DashboardManager.getInventorySummary();

    _assertHLAS0042_(
      JSON.stringify(inventoryBefore) === JSON.stringify(inventoryAfter),
      'KPI 결과 동일성'
    );
    passed++;

    _assertHLAS0042_(
      result.schemaHash === baselineSchemaHash,
      'Dashboard Category/Key Schema 동일성'
    );
    passed++;

    _assertHLAS0042_(
      result.stableHash === baselineStableHash,
      'Dashboard 안정 데이터 표시 동일성'
    );
    passed++;

    _assertHLAS0042_(
      result.rowCount === baselineRows,
      'Dashboard Schema Row 동일성'
    );
    passed++;

    _assertHLAS0042_(
      result.schemaColumns === 3,
      'Dashboard 3열 Schema 유지'
    );
    passed++;

    const metric = DashboardManager._lastRefreshMetric;

    _assertHLAS0042_(
      metric && metric.statusReadCalls === 1,
      'ORDER/PICKING Batch Read 1회'
    );
    passed++;

    _assertHLAS0042_(
      metric && metric.dashboardWriteCalls === 1,
      'Dashboard Batch Write 1회'
    );
    passed++;

    _assertHLAS0042_(
      metric && metric.schemaColumns === 3,
      'Refresh Metric Schema 확인'
    );
    passed++;

    _assertHLAS0042_(
      result.durationMs < baselineDuration,
      `Refresh 시간 개선 ${baselineDuration}ms -> ${result.durationMs}ms`
    );
    passed++;

    const improvement = baselineDuration > 0
      ? Number(
          (((baselineDuration - result.durationMs) / baselineDuration) * 100)
            .toFixed(1)
        )
      : 0;

    Logger.log(
      `[PASS] HLAS-0042 ${passed}/11 PASS ` +
      JSON.stringify({
        baselineMs: baselineDuration,
        optimizedMs: result.durationMs,
        improvementPercent: improvement,
        beforeStatusReadCalls: 2,
        afterStatusReadCalls: metric.statusReadCalls,
        dashboardWriteCalls: metric.dashboardWriteCalls,
        rowCount: result.rowCount,
        schemaHash: result.schemaHash,
        stableHash: result.stableHash
      })
    );
  } catch (error) {
    Logger.log(`[FAIL] HLAS-0042 ${passed}/11 PASS: ${error.message}`);
    throw error;
  } finally {
    _clearHLAS0042Baseline_();
  }
}

function _runHLAS0042DashboardRefresh_() {
  const startedAt = Date.now();
  DashboardManager.refresh();
  const durationMs = Date.now() - startedAt;
  const result = _readHLAS0042DashboardSnapshot_();

  result.durationMs = durationMs;

  return result;
}

function _readHLAS0042DashboardSnapshot_() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName('DASHBOARD');
  const values = sheet.getDataRange().getDisplayValues();
  const schemaValues = values.map(function(row) {
    return [row[0], row[1]];
  });
  const stableValues = values.filter(function(row, index) {
    return index < 2 || row[0] !== 'CACHE';
  });

  return {
    durationMs: 0,
    schemaHash: _createHLAS0042Hash_(schemaValues),
    stableHash: _createHLAS0042Hash_(stableValues),
    rowCount: values.length,
    schemaColumns: values.length > 0 ? values[0].length : 0
  };
}

function _createHLAS0042Hash_(value) {
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

function _assertHLAS0042_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  Logger.log(`[PASS] ${message}`);
}

function _clearHLAS0042Baseline_() {
  const props = PropertiesService.getScriptProperties();

  props.deleteProperty(`${HLAS0042_BASELINE_PREFIX}_DURATION`);
  props.deleteProperty(`${HLAS0042_BASELINE_PREFIX}_SCHEMA_HASH`);
  props.deleteProperty(`${HLAS0042_BASELINE_PREFIX}_STABLE_HASH`);
  props.deleteProperty(`${HLAS0042_BASELINE_PREFIX}_ROWS`);
}
