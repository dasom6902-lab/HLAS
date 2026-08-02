/**
 * @fileoverview HLAS-0048 Alert Operations Monitoring Enhancement Test
 */

function test_AlertOperationsMonitoringEnhancement() {
  const startedAt = Date.now();
  const token = String(Date.now());
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const properties = PropertiesService.getScriptProperties();
  const metricKey = AlertMetricManager.PROPERTY_KEY;
  const originalMetric = properties.getProperty(metricKey);
  const tempSheets = [];
  const code = `HLAS0048_LIFECYCLE_${token}`;
  let passed = 0;

  Logger.log('=== HLAS-0048 Alert Operations Monitoring Test 시작 ===');

  try {
    properties.deleteProperty(metricKey);

    _assertHLAS0048_(
      typeof AlertMetricManager !== 'undefined' &&
      typeof AlertManager !== 'undefined',
      'Alert Metric/Manager Module 존재'
    );
    passed++;

    const publicMethods = [
      'createAlert', 'getAlerts', 'updateAlertState', 'getAlertState',
      'getAlertHistory', 'getAlertSummary', 'checkInventoryAlert',
      'checkSystemAlert', 'checkOperationalAlert'
    ];
    _assertHLAS0048_(
      publicMethods.every(function(name) {
        return typeof AlertManager[name] === 'function';
      }),
      'AlertManager Public API 9개 유지'
    );
    passed++;

    _assertHLAS0048_(
      AlertMetricManager.VERSION === 'V1' &&
      Object.keys(AlertMetricManager.EVENTS).length === 6,
      'AlertMetric Event Schema V1'
    );
    passed++;

    AlertMetricManager.record('OPERATION_FAILED', {
      durationMs: 25,
      context: `HLAS0048_DIRECT_${token}`
    });
    const directMetric = AlertMetricManager.getSummary();
    _assertHLAS0048_(
      directMetric.totalEvents === 1 &&
      directMetric.failureCount === 1 &&
      directMetric.recentFailure === true,
      'Failure Detection Metric 기록'
    );
    passed++;

    _assertHLAS0048_(
      AlertManager.createAlert(code, 'WARN', 'HLAS-0048 Lifecycle') === true,
      'Alert Lifecycle 생성'
    );
    passed++;

    const alert = _findHLAS0048Alert_(code);
    _assertHLAS0048_(
      alert && alert.status === 'OPEN' && /^ALT-/.test(alert.id),
      'Lifecycle OPEN Tracking'
    );
    passed++;

    AlertManager.updateAlertState(alert.id, 'RESOLVED', 'HLAS-0048 완료');
    const lifecycleMetric = AlertMetricManager.getSummary();
    _assertHLAS0048_(
      lifecycleMetric.counts.ALERT_CREATED === 1 &&
      lifecycleMetric.counts.STATE_CHANGED === 1,
      'Alert Created/State Changed Metric'
    );
    passed++;

    _assertHLAS0048_(
      lifecycleMetric.counts.HISTORY_APPENDED === 2 &&
      lifecycleMetric.recentEvents.some(function(event) {
        return event.alertId === alert.id;
      }),
      'Alert History Tracking 강화'
    );
    passed++;

    const historySheet = _createHLAS0048Sheet_(
      spreadsheet, `HLAS0048_SRC_${token}`,
      AlertManager.SCHEMAS.HISTORY.HEADERS, tempSheets
    );
    const archiveSheet = _createHLAS0048Sheet_(
      spreadsheet, `HLAS0048_DST_${token}`,
      AlertManager.SCHEMAS.ARCHIVE.HEADERS, tempSheets
    );
    const metadataSheet = _createHLAS0048Sheet_(
      spreadsheet, `HLAS0048_META_${token}`,
      AlertManager.SCHEMAS.ARCHIVE_METADATA.HEADERS, tempSheets
    );
    const now = new Date();
    const old = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);
    historySheet.getRange(2, 1, 2, 7).setValues([
      [old, 'A1', 'HLAS0048_ARCHIVE_1', 'CREATED', '', 'OPEN', ''],
      [old, 'A2', 'HLAS0048_ARCHIVE_2', 'CREATED', '', 'OPEN', '']
    ]);
    const archiveResult = _applyAlertHistoryArchivePolicy(
      historySheet, now,
      {MAX_ACTIVE_ROWS: 0, RETENTION_DAYS: 365, BATCH_SIZE: 10},
      archiveSheet, metadataSheet, {runId: `ARC-0048-${token}`}
    );
    _assertHLAS0048_(
      archiveResult.status === 'COMPLETED' &&
      archiveResult.archivedRows === 2,
      'Archive Monitoring 완료'
    );
    passed++;

    const archiveMetric = AlertMetricManager.getSummary();
    _assertHLAS0048_(
      archiveMetric.counts.ARCHIVE_COMPLETED === 1 &&
      archiveMetric.archivedRows === 2,
      'Archive Count/Row Metric'
    );
    passed++;

    const rollbackSource = _createHLAS0048Sheet_(
      spreadsheet, `HLAS0048_RB_SRC_${token}`,
      AlertManager.SCHEMAS.HISTORY.HEADERS, tempSheets
    );
    const rollbackTarget = _createHLAS0048Sheet_(
      spreadsheet, `HLAS0048_RB_DST_${token}`,
      AlertManager.SCHEMAS.ARCHIVE.HEADERS, tempSheets
    );
    rollbackSource.getRange(2, 1, 1, 7).setValues([[
      old, 'RB1', 'HLAS0048_ROLLBACK', 'CREATED', '', 'OPEN', ''
    ]]);
    let failureDetected = false;
    try {
      _applyAlertHistoryArchivePolicy(
        rollbackSource, now,
        {MAX_ACTIVE_ROWS: 0, RETENTION_DAYS: 365, BATCH_SIZE: 10},
        rollbackTarget, null,
        {runId: `RB-0048-${token}`, injectFailureAfterArchiveWrite: true}
      );
    } catch (error) {
      failureDetected = /ARCHIVE_INJECTED_FAILURE/.test(error.message);
    }
    _assertHLAS0048_(failureDetected, 'Archive Failure Detection 연계');
    passed++;

    const failureMetric = AlertMetricManager.getSummary();
    _assertHLAS0048_(
      failureMetric.counts.ARCHIVE_ROLLED_BACK === 1 &&
      failureMetric.failureCount === 2 &&
      failureMetric.lastFailureContext.indexOf('RB-0048') >= 0,
      'Rollback/Failure Lifecycle Metric'
    );
    passed++;

    _assertHLAS0048_(
      rollbackSource.getLastRow() === 2 &&
      rollbackTarget.getLastRow() === 1,
      'Failure Recovery 데이터 정합성'
    );
    passed++;

    const dashboard = _getDashboardAlertSummary();
    _assertHLAS0048_(
      dashboard.METRIC_STATUS === 'DEGRADED' &&
      dashboard.METRIC_CREATED === 1 &&
      dashboard.METRIC_STATE_CHANGED === 1,
      'Dashboard Alert Operations Metric 표시'
    );
    passed++;

    _assertHLAS0048_(
      dashboard.METRIC_ARCHIVED_ROWS === 2 &&
      dashboard.METRIC_FAILURE_COUNT === 2 &&
      dashboard.METRIC_RECENT_FAILURE === true,
      'Dashboard Archive/Failure 표시'
    );
    passed++;

    _assertHLAS0048_(
      failureMetric.averageDurationMs >= 0 &&
      failureMetric.maxDurationMs >= 25 &&
      failureMetric.failureRatePercent > 0,
      'Alert Performance Metric 계산'
    );
    passed++;

    _assertHLAS0048_(
      failureMetric.recentEvents.length <= 40 &&
      failureMetric.lastEvent === 'ARCHIVE_ROLLED_BACK',
      '최근 Lifecycle Event Tracking'
    );
    passed++;

    const duration = Date.now() - startedAt;
    _assertHLAS0048_(duration < 35000, `HLAS-0048 통합 성능 ${duration}ms`);
    passed++;

    Logger.log(`[PASS] HLAS-0048 ${passed}/18 PASS ` + JSON.stringify({
      durationMs: duration,
      totalEvents: failureMetric.totalEvents,
      created: failureMetric.counts.ALERT_CREATED,
      stateChanged: failureMetric.counts.STATE_CHANGED,
      historyAppended: failureMetric.counts.HISTORY_APPENDED,
      archivedRows: failureMetric.archivedRows,
      failureCount: failureMetric.failureCount,
      dashboardStatus: dashboard.METRIC_STATUS
    }));
  } finally {
    _deleteHLAS0048Rows_(_getAlertSheet());
    _deleteHLAS0048Rows_(_getAlertHistorySheet());
    tempSheets.reverse().forEach(function(sheet) {
      if (spreadsheet.getSheetByName(sheet.getName())) {
        spreadsheet.deleteSheet(sheet);
      }
    });
    if (originalMetric === null) {
      properties.deleteProperty(metricKey);
    } else {
      properties.setProperty(metricKey, originalMetric);
    }
    Logger.log('=== HLAS-0048 Alert Operations Monitoring Test 완료 ===');
  }
}

function _createHLAS0048Sheet_(spreadsheet, name, headers, tempSheets) {
  const sheet = spreadsheet.insertSheet(name);
  tempSheets.push(sheet);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function _findHLAS0048Alert_(code) {
  const alerts = AlertManager.getAlerts();
  for (let i = alerts.length - 1; i >= 0; i--) {
    if (alerts[i].code === code) return alerts[i];
  }
  return null;
}

function _deleteHLAS0048Rows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return;
  const values = sheet.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i].join('|').indexOf('HLAS0048') >= 0) {
      sheet.deleteRow(i + 1);
    }
  }
}

function _assertHLAS0048_(condition, message) {
  if (!condition) throw new Error(message);
  Logger.log(`[PASS] ${message}`);
}
