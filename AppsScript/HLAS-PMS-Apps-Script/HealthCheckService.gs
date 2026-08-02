/** HLAS 핵심 구성요소의 읽기 기반 Health Check를 수행한다. */

/** @return {Object} Repository Health */
function checkRepository() { return healthComponent_('REPOSITORY', function () { SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.PROJECT); return 'Repository 접근 정상'; }); }
/** @return {Object} Scheduler Health */
function checkScheduler() { return healthComponent_('SCHEDULER', function () { const r = getSchedulerStatus(); if (!r.ok) throw coreErrorFromResponse_(r.error); return 'Trigger ' + r.data.total + '개'; }); }
/** @return {Object} Workflow Health */
function checkWorkflow() { return healthSheet_('WORKFLOW', HLAS_CONSTANTS.SHEETS.WORKFLOW_HISTORY); }
/** @return {Object} Notification Health */
function checkNotification() { return healthSheet_('NOTIFICATION', HLAS_CONSTANTS.SHEETS.NOTIFICATION); }
/** @return {Object} Audit Health */
function checkAudit() { return healthSheet_('AUDIT', HLAS_CONSTANTS.SHEETS.AUDIT); }
/** @return {Object} API Health */
function checkAPI() { return healthComponent_('API', function () { const r = listEndpoints(); if (!r.ok) throw coreErrorFromResponse_(r.error); return 'Endpoint ' + r.data.length + '개'; }); }
/** @return {Object} Analytics Health */
function checkAnalytics() { return healthSheet_('ANALYTICS', HLAS_CONSTANTS.SHEETS.ANALYTICS_CACHE); }
/** @return {Object} Integration Health */
function checkIntegration() { return healthComponent_('INTEGRATION', function () { const r = listIntegrations(); if (!r.ok) throw coreErrorFromResponse_(r.error); return 'Integration ' + r.data.length + '개'; }); }

/** @return {Object} 전체 Health Report */
function runHealthCheck() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.PLATFORM, '');
    const checks = [
      checkRepository(), checkScheduler(), checkWorkflow(), checkNotification(),
      checkAudit(), checkAPI(), checkAnalytics(), checkIntegration(),
    ];
    checks.forEach(saveHealthCheck_);
    const down = checks.filter(function (c) { return c.status === HLAS_CONSTANTS.HEALTH_STATUS.DOWN; });
    const status = down.length ? HLAS_CONSTANTS.HEALTH_STATUS.DOWN :
      checks.some(function (c) { return c.status === HLAS_CONSTANTS.HEALTH_STATUS.DEGRADED; })
        ? HLAS_CONSTANTS.HEALTH_STATUS.DEGRADED : HLAS_CONSTANTS.HEALTH_STATUS.HEALTHY;
    if (down.length) notifyReliability_('Health Check 실패', down.map(function (c) { return c.component; }).join(', '));
    auditReliability_(HLAS_CONSTANTS.AUDIT_ACTION.HEALTH_CHECK, 'PLATFORM', status === 'DOWN' ? 'FAIL' : 'SUCCESS', status);
    return { status: status, timestamp: new Date(), checks: checks };
  }, { operation: 'runHealthCheck' });
}

function healthSheet_(component, sheet) {
  return healthComponent_(component, function () { return 'Rows ' + SheetRepository.findAll(sheet).length; });
}
function healthComponent_(component, action) {
  const started = new Date().getTime();
  try { return { component: component, status: HLAS_CONSTANTS.HEALTH_STATUS.HEALTHY, responseTime: new Date().getTime() - started, message: action(), detail: '' }; }
  catch (e) { return { component: component, status: HLAS_CONSTANTS.HEALTH_STATUS.DOWN, responseTime: new Date().getTime() - started, message: e.message, detail: String(e.stack || '') }; }
}
function saveHealthCheck_(c) {
  SheetRepository.insert(HLAS_CONSTANTS.SHEETS.SYSTEM_HEALTH, {
    CHECK_ID: 'CHECK-' + Utilities.getUuid().toUpperCase(), TIMESTAMP: new Date(),
    COMPONENT: c.component, STATUS: c.status, RESPONSE_TIME: c.responseTime,
    MESSAGE: c.message, DETAIL: c.detail || '',
  });
}
