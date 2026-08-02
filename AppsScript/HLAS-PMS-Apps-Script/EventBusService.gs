/** HLAS 내부 이벤트 발행·구독·배포를 관리한다. */
const HLAS_EVENT_SUBSCRIBERS = {};

/** @param {string} event 이벤트명 @param {Function} handler 처리기 @return {string} 구독 ID */
function subscribe(event, handler) {
  Validation.required(event, 'event');
  if (typeof handler !== 'function') throw new ValidationError('handler 함수가 필요합니다.', 'handler');
  const id = 'SUB-' + Utilities.getUuid();
  (HLAS_EVENT_SUBSCRIBERS[event] = HLAS_EVENT_SUBSCRIBERS[event] || []).push({ id: id, handler: handler });
  return id;
}

/** @param {string} event 이벤트명 @param {string} subscriptionId 구독 ID @return {boolean} */
function unsubscribe(event, subscriptionId) {
  const list = HLAS_EVENT_SUBSCRIBERS[event] || [];
  const before = list.length;
  HLAS_EVENT_SUBSCRIBERS[event] = list.filter(function (s) { return s.id !== subscriptionId; });
  return before !== HLAS_EVENT_SUBSCRIBERS[event].length;
}

/** @param {string|Object} event 이벤트 @param {Object=} payload 데이터 @return {Object} */
function publish(event, payload) {
  return CommonAPI.execute(function () {
    const envelope = typeof event === 'object' ? event : {
      name: String(event), payload: payload || {}, timestamp: new Date().toISOString(),
      eventId: 'EVT-' + Utilities.getUuid().toUpperCase(),
    };
    Validation.required(envelope.name, 'event');
    const result = dispatch(envelope);
    auditIntegration_(HLAS_CONSTANTS.AUDIT_ACTION.EVENT_PUBLISH, 'EVENT', envelope.eventId, 'SUCCESS', envelope.name);
    return result;
  }, { operation: 'publish' });
}

/** @param {Object} event Event Envelope @return {Object} */
function dispatch(event) {
  const handlers = HLAS_EVENT_SUBSCRIBERS[event.name] || [];
  const internal = handlers.map(function (s) {
    try { return { subscriptionId: s.id, ok: true, data: s.handler(event) }; }
    catch (e) { return { subscriptionId: s.id, ok: false, error: e.message }; }
  });
  return { event: event.name, internal: internal, webhook: dispatchWebhooks(event) };
}
