/**
 * @fileoverview HLAS-0046 Alert History & Schema Management Test
 * 운영 Test Row와 임시 Archive Sheet만 정리하는 통합 테스트
 */

function test_AlertHistorySchemaManagement() {
  const startedAt = Date.now();
  const token = String(Date.now());
  const alertCode = `HLAS0046_LIFECYCLE_${token}`;
  const cacheCode = `CACHE_HLAS0046_${token}`;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tempHistoryName = `HLAS0046_HISTORY_${token}`;
  const tempArchiveName = `HLAS0046_ARCHIVE_${token}`;
  const tempInvalidName = `HLAS0046_INVALID_${token}`;
  let tempHistory = null;
  let tempArchive = null;
  let tempInvalid = null;
  let alertId = '';
  let cacheAlertId = '';
  let cacheMarkCalls = 0;
  let passed = 0;
  const originalCandidates = CacheMonitoringManager.getAlertCandidates;
  const originalShouldTrigger = CacheMonitoringManager.shouldTrigger;
  const originalMarkTriggered = CacheMonitoringManager.markTriggered;
  const dashboardBefore = _getDashboardAlertSummary();
  const logSheetBefore = spreadsheet.getSheetByName('LOG');
  const logRowsBefore = logSheetBefore
    ? logSheetBefore.getLastRow()
    : 0;

  Logger.log('=== HLAS-0046 Alert History Schema Test 시작 ===');

  try {
    _assertHLAS0046(
      typeof AlertManager !== 'undefined',
      'AlertManager Module 존재'
    );
    passed++;

    const publicMethods = [
      'createAlert',
      'getAlerts',
      'updateAlertState',
      'getAlertState',
      'getAlertHistory',
      'getAlertSummary',
      'checkInventoryAlert',
      'checkSystemAlert',
      'checkOperationalAlert'
    ];
    _assertHLAS0046(
      publicMethods.every(function(name) {
        return typeof AlertManager[name] === 'function';
      }),
      'HLAS-0045 Public API 9개 유지'
    );
    passed++;

    _assertHLAS0046(
      AlertManager.SCHEMAS.ALERT.VERSION === 'V1' &&
      AlertManager.SCHEMAS.HISTORY.VERSION === 'V1' &&
      AlertManager.SCHEMAS.ARCHIVE.VERSION === 'V1',
      'Schema Version V1 표준'
    );
    passed++;

    const alertSheet = _getAlertSheet();
    const historySheet = _getAlertHistorySheet();
    const properties = PropertiesService.getScriptProperties();

    _assertHLAS0046(
      properties.getProperty('HLAS:ALERT:SCHEMA_VERSION') === 'V1' &&
      properties.getProperty('HLAS:ALERT_HISTORY:SCHEMA_VERSION') === 'V1',
      'Schema Version Properties 등록'
    );
    passed++;

    const alertHeaders = alertSheet
      .getRange(1, 1, 1, 7)
      .getValues()[0];
    _assertHLAS0046(
      alertHeaders.slice(0, 5).join('|') ===
        'TIME|CODE|LEVEL|MESSAGE|STATUS',
      'ALERT Consumer 5열 Compatibility 유지'
    );
    passed++;

    _assertHLAS0046(
      alertHeaders.join('|') ===
        'TIME|CODE|LEVEL|MESSAGE|STATUS|ALERT_ID|UPDATED_AT',
      'ALERT Schema V1 전체 구조'
    );
    passed++;

    const historyHeaders = historySheet
      .getRange(1, 1, 1, 7)
      .getValues()[0];
    _assertHLAS0046(
      historyHeaders.join('|') ===
        'TIME|ALERT_ID|CODE|EVENT|PREVIOUS_STATUS|NEW_STATUS|NOTE',
      'ALERT_HISTORY Schema V1 구조'
    );
    passed++;

    const policyValue = JSON.parse(
      properties.getProperty(
        'HLAS:ALERT_HISTORY:ARCHIVE_POLICY:V1'
      )
    );
    _assertHLAS0046(
      policyValue.version === 'V1' &&
      policyValue.maxActiveRows === 5000 &&
      policyValue.retentionDays === 365 &&
      policyValue.batchSize === 250,
      'History Archive 정책 등록'
    );
    passed++;

    tempInvalid = spreadsheet.insertSheet(tempInvalidName);
    tempInvalid.getRange(1, 1, 1, 7).setValues([[
      'TIME',
      'BROKEN_CODE',
      'LEVEL',
      'MESSAGE',
      'STATUS',
      'ALERT_ID',
      'UPDATED_AT'
    ]]);
    let incompatibleBlocked = false;

    try {
      _ensureAlertSchemaHeader(
        tempInvalid,
        AlertManager.SCHEMAS.ALERT
      );
    } catch (error) {
      incompatibleBlocked = /호환되지 않는/.test(error.message);
    }

    _assertHLAS0046(
      incompatibleBlocked,
      '비호환 Consumer Schema 변경 차단'
    );
    passed++;

    _assertHLAS0046(
      AlertManager.createAlert(
        alertCode,
        'WARN',
        'HLAS-0046 Lifecycle Test'
      ) === true,
      'Lifecycle Alert 생성'
    );
    passed++;

    const createdAlert = _findHLAS0046AlertByCode_(alertCode);
    alertId = createdAlert ? createdAlert.id : '';
    _assertHLAS0046(
      createdAlert &&
      createdAlert.status === 'OPEN' &&
      /^ALT-/.test(createdAlert.id),
      'Lifecycle OPEN 및 Alert ID'
    );
    passed++;

    const consumerKeys = [
      'time',
      'code',
      'level',
      'message',
      'status'
    ];
    _assertHLAS0046(
      consumerKeys.every(function(key) {
        return Object.prototype.hasOwnProperty.call(createdAlert, key);
      }),
      'getAlerts Legacy Consumer Field 유지'
    );
    passed++;

    let lifecycleHistory = AlertManager.getAlertHistory(alertId);
    _assertHLAS0046(
      lifecycleHistory.length === 1 &&
      lifecycleHistory[0].event === 'CREATED' &&
      lifecycleHistory[0].newStatus === 'OPEN',
      'CREATED History 저장 기준'
    );
    passed++;

    const acknowledged = AlertManager.updateAlertState(
      alertId,
      'ACKNOWLEDGED',
      'Schema 관리 확인'
    );
    _assertHLAS0046(
      acknowledged.status === 'ACKNOWLEDGED',
      'Lifecycle ACKNOWLEDGED'
    );
    passed++;

    const resolved = AlertManager.updateAlertState(
      alertId,
      'RESOLVED',
      'Schema 관리 완료'
    );
    _assertHLAS0046(
      resolved.status === 'RESOLVED',
      'Lifecycle RESOLVED'
    );
    passed++;

    lifecycleHistory = AlertManager.getAlertHistory(alertId);
    _assertHLAS0046(
      lifecycleHistory.length === 3 &&
      lifecycleHistory[1].previousStatus === 'OPEN' &&
      lifecycleHistory[1].newStatus === 'ACKNOWLEDGED' &&
      lifecycleHistory[2].previousStatus === 'ACKNOWLEDGED' &&
      lifecycleHistory[2].newStatus === 'RESOLVED',
      'Lifecycle History 연속성'
    );
    passed++;

    const dashboardResolved = _getDashboardAlertSummary();
    _assertHLAS0046(
      dashboardResolved.TOTAL_COUNT ===
        dashboardBefore.TOTAL_COUNT + 1 &&
      dashboardResolved.OPEN_COUNT === dashboardBefore.OPEN_COUNT,
      'Dashboard RESOLVED Compatibility'
    );
    passed++;

    CacheMonitoringManager.getAlertCandidates = function() {
      return [{
        code: cacheCode,
        level: 'CRITICAL',
        domain: 'HLAS0046',
        key: 'CACHE',
        message: 'Cache Alert Schema Tracking'
      }];
    };
    CacheMonitoringManager.shouldTrigger = function() {
      return true;
    };
    CacheMonitoringManager.markTriggered = function() {
      cacheMarkCalls++;
    };

    _assertHLAS0046(
      AlertManager.checkSystemAlert() === true,
      'Cache Alert Integration 실행'
    );
    passed++;

    const cacheAlert = _findHLAS0046AlertByCode_(cacheCode);
    cacheAlertId = cacheAlert ? cacheAlert.id : '';
    _assertHLAS0046(
      cacheAlert &&
      cacheAlert.level === 'CRITICAL' &&
      cacheMarkCalls === 1,
      'Cache Alert / Trigger Tracking'
    );
    passed++;

    const cacheHistory = AlertManager.getAlertHistory(cacheAlertId);
    _assertHLAS0046(
      cacheHistory.length === 1 &&
      cacheHistory[0].note === 'SOURCE=CACHE_MONITORING',
      'Cache Alert History Source'
    );
    passed++;

    const dashboardCache = _getDashboardAlertSummary();
    _assertHLAS0046(
      dashboardCache.TOTAL_COUNT === dashboardBefore.TOTAL_COUNT + 2 &&
      dashboardCache.OPEN_COUNT === dashboardBefore.OPEN_COUNT + 1 &&
      dashboardCache.LAST_CODE === cacheCode,
      'Dashboard Cache Alert Compatibility'
    );
    passed++;

    tempHistory = spreadsheet.insertSheet(tempHistoryName);
    tempArchive = spreadsheet.insertSheet(tempArchiveName);
    _ensureAlertSchemaHeader(
      tempHistory,
      AlertManager.SCHEMAS.HISTORY
    );
    _ensureAlertSchemaHeader(
      tempArchive,
      AlertManager.SCHEMAS.ARCHIVE
    );

    const now = new Date();
    const oldDate = new Date(
      now.getTime() - 400 * 24 * 60 * 60 * 1000
    );
    tempHistory.getRange(2, 1, 4, 7).setValues([
      [oldDate, 'ALT-OLD-1', 'HLAS0046_ARCHIVE_1', 'CREATED', '', 'OPEN', ''],
      [oldDate, 'ALT-OLD-2', 'HLAS0046_ARCHIVE_2', 'CREATED', '', 'OPEN', ''],
      [now, 'ALT-NEW-1', 'HLAS0046_ACTIVE_1', 'CREATED', '', 'OPEN', ''],
      [now, 'ALT-NEW-2', 'HLAS0046_ACTIVE_2', 'CREATED', '', 'OPEN', '']
    ]);

    const archiveMetric = _applyAlertHistoryArchivePolicy(
      tempHistory,
      now,
      {
        MAX_ACTIVE_ROWS: 2,
        RETENTION_DAYS: 365,
        BATCH_SIZE: 10
      },
      tempArchive
    );
    _assertHLAS0046(
      archiveMetric.version === 'V1' &&
      archiveMetric.archivedRows === 2 &&
      archiveMetric.activeRowsBefore === 4 &&
      archiveMetric.activeRowsAfter === 2,
      'Archive 정책 실행 Metric'
    );
    passed++;

    _assertHLAS0046(
      tempHistory.getLastRow() === 3 &&
      tempArchive.getLastRow() === 3,
      'Archive Active/Archive Row 분리'
    );
    passed++;

    const archivedCodes = tempArchive
      .getRange(2, 3, 2, 1)
      .getValues()
      .map(function(row) {
        return row[0];
      });
    _assertHLAS0046(
      archivedCodes.join('|') ===
        'HLAS0046_ARCHIVE_1|HLAS0046_ARCHIVE_2',
      'Archive Oldest-first 보관'
    );
    passed++;

    const activeCodes = tempHistory
      .getRange(2, 3, 2, 1)
      .getValues()
      .map(function(row) {
        return row[0];
      });
    _assertHLAS0046(
      activeCodes.join('|') ===
        'HLAS0046_ACTIVE_1|HLAS0046_ACTIVE_2',
      'Active History 최신 데이터 유지'
    );
    passed++;

    _assertHLAS0046(
      properties.getProperty(
        'HLAS:ALERT_HISTORY_ARCHIVE:SCHEMA_VERSION'
      ) === 'V1',
      'Archive Schema Version 등록'
    );
    passed++;

    const logSheetAfter = spreadsheet.getSheetByName('LOG');
    _assertHLAS0046(
      logSheetAfter && logSheetAfter.getLastRow() > logRowsBefore,
      'Alert / Archive Log Tracking'
    );
    passed++;

    const duration = Date.now() - startedAt;
    _assertHLAS0046(
      duration < 25000,
      `Schema/Lifecycle/Archive 통합 성능 ${duration}ms`
    );
    passed++;

    Logger.log(
      `[PASS] HLAS-0046 ${passed}/28 PASS ` +
      JSON.stringify({
        durationMs: duration,
        schemaVersion: 'V1',
        publicApiCount: publicMethods.length,
        alertSchemaColumns: alertHeaders.length,
        historySchemaColumns: historyHeaders.length,
        lifecycleHistoryCount: lifecycleHistory.length,
        cacheHistoryCount: cacheHistory.length,
        archivedRows: archiveMetric.archivedRows,
        activeRowsAfter: archiveMetric.activeRowsAfter,
        dashboardTotalDelta:
          dashboardCache.TOTAL_COUNT - dashboardBefore.TOTAL_COUNT,
        dashboardOpenDelta:
          dashboardCache.OPEN_COUNT - dashboardBefore.OPEN_COUNT,
        cacheMarkCalls: cacheMarkCalls
      })
    );
  } catch (error) {
    Logger.log(
      `[FAIL] HLAS-0046 ${passed}/28 PASS: ${error.message}`
    );
    throw error;
  } finally {
    CacheMonitoringManager.getAlertCandidates = originalCandidates;
    CacheMonitoringManager.shouldTrigger = originalShouldTrigger;
    CacheMonitoringManager.markTriggered = originalMarkTriggered;
    _deleteHLAS0046TestRows_(_getAlertSheet());
    _deleteHLAS0046TestRows_(_getAlertHistorySheet());
    [tempHistory, tempArchive, tempInvalid].forEach(function(sheet) {
      if (sheet && spreadsheet.getSheetByName(sheet.getName())) {
        spreadsheet.deleteSheet(sheet);
      }
    });
  }

  Logger.log('=== HLAS-0046 Alert History Schema Test 완료 ===');
}

function _findHLAS0046AlertByCode_(code) {
  const alerts = AlertManager.getAlerts();

  for (let i = alerts.length - 1; i >= 0; i--) {
    if (alerts[i].code === code) {
      return alerts[i];
    }
  }

  return null;
}

function _deleteHLAS0046TestRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return;
  }

  const values = sheet.getDataRange().getValues();

  for (let i = values.length - 1; i >= 1; i--) {
    const searchable = [
      values[i][1],
      values[i][2],
      values[i][3]
    ].join('|');

    if (searchable.indexOf('HLAS0046') >= 0) {
      sheet.deleteRow(i + 1);
    }
  }
}

function _assertHLAS0046(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  Logger.log(`[PASS] ${message}`);
}
