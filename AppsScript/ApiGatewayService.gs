/** 인증·Rate Limit·Endpoint 실행·API Log를 통합하는 Gateway. */

/** @param {Object} definition Endpoint 정의 @return {Object} */
function registerEndpoint(definition) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.API, '');
    const d = definition || {};
    Validation.required(d.entity, 'entity'); Validation.required(d.method, 'method');
    const key = endpointProperty_(d.entity, d.method);
    const record = {
      version: String(d.version || HLAS_CONSTANTS.API.VERSION),
      entity: String(d.entity).toUpperCase(), method: String(d.method).toUpperCase(),
      permission: String(d.permission || 'READ').toUpperCase(),
      status: HLAS_CONSTANTS.API.ACTIVE, description: String(d.description || ''),
      createdAt: new Date().toISOString(),
    };
    validateEndpointDefinition_(record);
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(record));
    return record;
  }, { operation: 'registerEndpoint' });
}

/** @param {Object} request Gateway 요청 @return {Object} */
function executeEndpoint(request) {
  const started = new Date();
  const req = request || {};
  let client = { client: 'UNKNOWN', keyId: '' };
  try {
    client = authenticateApi(req.auth || req.apiKey || req.bearerToken);
    checkApiRateLimit_(client.keyId);
    const entity = String(req.entity || '').toUpperCase();
    const method = String(req.method || 'GET').toUpperCase();
    const endpoint = getEndpoint_(entity, method);
    if (!endpoint || endpoint.status !== HLAS_CONSTANTS.API.ACTIVE) {
      throw new NotFoundError('활성 Endpoint를 찾을 수 없습니다.', 'endpoint');
    }
    if (client.permissions.indexOf(endpoint.permission) === -1 &&
        client.permissions.indexOf('*') === -1) {
      throw new CoreError('PERMISSION_DENIED', 'Endpoint 권한이 없습니다.', 'permission');
    }
    const data = routeEndpoint_(entity, method, req);
    writeApiLog_(req, client, 200, started, 'SUCCESS');
    auditIntegration_(HLAS_CONSTANTS.AUDIT_ACTION.API_CALL, entity, String(req.id || ''), 'SUCCESS', method);
    return CommonAPI.success(data, { version: endpoint.version });
  } catch (error) {
    const status = error && error.code === 'RATE_LIMIT_EXCEEDED' ? 429 :
      error && (error.code === 'AUTH_FAILED' || error.code === 'AUTH_INVALID') ? 401 : 400;
    writeApiLog_(req, client, status, started, error.message || 'ERROR');
    if (status === 429) notifyIntegrationFailure_('API Rate Limit 초과', client.client);
    return CommonAPI.error(error, { version: HLAS_CONSTANTS.API.VERSION });
  }
}

/** @return {Object} 등록 Endpoint 목록 */
function listEndpoints() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.API, '');
    const props = PropertiesService.getScriptProperties();
    return Object.keys(props.getProperties()).filter(function (k) {
      return k.indexOf('HLAS_ENDPOINT_') === 0;
    }).map(function (k) { return JSON.parse(props.getProperty(k)); });
  }, { operation: 'listEndpoints' });
}

/** @param {string} entity Entity @param {string} method Method @return {Object} */
function disableEndpoint(entity, method) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.UPDATE, HLAS_CONSTANTS.ENTITY.API, entity);
    const record = getEndpoint_(entity, method);
    if (!record) throw new NotFoundError('Endpoint를 찾을 수 없습니다.', 'endpoint');
    record.status = HLAS_CONSTANTS.API.INACTIVE;
    PropertiesService.getScriptProperties().setProperty(endpointProperty_(entity, method), JSON.stringify(record));
    return record;
  }, { operation: 'disableEndpoint' });
}

/** @return {Object} OpenAPI 스타일 문서 */
function generateOpenApiDocument() {
  const listed = listEndpoints();
  if (!listed.ok) return listed;
  return CommonAPI.success({
    openapi: '3.0.0', info: { title: 'HLAS Open API', version: HLAS_CONSTANTS.API.VERSION },
    endpoints: listed.data.map(function (e) {
      return { path: '/api/' + e.version + '/' + e.entity.toLowerCase(), method: e.method, permission: e.permission, response: '{ok,data,error,meta}' };
    }),
  });
}

function routeEndpoint_(entity, method, req) {
  if (entity === 'REPORT') {
    if (method !== 'GET') throw new CoreError('METHOD_NOT_ALLOWED', 'REPORT는 GET만 지원합니다.', 'method');
    return unwrapGateway_(generateDailyReport());
  }
  const map = {
    PROJECT: { GET: function () {
      const response = getProjectList(req.options);
      if (!req.id) return response;
      if (!response.ok) return response;
      const found = response.data.filter(function (r) { return String(r.PROJECT_ID) === String(req.id); })[0];
      return found ? CommonAPI.success(found) : CommonAPI.error(new NotFoundError('프로젝트를 찾을 수 없습니다.', 'id'));
    } },
    FEATURE: { GET: function () { return req.id ? getFeature(req.id) : getFeatureList(req.options); }, POST: function () { return createFeature(req.data); }, PUT: function () { return updateFeature(req.id, req.data); }, DELETE: function () { return deleteFeature(req.id); } },
    FUNCTION: { GET: function () { return req.id ? getFunction(req.id) : getFunctionList(req.parentId); }, POST: function () { return createFunction(req.data); }, PUT: function () { return updateFunction(req.id, req.data); }, DELETE: function () { return deleteFunction(req.id); } },
    TASK: { GET: function () { return req.id ? getTask(req.id) : getTaskList(req.parentId); }, POST: function () { return createTask(req.data); }, PUT: function () { return updateTask(req.id, req.data); }, DELETE: function () { return deleteTask(req.id); } },
    USER: { GET: function () { return SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.USER); } },
  };
  if (!map[entity] || !map[entity][method]) throw new CoreError('METHOD_NOT_ALLOWED', '지원하지 않는 Endpoint/Method입니다.', 'method');
  return unwrapGateway_(map[entity][method]());
}

function unwrapGateway_(response) {
  if (response && response.ok) return response.data;
  if (response && response.error) throw new CoreError(response.error.code, response.error.message, response.error.field, response.error.details);
  return response;
}
function validateEndpointDefinition_(r) {
  if (HLAS_CONSTANTS.API.ENDPOINTS.indexOf(r.entity) === -1) throw new ValidationError('지원하지 않는 Entity입니다.', 'entity');
  if (HLAS_CONSTANTS.API.METHODS.indexOf(r.method) === -1) throw new ValidationError('지원하지 않는 Method입니다.', 'method');
}
function endpointProperty_(entity, method) { return 'HLAS_ENDPOINT_' + String(entity).toUpperCase() + '_' + String(method).toUpperCase(); }
function getEndpoint_(entity, method) {
  const raw = PropertiesService.getScriptProperties().getProperty(endpointProperty_(entity, method));
  return raw ? JSON.parse(raw) : null;
}
function checkApiRateLimit_(keyId) {
  const cache = CacheService.getScriptCache();
  const key = 'HLAS_RATE_' + keyId;
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), 3600);
  if (count > HLAS_CONSTANTS.API.RATE_LIMIT_PER_HOUR) {
    auditIntegration_(HLAS_CONSTANTS.AUDIT_ACTION.RATE_LIMIT, 'API', keyId, 'DENIED', String(count));
    throw new CoreError('RATE_LIMIT_EXCEEDED', '시간당 요청 한도를 초과했습니다.', 'rateLimit', { limit: 100 });
  }
}
function writeApiLog_(req, client, status, started, message) {
  const key = String(client.keyId || '');
  SheetRepository.insert(HLAS_CONSTANTS.SHEETS.API_LOG, {
    API_LOG_ID: 'APILOG-' + Utilities.getUuid().toUpperCase(), TIMESTAMP: new Date(),
    CLIENT: client.client || 'UNKNOWN', API_KEY: key ? key.slice(0, 8) + '***' : '',
    ENDPOINT: String(req.entity || ''), METHOD: String(req.method || 'GET'),
    STATUS: status, RESPONSE_TIME: new Date() - started,
    USER: Session.getActiveUser().getEmail() || '', MESSAGE: String(message || ''),
  });
}
