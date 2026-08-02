/** API Key와 Bearer Token의 발급·검증·폐기를 담당한다. */

/** @param {Object} data Client 정보 @return {Object} 발급 결과 */
function issueApiKey(data) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.API, '');
    const input = data || {};
    Validation.required(input.client, 'client');
    const id = 'KEY-' + Utilities.getUuid().toUpperCase();
    const secret = HLAS_CONSTANTS.API.KEY_PREFIX + Utilities.getUuid().replace(/-/g, '');
    const record = {
      id: id, client: String(input.client), hash: hashApiSecret_(secret),
      status: HLAS_CONSTANTS.API.ACTIVE,
      expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : '',
      permissions: input.permissions || ['READ'],
      createdAt: new Date().toISOString(),
    };
    PropertiesService.getScriptProperties().setProperty(apiKeyProperty_(id), JSON.stringify(record));
    return { keyId: id, apiKey: id + '.' + secret, client: record.client, expiresAt: record.expiresAt };
  }, { operation: 'issueApiKey' });
}

/** @param {string} keyId Key ID @return {Object} 폐기 결과 */
function revokeApiKey(keyId) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DELETE, HLAS_CONSTANTS.ENTITY.API, keyId);
    const record = getApiKeyRecord_(keyId);
    if (!record) throw new NotFoundError('API Key를 찾을 수 없습니다.', 'keyId');
    record.status = HLAS_CONSTANTS.API.INACTIVE;
    PropertiesService.getScriptProperties().setProperty(apiKeyProperty_(keyId), JSON.stringify(record));
    return { keyId: keyId, revoked: true };
  }, { operation: 'revokeApiKey' });
}

/** @return {Object} API Key 메타데이터 목록 */
function listApiKeys() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.API, '');
    const props = PropertiesService.getScriptProperties();
    return Object.keys(props.getProperties()).filter(function (k) {
      return k.indexOf('HLAS_API_KEY_') === 0;
    }).map(function (k) {
      const r = JSON.parse(props.getProperty(k));
      return { keyId: r.id, client: r.client, status: r.status, expiresAt: r.expiresAt, permissions: r.permissions };
    });
  }, { operation: 'listApiKeys' });
}

/** @param {Object|string} credentials 인증정보 @return {Object} 인증된 Client */
function authenticateApi(credentials) {
  const input = typeof credentials === 'string' ? { apiKey: credentials } : (credentials || {});
  const token = String(input.apiKey || input.bearerToken || '').replace(/^Bearer\s+/i, '');
  Validation.required(token, 'credentials');
  const parts = token.split('.');
  if (parts.length !== 2) throw new CoreError('AUTH_INVALID', 'API 인증 정보가 올바르지 않습니다.', 'credentials');
  const record = getApiKeyRecord_(parts[0]);
  if (!record || record.status !== HLAS_CONSTANTS.API.ACTIVE ||
      record.hash !== hashApiSecret_(parts[1]) ||
      (record.expiresAt && new Date(record.expiresAt) <= new Date())) {
    auditIntegration_(HLAS_CONSTANTS.AUDIT_ACTION.AUTH_FAILURE, 'API', parts[0], 'FAIL', 'API 인증 실패');
    throw new CoreError('AUTH_FAILED', 'API 인증에 실패했습니다.', 'credentials');
  }
  return { keyId: record.id, client: record.client, permissions: record.permissions || [] };
}

function hashApiSecret_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { const v = (b + 256) % 256; return ('0' + v.toString(16)).slice(-2); }).join('');
}
function apiKeyProperty_(id) { return 'HLAS_API_KEY_' + String(id); }
function getApiKeyRecord_(id) {
  const raw = PropertiesService.getScriptProperties().getProperty(apiKeyProperty_(String(id || '').split('.')[0]));
  return raw ? JSON.parse(raw) : null;
}
