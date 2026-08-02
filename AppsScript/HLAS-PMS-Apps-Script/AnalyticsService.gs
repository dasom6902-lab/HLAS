/**
 * HLAS 운영 데이터의 분석 지표를 계산한다.
 * 모든 공개 함수는 Core API 표준 응답을 반환한다.
 */

/** @param {Object=} options 분석 조건 @return {Object} 평균 Lead Time(시간) */
function calculateLeadTime(options) {
  return analyticsMetric_('leadTime', options);
}

/** @param {Object=} options 분석 조건 @return {Object} 평균 Cycle Time(시간) */
function calculateCycleTime(options) {
  return analyticsMetric_('cycleTime', options);
}

/** @param {Object=} options 분석 조건 @return {Object} 완료 처리량 */
function calculateThroughput(options) {
  return analyticsMetric_('throughput', options);
}

/** @param {Object=} options 분석 조건 @return {Object} 담당자별 작업량 */
function calculateWorkload(options) {
  return analyticsMetric_('workload', options);
}

/** @param {Object=} options 분석 조건 @return {Object} 완료율 */
function calculateCompletionRate(options) {
  return analyticsMetric_('completionRate', options);
}

/** @param {Object=} options 분석 조건 @return {Object} 지연율 */
function calculateDelayRate(options) {
  return analyticsMetric_('delayRate', options);
}

/** @param {Object=} options 분석 조건 @return {Object} 승인율 */
function calculateApprovalRate(options) {
  return analyticsMetric_('approvalRate', options);
}

/** @param {Object=} options 분석 조건 @return {Object} 병목 상태 */
function calculateBottleneck(options) {
  return analyticsMetric_('bottleneck', options);
}

function analyticsMetric_(metric, options) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DASHBOARD);
    const snapshot = loadAnalyticsSnapshot_();
    return computeAnalyticsMetric_(metric, snapshot, options || {});
  }, { operation: metric });
}

function loadAnalyticsSnapshot_() {
  const C = HLAS_CONSTANTS;
  return {
    projects: SheetRepository.findAll(C.SHEETS.PROJECT),
    features: SheetRepository.findAll(C.SHEETS.FEATURE),
    functions: SheetRepository.findAll(C.SHEETS.FUNCTION),
    tasks: SheetRepository.findAll(C.SHEETS.TASK),
    workflow: SheetRepository.findAll(C.SHEETS.WORKFLOW_HISTORY),
    audit: SheetRepository.findAll(C.SHEETS.AUDIT),
    notifications: SheetRepository.findAll(C.SHEETS.NOTIFICATION),
  };
}

function computeAnalyticsMetric_(metric, s, options) {
  const C = HLAS_CONSTANTS;
  const now = options.now ? new Date(options.now) : new Date();
  const tasks = filterAnalyticsTasks_(s.tasks, options);
  const completed = tasks.filter(function (r) {
    return normalizeAnalyticsStatus_(r[C.FIELD.TASK.STATUS]) === 'COMPLETED';
  });
  if (metric === 'completionRate') {
    return { value: safePercent_(completed.length, tasks.length), completed: completed.length, total: tasks.length };
  }
  if (metric === 'delayRate') {
    const delayed = tasks.filter(function (r) {
      const due = parseAnalyticsDate_(r[C.FIELD.TASK.PLANNED_END_DATE] || r['완료예정일']);
      return due && due < now && normalizeAnalyticsStatus_(r[C.FIELD.TASK.STATUS]) !== 'COMPLETED';
    });
    return { value: safePercent_(delayed.length, tasks.length), delayed: delayed.length, total: tasks.length };
  }
  if (metric === 'workload') {
    const owners = {};
    tasks.filter(function (r) {
      return normalizeAnalyticsStatus_(r[C.FIELD.TASK.STATUS]) !== 'COMPLETED';
    }).forEach(function (r) {
      const owner = String(r[C.FIELD.TASK.OWNER] || r['담당자'] || '미지정');
      owners[owner] = (owners[owner] || 0) + 1;
    });
    return Object.keys(owners).map(function (owner) {
      return { owner: owner, count: owners[owner] };
    }).sort(function (a, b) { return b.count - a.count; });
  }
  if (metric === 'approvalRate') {
    const approved = s.workflow.filter(function (r) { return String(r.TO_STATUS) === 'APPROVED'; }).length;
    const rejected = s.workflow.filter(function (r) { return String(r.TO_STATUS) === 'REJECTED'; }).length;
    return { value: safePercent_(approved, approved + rejected), approved: approved, rejected: rejected };
  }
  if (metric === 'throughput') return { value: completed.length, unit: 'tasks' };
  if (metric === 'leadTime' || metric === 'cycleTime') {
    const startStatuses = metric === 'leadTime' ? ['DRAFT', 'READY'] : ['IN_PROGRESS'];
    const values = calculateWorkflowDurations_(s.workflow, startStatuses, 'COMPLETED');
    return { value: averageAnalytics_(values), unit: 'hours', sampleCount: values.length };
  }
  if (metric === 'bottleneck') {
    const counts = {};
    tasks.forEach(function (r) {
      const status = normalizeAnalyticsStatus_(r[C.FIELD.TASK.STATUS]) || 'UNKNOWN';
      if (status !== 'COMPLETED') counts[status] = (counts[status] || 0) + 1;
    });
    const list = Object.keys(counts).map(function (status) {
      return { status: status, count: counts[status] };
    }).sort(function (a, b) { return b.count - a.count; });
    return { status: list.length ? list[0].status : '', count: list.length ? list[0].count : 0, breakdown: list };
  }
  throw new CoreError('ANALYTICS_METRIC_INVALID', '지원하지 않는 분석 지표입니다.', 'metric', metric);
}

function filterAnalyticsTasks_(tasks, options) {
  if (!options.projectId && !options.userId) return tasks.slice();
  const projectId = String(options.projectId || '');
  const userId = String(options.userId || '').toLowerCase();
  return tasks.filter(function (r) {
    const projectMatch = !projectId || String(r.PROJECT_ID || '') === projectId;
    const owner = String(r['담당자'] || r.OWNER || '').toLowerCase();
    return projectMatch && (!userId || owner === userId);
  });
}

function calculateWorkflowDurations_(rows, startStatuses, endStatus) {
  const grouped = {};
  rows.forEach(function (r) {
    const key = String(r.ENTITY || '') + ':' + String(r.ENTITY_ID || '');
    (grouped[key] = grouped[key] || []).push(r);
  });
  const result = [];
  Object.keys(grouped).forEach(function (key) {
    const events = grouped[key].sort(function (a, b) {
      return new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP);
    });
    const start = events.find(function (e) { return startStatuses.indexOf(String(e.FROM_STATUS)) !== -1; });
    const end = events.slice().reverse().find(function (e) { return String(e.TO_STATUS) === endStatus; });
    if (start && end) {
      const hours = (new Date(end.TIMESTAMP) - new Date(start.TIMESTAMP)) / 3600000;
      if (isFinite(hours) && hours >= 0) result.push(hours);
    }
  });
  return result;
}

function normalizeAnalyticsStatus_(value) {
  const v = String(value || '').trim().toUpperCase();
  if (v === '완료') return 'COMPLETED';
  if (v === '진행중') return 'IN_PROGRESS';
  if (v === '보류') return 'ON_HOLD';
  return v;
}

function parseAnalyticsDate_(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function safePercent_(part, total) {
  return total ? Math.round(part * 10000 / total) / 100 : 0;
}

function averageAnalytics_(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce(function (a, b) { return a + b; }, 0) * 100 / values.length) / 100;
}
