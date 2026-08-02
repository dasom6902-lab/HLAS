/** Exponential Backoff(1·2·4초), 최대 3회 Retry를 제공한다. */

/**
 * @param {Function} operation 실행 함수
 * @param {Object=} options maxAttempts, baseDelayMs, sleepFn
 * @return {*} 성공 결과
 */
function executeWithRetry(operation, options) {
  if (typeof operation !== 'function') throw new ValidationError('operation 함수가 필요합니다.', 'operation');
  const o = options || {};
  const maxAttempts = Math.min(3, Math.max(1, Number(o.maxAttempts || 3)));
  const baseDelay = Math.max(0, Number(o.baseDelayMs === undefined ? 1000 : o.baseDelayMs));
  const sleep = o.sleepFn || Utilities.sleep;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try { return operation(attempt); }
    catch (e) {
      lastError = e;
      if (attempt < maxAttempts) sleep(baseDelay * Math.pow(2, attempt - 1));
    }
  }
  throw lastError || new CoreError('RETRY_FAILED', 'Retry에 실패했습니다.');
}
