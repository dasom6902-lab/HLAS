/** Webhook 등록·조회·배포 및 최대 3회 재시도를 제공한다. */

/** @param {Object} data Webhook 입력 @return {Object} */
function registerWebhook(data) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.WEBHOOK, '');
    const input = data || {};
    Validation.required(input.event, 'event'); Validation.required(input.targetUrl, 'targetUrl');
    return SheetRepository.insert(HLAS_CONSTANTS.SHEETS.WEBHOOK, {
      WEBHOOK_ID: 'HOOK-' + Utilities.getUuid().toUpperCase(),
      EVENT: String(input.event).toUpperCase(), TARGET_URL: String(input.targetUrl),
      METHOD: String(input.method || 'POST').toUpperCase(), STATUS: HLAS_CONSTANTS.API.ACTIVE,
      LAST_SENT: '', LAST_RESULT: '',
    });
  }, { operation: 'registerWebhook' });
}

/** @param {Object=} options 필터 @return {Object} */
function listWebhooks(options) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.WEBHOOK, '');
    const o = options || {};
    return SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.WEBHOOK).filter(function (r) {
      return (!o.event || String(r.EVENT) === String(o.event).toUpperCase()) &&
        (!o.status || String(r.STATUS) === String(o.status).toUpperCase());
    });
  }, { operation: 'listWebhooks' });
}

/** @param {Object} event Event Envelope @return {Object[]} */
function dispatchWebhooks(event) {
  return SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.WEBHOOK)
    .filter(function (r) { return r.STATUS === HLAS_CONSTANTS.API.ACTIVE && String(r.EVENT) === String(event.name).toUpperCase(); })
    .map(function (hook) { return sendWebhook_(hook, event); });
}

/** @param {string} webhookId Webhook ID @return {Object} */
function testWebhook(webhookId) {
  return CommonAPI.execute(function () {
    const hook = SheetRepository.findById(HLAS_CONSTANTS.SHEETS.WEBHOOK, webhookId);
    if (!hook) throw new NotFoundError('Webhook을 찾을 수 없습니다.', 'webhookId');
    return sendWebhook_(hook, { name: hook.EVENT, payload: { test: true }, timestamp: new Date().toISOString() });
  }, { operation: 'testWebhook' });
}

function sendWebhook_(hook, event) {
  let result = null; let error = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      if (String(hook.TARGET_URL).indexOf('mock://') === 0) result = { code: 200, body: 'MOCK_OK', attempt: attempt };
      else {
        const response = UrlFetchApp.fetch(hook.TARGET_URL, {
          method: String(hook.METHOD || 'POST').toLowerCase(),
          contentType: 'application/json', payload: JSON.stringify(event), muteHttpExceptions: true,
        });
        result = { code: response.getResponseCode(), body: response.getContentText().slice(0, 1000), attempt: attempt };
        if (result.code >= 400) {
          throw new SystemError(
            'Webhook HTTP 오류: ' + result.code,
            { statusCode: result.code, webhookId: hook.WEBHOOK_ID },
            'WEBHOOK_HTTP_ERROR'
          );
        }
      }
      break;
    } catch (e) { error = e; }
  }
  const ok = !!result && result.code < 400;
  SheetRepository.update(HLAS_CONSTANTS.SHEETS.WEBHOOK, hook.WEBHOOK_ID, {
    LAST_SENT: new Date(), LAST_RESULT: ok ? JSON.stringify(result) : String(error && error.message),
  });
  if (!ok) {
    auditIntegration_(HLAS_CONSTANTS.AUDIT_ACTION.WEBHOOK_FAILURE, 'WEBHOOK', hook.WEBHOOK_ID, 'FAIL', String(error && error.message));
    notifyIntegrationFailure_('Webhook 실패', hook.WEBHOOK_ID);
  }
  return { webhookId: hook.WEBHOOK_ID, ok: ok, result: result, error: error ? error.message : null };
}
