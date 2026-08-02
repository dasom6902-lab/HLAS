/** Runtime 성능 측정과 집계를 제공한다. */
const HLAS_PERFORMANCE_TIMERS = {};

/** @param {string} service 서비스명 @return {string} Timer ID */
function startTimer(service) {
  Validation.required(service, 'service');
  const id = 'TIMER-' + Utilities.getUuid();
  HLAS_PERFORMANCE_TIMERS[id] = { service: String(service), started: new Date().getTime() };
  return id;
}

/** @param {string} timerId Timer ID @param {boolean=} success 성공 여부 @param {Object=} detail 상세 @return {Object} Metric */
function stopTimer(timerId, success, detail) {
  const timer = HLAS_PERFORMANCE_TIMERS[timerId];
  if (!timer) throw new NotFoundError('Timer를 찾을 수 없습니다.', 'timerId');
  delete HLAS_PERFORMANCE_TIMERS[timerId];
  return recordMetric({
    service: timer.service, executionTime: new Date().getTime() - timer.started,
    success: success !== false, detail: detail || {},
  });
}

/** @param {Object} data Metric 입력 @return {Object} 저장 Metric */
function recordMetric(data) {
  const d = data || {};
  Validation.required(d.service, 'service');
  if (!isFinite(Number(d.executionTime)) || Number(d.executionTime) < 0) {
    throw new ValidationError('실행시간은 0 이상의 숫자여야 합니다.', 'executionTime');
  }
  return SheetRepository.insert(HLAS_CONSTANTS.SHEETS.RUNTIME_METRICS, {
    METRIC_ID: 'METRIC-' + Utilities.getUuid().toUpperCase(), TIMESTAMP: new Date(),
    SERVICE: String(d.service), EXECUTION_TIME: Number(d.executionTime),
    SUCCESS: d.success === false ? 'N' : 'Y', MEMORY: String(d.memory || ''),
    DETAIL: JSON.stringify(d.detail || {}),
  });
}

/** @param {Object=} options service, limit @return {Object} Core API 응답 */
function getMetrics(options) {
  return CommonAPI.execute(function () {
    const o = options || {};
    const rows = SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.RUNTIME_METRICS)
      .filter(function (r) { return !o.service || String(r.SERVICE) === String(o.service); });
    const times = rows.map(function (r) { return Number(r.EXECUTION_TIME || 0); });
    const failures = rows.filter(function (r) { return String(r.SUCCESS) !== 'Y'; }).length;
    return {
      summary: {
        count: rows.length, average: times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : 0,
        max: times.length ? Math.max.apply(null, times) : 0,
        failureRate: rows.length ? Math.round(failures * 10000 / rows.length) / 100 : 0,
      },
      rows: rows.slice(-(Number(o.limit) || 100)),
    };
  }, { operation: 'getMetrics' });
}

/** @param {number=} thresholdMs 느린 기준 @return {Object} Core API 응답 */
function getSlowOperations(thresholdMs) {
  const limit = Number(thresholdMs || 1000);
  return CommonAPI.execute(function () {
    return SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.RUNTIME_METRICS)
      .filter(function (r) { return Number(r.EXECUTION_TIME || 0) >= limit; })
      .sort(function (a, b) { return Number(b.EXECUTION_TIME) - Number(a.EXECUTION_TIME); });
  }, { operation: 'getSlowOperations' });
}
