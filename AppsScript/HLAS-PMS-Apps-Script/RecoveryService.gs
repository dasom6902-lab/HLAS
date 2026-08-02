/** Retry, Circuit Reset, Scheduler/Dead Job 복구를 제공한다. */

/** @param {Function} operation 복구 작업 @param {Object=} options Retry 옵션 @return {Object} */
function recoverWithRetry(operation, options) {
  return CommonAPI.execute(function () {
    const result = executeWithRetry(operation, options);
    auditReliability_(HLAS_CONSTANTS.AUDIT_ACTION.RECOVERY, 'RETRY', 'SUCCESS', '');
    return result;
  }, { operation: 'recoverWithRetry' });
}

/** @param {string} service 서비스명 @return {Object} */
function recoverCircuit(service) { return CommonAPI.success(resetCircuit(service)); }

/** @return {Object} Scheduler Trigger 복구 */
function recoverScheduler() {
  const response = registerSchedulerTriggers();
  if (response && response.ok) auditReliability_(HLAS_CONSTANTS.AUDIT_ACTION.RECOVERY, 'SCHEDULER', 'SUCCESS', JSON.stringify(response.data));
  else notifyReliability_('Scheduler 장애', response && response.error ? response.error.message : '복구 실패');
  return response;
}

/** @param {Array<Object>} jobs Dead Job 목록 @param {Function=} handler 처리기 @return {Object} */
function recoverDeadJobs(jobs, handler) {
  return CommonAPI.execute(function () {
    const list = Array.isArray(jobs) ? jobs : [];
    const fn = handler || function (job) { return job; };
    const recovered = []; const failed = [];
    list.forEach(function (job) {
      try { recovered.push(executeWithRetry(function () { return fn(job); }, { maxAttempts: 3 })); }
      catch (e) { failed.push({ job: job, error: e.message }); }
    });
    auditReliability_(HLAS_CONSTANTS.AUDIT_ACTION.RECOVERY, 'DEAD_JOB', failed.length ? 'FAIL' : 'SUCCESS', JSON.stringify({ recovered: recovered.length, failed: failed.length }));
    return { recovered: recovered, failed: failed };
  }, { operation: 'recoverDeadJobs' });
}

function auditReliability_(action, target, result, message) {
  if (typeof writeAudit === 'function') writeAudit({ action: action, entity: HLAS_CONSTANTS.ENTITY.PLATFORM, entityId: target || '', result: result, message: message || '', detail: '' });
}
function notifyReliability_(title, message) {
  if (typeof createNotification === 'function') createNotification({ type: HLAS_CONSTANTS.NOTIFICATION_TYPE.ERROR, user: '', entity: HLAS_CONSTANTS.ENTITY.PLATFORM, entityId: '', title: title, message: message || '' });
}
