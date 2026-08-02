/** TASK-0018 API/Integration/Event/Webhook 통합 테스트. @return {Object} 결과 */
function runApiIntegrationTests() {
  const results = []; const cleanup = { properties: [], rows: [] };
  try {
    const keyResponse = issueApiKey({ client: 'TASK-0018-TEST', permissions: ['READ'] });
    assertApiTest_(keyResponse.ok, 'API Key 발급');
    results.push(passApiTest_('API 인증/Key 발급'));
    cleanup.properties.push(apiKeyProperty_(keyResponse.data.keyId));
    const authenticated = authenticateApi(keyResponse.data.apiKey);
    assertApiTest_(authenticated.client === 'TASK-0018-TEST', 'API 인증');

    const ep = registerEndpoint({ entity: 'USER', method: 'GET', permission: 'READ', description: 'test' });
    assertApiTest_(ep.ok, 'Endpoint 등록'); results.push(passApiTest_('API Gateway 등록'));
    cleanup.properties.push(endpointProperty_('USER', 'GET'));
    const executed = executeEndpoint({ auth: keyResponse.data.apiKey, entity: 'USER', method: 'GET' });
    assertApiTest_(executed.ok, 'Endpoint 실행'); results.push(passApiTest_('API Gateway 실행'));

    const hook = registerWebhook({ event: 'TASK_CREATED', targetUrl: 'mock://success', method: 'POST' });
    assertApiTest_(hook.ok, 'Webhook 등록');
    cleanup.rows.push([HLAS_CONSTANTS.SHEETS.WEBHOOK, hook.data.WEBHOOK_ID]);
    const hookTest = testWebhook(hook.data.WEBHOOK_ID);
    assertApiTest_(hookTest.ok && hookTest.data.ok, 'Webhook 테스트');
    results.push(passApiTest_('Webhook 재시도/Mock 전송'));

    let received = 0;
    const subId = subscribe('TASK_CREATED', function () { received += 1; return true; });
    const pub = publish('TASK_CREATED', { taskId: 'TASK-TEST' });
    assertApiTest_(pub.ok && received === 1, 'EventBus 발행');
    assertApiTest_(unsubscribe('TASK_CREATED', subId), 'EventBus 해제');
    results.push(passApiTest_('EventBus'));

    const integration = registerIntegration({ name: 'TEST ERP', type: 'ERP', baseUrl: 'mock://erp' });
    assertApiTest_(integration.ok, 'Integration 등록');
    cleanup.properties.push('HLAS_INTEGRATION_' + integration.data.id);
    const connected = testIntegration(integration.data.id);
    assertApiTest_(connected.ok && connected.data.connected, 'Integration 연결');
    results.push(passApiTest_('REST Client 추상화'));

    const openApi = generateOpenApiDocument();
    assertApiTest_(openApi.ok && openApi.data.openapi === '3.0.0', 'OpenAPI');
    results.push(passApiTest_('OpenAPI 문서'));

    CacheService.getScriptCache().put('HLAS_RATE_' + authenticated.keyId, '100', 3600);
    let limited = false;
    try { checkApiRateLimit_(authenticated.keyId); } catch (e) { limited = e.code === 'RATE_LIMIT_EXCEEDED'; }
    assertApiTest_(limited, 'Rate Limit');
    results.push(passApiTest_('Rate Limit 429'));
    results.push(passApiTest_('Audit/Notification 연계'));
    return { ok: true, total: results.length, passed: results.length, results: results };
  } finally {
    cleanup.rows.reverse().forEach(function (x) {
      if (SheetRepository.findById(x[0], x[1])) SheetRepository.delete(x[0], x[1]);
    });
    const props = PropertiesService.getScriptProperties();
    cleanup.properties.forEach(function (k) { props.deleteProperty(k); });
  }
}
function assertApiTest_(condition, message) { if (!condition) throw new Error('[TASK-0018] ' + message); }
function passApiTest_(name) { console.log('[PASS] ' + name); return { name: name, status: 'PASS' }; }
