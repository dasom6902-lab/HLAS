/** 외부 시스템 장애를 차단하고 자동 HALF_OPEN 복구를 제공한다. */

/** @param {string} service 서비스명 @param {Function} operation 작업 @param {Object=} options 정책 @return {*} 결과 */
function executeWithCircuitBreaker(service, operation, options) {
  Validation.required(service, 'service');
  if (typeof operation !== 'function') throw new ValidationError('operation 함수가 필요합니다.', 'operation');
  const o = options || {}; const state = getCircuitState_(service);
  const now = new Date().getTime(); const resetMs = Number(o.resetTimeoutMs || 60000);
  if (state.state === HLAS_CONSTANTS.CIRCUIT_STATE.OPEN) {
    if (now - state.openedAt < resetMs) throw new CoreError('CIRCUIT_OPEN', 'Circuit이 OPEN 상태입니다.', 'service', state);
    state.state = HLAS_CONSTANTS.CIRCUIT_STATE.HALF_OPEN;
  }
  try {
    const result = operation();
    saveCircuitState_(service, { state: HLAS_CONSTANTS.CIRCUIT_STATE.CLOSED, failures: 0, openedAt: 0 });
    return result;
  } catch (e) {
    state.failures = Number(state.failures || 0) + 1;
    if (state.state === HLAS_CONSTANTS.CIRCUIT_STATE.HALF_OPEN || state.failures >= Number(o.failureThreshold || 3)) {
      state.state = HLAS_CONSTANTS.CIRCUIT_STATE.OPEN; state.openedAt = now;
      auditReliability_(HLAS_CONSTANTS.AUDIT_ACTION.CIRCUIT_OPEN, service, 'FAIL', e.message);
      notifyReliability_('Circuit Open', service + ': ' + e.message);
    }
    saveCircuitState_(service, state); throw e;
  }
}

/** @param {string} service 서비스명 @return {Object} 상태 */
function getCircuitStatus(service) { return getCircuitState_(service); }
/** @param {string} service 서비스명 @return {Object} Reset 상태 */
function resetCircuit(service) {
  Validation.required(service, 'service');
  const state = { state: HLAS_CONSTANTS.CIRCUIT_STATE.CLOSED, failures: 0, openedAt: 0 };
  saveCircuitState_(service, state);
  auditReliability_(HLAS_CONSTANTS.AUDIT_ACTION.RECOVERY, service, 'SUCCESS', 'Circuit Reset');
  return state;
}
function circuitProperty_(s) { return 'HLAS_CIRCUIT_' + String(s).toUpperCase(); }
function getCircuitState_(s) {
  const raw = PropertiesService.getScriptProperties().getProperty(circuitProperty_(s));
  return raw ? JSON.parse(raw) : { state: HLAS_CONSTANTS.CIRCUIT_STATE.CLOSED, failures: 0, openedAt: 0 };
}
function saveCircuitState_(s, state) { PropertiesService.getScriptProperties().setProperty(circuitProperty_(s), JSON.stringify(state)); }
