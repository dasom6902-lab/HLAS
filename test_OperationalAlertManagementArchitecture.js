/**
 * @fileoverview HLAS-0045 Operational Alert Management Architecture Test
 * 테스트 Alert/History만 정리하는 비파괴 통합 테스트
 */

function test_OperationalAlertManagementArchitecture() {
  const startedAt = Date.now();
  const testToken = String(Date.now());
  const operationalCode = `HLAS0045_STATE_${testToken}`;
  const cacheCode = `CACHE_HLAS0045_${testToken}`;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const alertSheet = _getAlertSheet();
  const historySheet = _getAlertHistorySheet();
  const dashboardBefore = _getDashboardAlertSummary();
  const logSheetBefore = spreadsheet.getSheetByName('LOG');
  const logRowsBefore = logSheetBefore
    ? logSheetBefore.getLastRow()
    : 0;
  let passed = 0;
  let operationalAlertId = '';
  let cacheAlertId = '';
  let errorHandlerCalls = 0;
  let cacheMarkCalls = 0;
  const originalErrorHandler = ErrorHandler.handle;
  const originalCandidates = CacheMonitoringManager.getAlertCandidates;
  const originalShouldTrigger = CacheMonitoringManager.shouldTrigger;
  const originalMarkTriggered = CacheMonitoringManager.markTriggered;

  Logger.log('=== HLAS-0045 Alert Management Test 시작 ===');

  try {
    _assertHLAS0045(
      typeof AlertManager !== 'undefined',
      'AlertManager Module 존재'
    );
    passed++;

    const legacyMethods = [
      'createAlert',
      'getAlerts',
      'checkInventoryAlert',
      'checkSystemAlert',
      'checkOperationalAlert'
    ];
    _assertHLAS0045(
      legacyMethods.every(function(name) {
        return typeof AlertManager[name] === 'function';
      }),
      '기존 AlertManager Public API 유지'
    );
    passed++;

    const managementMethods = [
      'updateAlertState',
      'getAlertState',
      'getAlertHistory',
      'getAlertSummary'
    ];
    _assertHLAS0045(
      managementMethods.every(function(name) {
        return typeof AlertManager[name] === 'function';
      }),
      'Alert 관리 API 적용'
    );
    passed++;

    const alertHeaders = alertSheet
      .getRange(1, 1, 1, 7)
      .getValues()[0];
    const historyHeaders = historySheet
      .getRange(1, 1, 1, 7)
      .getValues()[0];
    _assertHLAS0045(
      alertHeaders.join('|') ===
        'TIME|CODE|LEVEL|MESSAGE|STATUS|ALERT_ID|UPDATED_AT' &&
      historyHeaders.join('|') ===
        'TIME|ALERT_ID|CODE|EVENT|PREVIOUS_STATUS|NEW_STATUS|NOTE',
      'Alert / History Schema 표준 적용'
    );
    passed++;

    const created = AlertManager.createAlert(
      operationalCode,
      'WARN',
      'HLAS-0045 상태 관리 테스트'
    );
    _assertHLAS0045(created === true, 'Alert 생성');
    passed++;

    const createdAlert = _findHLAS0045AlertByCode_(operationalCode);
    operationalAlertId = createdAlert ? createdAlert.id : '';
    _assertHLAS0045(
      createdAlert &&
      /^ALT-/.test(createdAlert.id) &&
      createdAlert.status === 'OPEN',
      'Alert ID 및 OPEN 초기 상태'
    );
    passed++;

    let history = AlertManager.getAlertHistory(operationalAlertId);
    _assertHLAS0045(
      history.length === 1 &&
      history[0].event === 'CREATED' &&
      history[0].newStatus === 'OPEN',
      'Alert 생성 History 기록'
    );
    passed++;

    const acknowledged = AlertManager.updateAlertState(
      operationalAlertId,
      'ACKNOWLEDGED',
      '운영 확인'
    );
    _assertHLAS0045(
      acknowledged && acknowledged.status === 'ACKNOWLEDGED',
      'Alert State OPEN → ACKNOWLEDGED'
    );
    passed++;

    history = AlertManager.getAlertHistory(operationalAlertId);
    _assertHLAS0045(
      history.length === 2 &&
      history[1].previousStatus === 'OPEN' &&
      history[1].newStatus === 'ACKNOWLEDGED',
      'ACKNOWLEDGED History 기록'
    );
    passed++;

    const resolved = AlertManager.updateAlertState(
      operationalAlertId,
      'RESOLVED',
      '운영 조치 완료'
    );
    _assertHLAS0045(
      resolved && resolved.status === 'RESOLVED',
      'Alert State ACKNOWLEDGED → RESOLVED'
    );
    passed++;

    history = AlertManager.getAlertHistory(operationalAlertId);
    _assertHLAS0045(
      history.length === 3 &&
      history[2].event === 'STATE_CHANGED' &&
      history[2].newStatus === 'RESOLVED',
      'RESOLVED History 기록'
    );
    passed++;

    const summaryAfterResolve = AlertManager.getAlertSummary();
    _assertHLAS0045(
      summaryAfterResolve.TOTAL_COUNT ===
        dashboardBefore.TOTAL_COUNT + 1 &&
      summaryAfterResolve.RESOLVED_COUNT >= 1,
      'Alert State Summary 계산'
    );
    passed++;

    const dashboardAfterResolve = _getDashboardAlertSummary();
    _assertHLAS0045(
      dashboardAfterResolve.TOTAL_COUNT ===
        dashboardBefore.TOTAL_COUNT + 1 &&
      dashboardAfterResolve.OPEN_COUNT ===
        dashboardBefore.OPEN_COUNT,
      'Dashboard RESOLVED Alert 표시 연계'
    );
    passed++;

    CacheMonitoringManager.getAlertCandidates = function() {
      return [{
        code: cacheCode,
        level: 'CRITICAL',
        domain: 'HLAS0045',
        key: 'CACHE',
        message: 'Cache Event Alert 연계 테스트'
      }];
    };
    CacheMonitoringManager.shouldTrigger = function() {
      return true;
    };
    CacheMonitoringManager.markTriggered = function() {
      cacheMarkCalls++;
    };

    _assertHLAS0045(
      AlertManager.checkSystemAlert() === true,
      'Cache Event Alert 연계 실행'
    );
    passed++;

    const cacheAlert = _findHLAS0045AlertByCode_(cacheCode);
    cacheAlertId = cacheAlert ? cacheAlert.id : '';
    _assertHLAS0045(
      cacheAlert &&
      cacheAlert.level === 'CRITICAL' &&
      cacheAlert.status === 'OPEN',
      'Cache Event Alert 생성'
    );
    passed++;

    _assertHLAS0045(
      cacheMarkCalls === 1,
      'Cache Alert Trigger State 연계'
    );
    passed++;

    const cacheHistory = AlertManager.getAlertHistory(cacheAlertId);
    _assertHLAS0045(
      cacheHistory.length === 1 &&
      cacheHistory[0].note === 'SOURCE=CACHE_MONITORING',
      'Cache Alert History Source 기록'
    );
    passed++;

    const dashboardWithCacheAlert = _getDashboardAlertSummary();
    _assertHLAS0045(
      dashboardWithCacheAlert.TOTAL_COUNT ===
        dashboardBefore.TOTAL_COUNT + 2 &&
      dashboardWithCacheAlert.OPEN_COUNT ===
        dashboardBefore.OPEN_COUNT + 1 &&
      dashboardWithCacheAlert.LAST_CODE === cacheCode,
      'Dashboard OPEN Cache Alert 표시'
    );
    passed++;

    ErrorHandler.handle = function(error, context) {
      errorHandlerCalls++;
      return error;
    };
    let invalidStateRejected = false;

    try {
      AlertManager.updateAlertState(
        operationalAlertId,
        'CLOSED',
        '지원하지 않는 상태'
      );
    } catch (error) {
      invalidStateRejected = /지원하지 않는 Alert Status/.test(
        error.message
      );
    }

    _assertHLAS0045(
      invalidStateRejected,
      '잘못된 Alert State 변경 차단'
    );
    passed++;

    _assertHLAS0045(
      errorHandlerCalls === 1,
      'ErrorHandler 연계'
    );
    passed++;

    const logSheetAfter = spreadsheet.getSheetByName('LOG');
    const duration = Date.now() - startedAt;
    _assertHLAS0045(
      typeof writeInfo === 'function' &&
      typeof writeWarn === 'function' &&
      typeof writeError === 'function' &&
      logSheetAfter &&
      logSheetAfter.getLastRow() > logRowsBefore &&
      duration < 20000,
      `LogUtils 기록 및 성능 ${duration}ms`
    );
    passed++;

    Logger.log(
      `[PASS] HLAS-0045 ${passed}/21 PASS ` +
      JSON.stringify({
        durationMs: duration,
        alertHistoryCount: history.length,
        cacheHistoryCount: cacheHistory.length,
        dashboardTotalDelta:
          dashboardWithCacheAlert.TOTAL_COUNT -
          dashboardBefore.TOTAL_COUNT,
        dashboardOpenDelta:
          dashboardWithCacheAlert.OPEN_COUNT -
          dashboardBefore.OPEN_COUNT,
        errorHandlerCalls: errorHandlerCalls,
        cacheMarkCalls: cacheMarkCalls,
        schemaColumns: 7
      })
    );
  } catch (error) {
    Logger.log(
      `[FAIL] HLAS-0045 ${passed}/21 PASS: ${error.message}`
    );
    throw error;
  } finally {
    ErrorHandler.handle = originalErrorHandler;
    CacheMonitoringManager.getAlertCandidates = originalCandidates;
    CacheMonitoringManager.shouldTrigger = originalShouldTrigger;
    CacheMonitoringManager.markTriggered = originalMarkTriggered;
    _deleteHLAS0045TestRows_(alertSheet);
    _deleteHLAS0045TestRows_(historySheet);
  }

  Logger.log('=== HLAS-0045 Alert Management Test 완료 ===');
}

function _findHLAS0045AlertByCode_(code) {
  const alerts = AlertManager.getAlerts();

  for (let i = alerts.length - 1; i >= 0; i--) {
    if (alerts[i].code === code) {
      return alerts[i];
    }
  }

  return null;
}

function _deleteHLAS0045TestRows_(sheet) {
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

    if (searchable.indexOf('HLAS0045') >= 0) {
      sheet.deleteRow(i + 1);
    }
  }
}

function _assertHLAS0045(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  Logger.log(`[PASS] ${message}`);
}
