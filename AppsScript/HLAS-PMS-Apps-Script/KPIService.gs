/**
 * 조직·프로젝트·사용자 KPI와 24시간 캐시를 관리한다.
 */

/** @param {string} projectId 프로젝트 ID @return {Object} 프로젝트 KPI */
function getProjectKPI(projectId) {
  Validation.required(projectId, 'PROJECT_ID');
  return getScopedKPI_({ projectId: String(projectId).trim() }, 'getProjectKPI');
}

/** @param {string} userId 사용자 ID 또는 담당자 @return {Object} 사용자 KPI */
function getUserKPI(userId) {
  Validation.required(userId, 'USER_ID');
  return getScopedKPI_({ userId: String(userId).trim() }, 'getUserKPI');
}

/** @return {Object} 조직 전체 KPI */
function getOrganizationKPI() {
  return getScopedKPI_({}, 'getOrganizationKPI');
}

function getScopedKPI_(scope, operation) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DASHBOARD);
    const s = loadAnalyticsSnapshot_();
    if (scope.projectId) {
      const exists = s.projects.some(function (r) { return String(r.PROJECT_ID) === String(scope.projectId); });
      if (!exists) throw new CoreError('NOT_FOUND', '프로젝트를 찾을 수 없습니다.', 'PROJECT_ID', scope.projectId);
    }
    const tasks = filterAnalyticsTasks_(s.tasks, scope);
    const statuses = tasks.map(function (r) { return normalizeAnalyticsStatus_(r[HLAS_CONSTANTS.FIELD.TASK.STATUS]); });
    const pending = s.workflow.filter(function (r) { return String(r.TO_STATUS) === 'WAITING_APPROVAL'; }).length;
    const approved = s.workflow.filter(function (r) { return String(r.TO_STATUS) === 'APPROVED'; }).length;
    return {
      scope: scope,
      project: {
        total: scope.projectId ? 1 : s.projects.length,
        inProgress: s.projects.filter(function (r) { return normalizeAnalyticsStatus_(r['상태']) === 'IN_PROGRESS'; }).length,
        completed: s.projects.filter(function (r) { return normalizeAnalyticsStatus_(r['상태']) === 'COMPLETED'; }).length,
      },
      task: {
        total: tasks.length,
        completed: statuses.filter(function (v) { return v === 'COMPLETED'; }).length,
        completionRate: computeAnalyticsMetric_('completionRate', Object.assign({}, s, { tasks: tasks }), scope).value,
        delayRate: computeAnalyticsMetric_('delayRate', Object.assign({}, s, { tasks: tasks }), scope).value,
      },
      approval: { pending: pending, approved: approved },
      workflowThroughput: computeAnalyticsMetric_('throughput', Object.assign({}, s, { tasks: tasks }), scope).value,
      notificationCount: s.notifications.length,
      auditCount: s.audit.length,
      generatedAt: new Date(),
    };
  }, { operation: operation });
}

/**
 * Dashboard용 KPI·최근 활동·분석 정보를 한 번에 반환한다.
 * 기존 DashboardService가 이 함수를 호출하여 기존 API를 유지한다.
 * @return {Object} Dashboard 데이터
 */
function buildAnalyticsDashboard_() {
  const s = loadAnalyticsSnapshot_();
  const organization = getScopedKPI_({}, 'buildAnalyticsDashboard');
  if (!organization.ok) throw new CoreError(
    organization.error.code, organization.error.message,
    organization.error.field, organization.error.detail
  );
  return {
    kpi: organization.data,
    analytics: {
      leadTime: computeAnalyticsMetric_('leadTime', s, {}),
      cycleTime: computeAnalyticsMetric_('cycleTime', s, {}),
      workload: computeAnalyticsMetric_('workload', s, {}),
      delay: computeAnalyticsMetric_('delayRate', s, {}),
      bottleneck: computeAnalyticsMetric_('bottleneck', s, {}),
    },
    recent: {
      workflow: newestAnalytics_(s.workflow, 'TIMESTAMP', 10),
      notifications: newestAnalytics_(s.notifications, 'TIMESTAMP', 10),
      audit: newestAnalytics_(s.audit, 'TIMESTAMP', 10),
      delayedTasks: findDelayedAnalyticsTasks_(s.tasks, new Date()).slice(0, 10),
    },
  };
}

/** Analytics Cache를 새로 생성한다. @return {Object} Core API 응답 */
function refreshAnalyticsCache() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DASHBOARD);
    const C = HLAS_CONSTANTS;
    const data = buildAnalyticsDashboard_();
    clearExpiredAnalyticsCache_();
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 3600000);
    const id = 'CACHE-' + Utilities.getUuid();
    SheetRepository.insert(C.SHEETS.ANALYTICS_CACHE, {
      CACHE_ID: id,
      METRIC: 'DASHBOARD',
      VALUE: JSON.stringify(data),
      TARGET: 'ORGANIZATION',
      CREATED_AT: now,
      EXPIRES_AT: expires,
    });
    writeAnalyticsAudit_(C.AUDIT_ACTION.CACHE_CREATE, id, C.AUDIT_RESULT.SUCCESS, '');
    return { cacheId: id, expiresAt: expires, data: data };
  }, { operation: 'refreshAnalyticsCache' });
}

/** 만료된 Analytics Cache를 삭제한다. @return {Object} Core API 응답 */
function clearExpiredAnalyticsCache() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DELETE);
    return clearExpiredAnalyticsCache_();
  }, { operation: 'clearExpiredAnalyticsCache' });
}

function clearExpiredAnalyticsCache_() {
  const C = HLAS_CONSTANTS;
  const now = new Date();
  let count = 0;
  SheetRepository.findAll(C.SHEETS.ANALYTICS_CACHE).forEach(function (r) {
    const expires = parseAnalyticsDate_(r[C.FIELD.ANALYTICS.EXPIRES_AT]);
    if (expires && expires <= now) {
      SheetRepository.delete(C.SHEETS.ANALYTICS_CACHE, r[C.FIELD.ANALYTICS.CACHE_ID]);
      count += 1;
    }
  });
  if (count) writeAnalyticsAudit_(C.AUDIT_ACTION.CACHE_DELETE, '', C.AUDIT_RESULT.SUCCESS, String(count));
  return { deleted: count };
}

function newestAnalytics_(rows, field, limit) {
  return rows.slice().sort(function (a, b) {
    return new Date(b[field] || 0) - new Date(a[field] || 0);
  }).slice(0, limit);
}

function findDelayedAnalyticsTasks_(tasks, now) {
  const C = HLAS_CONSTANTS;
  return tasks.filter(function (r) {
    const due = parseAnalyticsDate_(r[C.FIELD.TASK.PLANNED_END_DATE] || r['완료예정일']);
    return due && due < now && normalizeAnalyticsStatus_(r[C.FIELD.TASK.STATUS]) !== 'COMPLETED';
  });
}

function writeAnalyticsAudit_(action, entityId, result, detail) {
  if (typeof writeAudit !== 'function') return;
  writeAudit({
    action: action, entity: HLAS_CONSTANTS.ENTITY.ANALYTICS,
    entityId: entityId || '', result: result,
    message: '', detail: detail || '',
  });
}
