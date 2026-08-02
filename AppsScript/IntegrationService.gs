/** ERP/WMS/MES/Google Workspace/Generic REST 연결을 위한 추상 REST Client. */

/** @param {Object} config Integration 설정 @return {Object} 등록 결과 */
function registerIntegration(config) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.INTEGRATION, '');
    const c = config || {};
    Validation.required(c.name, 'name'); Validation.required(c.type, 'type');
    if (!HLAS_CONSTANTS.INTEGRATION_TYPE[String(c.type).toUpperCase()]) throw new ValidationError('지원하지 않는 Integration Type입니다.', 'type');
    const id = 'INT-' + Utilities.getUuid().toUpperCase();
    const record = { id: id, name: String(c.name), type: String(c.type).toUpperCase(), baseUrl: String(c.baseUrl || ''), status: HLAS_CONSTANTS.API.ACTIVE };
    PropertiesService.getScriptProperties().setProperty('HLAS_INTEGRATION_' + id, JSON.stringify(record));
    return record;
  }, { operation: 'registerIntegration' });
}

/** @return {Object} Integration 목록 */
function listIntegrations() {
  return CommonAPI.execute(function () {
    const props = PropertiesService.getScriptProperties();
    return Object.keys(props.getProperties()).filter(function (k) { return k.indexOf('HLAS_INTEGRATION_') === 0; })
      .map(function (k) { return JSON.parse(props.getProperty(k)); });
  }, { operation: 'listIntegrations' });
}

/** @param {string} integrationId ID @return {Object} 연결 테스트 */
function testIntegration(integrationId) {
  return CommonAPI.execute(function () {
    const raw = PropertiesService.getScriptProperties().getProperty('HLAS_INTEGRATION_' + integrationId);
    if (!raw) throw new NotFoundError('Integration을 찾을 수 없습니다.', 'integrationId');
    const c = JSON.parse(raw);
    if (!c.baseUrl || c.baseUrl.indexOf('mock://') === 0) return { integrationId: integrationId, connected: true, mode: 'MOCK' };
    const result = restClientRequest_({ url: c.baseUrl, method: 'get' });
    return { integrationId: integrationId, connected: result.status < 400, status: result.status };
  }, { operation: 'testIntegration' });
}

function restClientRequest_(request) {
  const started = new Date();
  if (String(request.url || '').indexOf('mock://') === 0) return { status: 200, body: '{}', elapsed: 0 };
  try {
    const response = UrlFetchApp.fetch(request.url, {
      method: String(request.method || 'get').toLowerCase(),
      headers: request.headers || {}, contentType: 'application/json',
      payload: request.body ? JSON.stringify(request.body) : undefined,
      muteHttpExceptions: true,
    });
    return { status: response.getResponseCode(), body: response.getContentText(), elapsed: new Date() - started };
  } catch (e) {
    notifyIntegrationFailure_('Integration API 장애', request.url || '');
    throw new CoreError('INTEGRATION_ERROR', e.message, 'url');
  }
}

function auditIntegration_(action, entity, entityId, result, message) {
  if (typeof writeAudit !== 'function') return;
  writeAudit({ action: action, entity: entity, entityId: entityId || '', result: result, message: message || '', detail: '' });
}
function notifyIntegrationFailure_(title, message) {
  if (typeof createNotification !== 'function') return;
  createNotification({ type: HLAS_CONSTANTS.NOTIFICATION_TYPE.ERROR, user: '', entity: HLAS_CONSTANTS.ENTITY.INTEGRATION, entityId: '', title: title, message: String(message || '') });
}
