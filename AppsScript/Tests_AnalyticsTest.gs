/**
 * TASK-0017 Analytics/KPI/Report/Cache 통합 테스트.
 * 운영 엔티티는 변경하지 않으며 테스트 중 생성한 캐시만 정리한다.
 * @return {Object} 테스트 결과
 */
function runAnalyticsTests() {
  const results = [];
  const beforeIds = analyticsCacheIdsForTest_();
  testAnalyticsResponse_(results, 'Organization KPI', getOrganizationKPI());
  testAnalyticsResponse_(results, 'Dashboard', getDashboard());
  testAnalyticsResponse_(results, 'Lead Time', calculateLeadTime());
  testAnalyticsResponse_(results, 'Cycle Time', calculateCycleTime());
  testAnalyticsResponse_(results, 'Throughput', calculateThroughput());
  testAnalyticsResponse_(results, 'Workload', calculateWorkload());
  testAnalyticsResponse_(results, 'Completion Rate', calculateCompletionRate());
  testAnalyticsResponse_(results, 'Delay Rate', calculateDelayRate());
  testAnalyticsResponse_(results, 'Approval Rate', calculateApprovalRate());
  testAnalyticsResponse_(results, 'Bottleneck', calculateBottleneck());
  testAnalyticsResponse_(results, 'Daily Report', generateDailyReport());
  testAnalyticsResponse_(results, 'Weekly Report', generateWeeklyReport());
  testAnalyticsResponse_(results, 'Monthly Report', generateMonthlyReport());
  const csv = exportDashboard('CSV');
  testAnalyticsResponse_(results, 'CSV Export', csv);
  assertAnalyticsTest_(csv.ok && csv.data.content.indexOf('SECTION,METRIC,VALUE') === 0, 'CSV Header');
  results.push({ name: 'CSV Header', status: 'PASS' });
  testAnalyticsResponse_(results, 'JSON Export', exportDashboard('JSON'));
  testAnalyticsResponse_(results, 'Cache Refresh', refreshAnalyticsCache());
  cleanupAnalyticsCacheForTest_(beforeIds);
  return {
    ok: results.every(function (r) { return r.status === 'PASS'; }),
    total: results.length,
    passed: results.filter(function (r) { return r.status === 'PASS'; }).length,
    results: results,
  };
}

function testAnalyticsResponse_(results, name, response) {
  assertAnalyticsTest_(response && response.ok, name + ': ' + JSON.stringify(response && response.error));
  results.push({ name: name, status: 'PASS' });
}

function assertAnalyticsTest_(condition, message) {
  if (!condition) throw new Error('[AnalyticsTest] ' + message);
}

function analyticsCacheIdsForTest_() {
  const C = HLAS_CONSTANTS;
  return SheetRepository.findAll(C.SHEETS.ANALYTICS_CACHE).map(function (r) {
    return String(r[C.FIELD.ANALYTICS.CACHE_ID] || '');
  });
}

function cleanupAnalyticsCacheForTest_(beforeIds) {
  const C = HLAS_CONSTANTS;
  SheetRepository.findAll(C.SHEETS.ANALYTICS_CACHE).forEach(function (r) {
    const id = String(r[C.FIELD.ANALYTICS.CACHE_ID] || '');
    if (id && beforeIds.indexOf(id) === -1) SheetRepository.delete(C.SHEETS.ANALYTICS_CACHE, id);
  });
}
