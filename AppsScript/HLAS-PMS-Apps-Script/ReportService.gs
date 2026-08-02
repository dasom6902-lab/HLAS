/**
 * Analytics KPI를 기간별 JSON/CSV 보고서로 생성한다.
 */

/** @return {Object} 일간 보고서 */
function generateDailyReport() { return generateAnalyticsReport_('DAILY', 1); }
/** @return {Object} 주간 보고서 */
function generateWeeklyReport() { return generateAnalyticsReport_('WEEKLY', 7); }
/** @return {Object} 월간 보고서 */
function generateMonthlyReport() { return generateAnalyticsReport_('MONTHLY', 30); }

/**
 * Dashboard를 JSON 또는 CSV 문자열로 내보낸다.
 * @param {string|Object=} input 형식 또는 {format}
 * @return {Object} Core API 응답
 */
function exportDashboard(input) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DASHBOARD);
    const format = String(typeof input === 'string' ? input : (input && input.format) || 'JSON').toUpperCase();
    if (['JSON', 'CSV'].indexOf(format) === -1) {
      throw new CoreError('FORMAT_INVALID', '지원 형식은 JSON 또는 CSV입니다.', 'format', format);
    }
    const dashboard = buildAnalyticsDashboard_();
    const content = format === 'JSON'
      ? JSON.stringify(dashboard, null, 2)
      : dashboardToCsv_(dashboard);
    auditReport_('EXPORT_' + format, 'SUCCESS', '');
    notifyReport_('Dashboard ' + format + ' Export 완료');
    return { format: format, fileName: 'HLAS_Dashboard_' + formatDateForReport_(new Date()) + '.' + format.toLowerCase(), content: content };
  }, { operation: 'exportDashboard' });
}

function generateAnalyticsReport_(period, days) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DASHBOARD);
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const report = {
      period: period,
      startAt: start,
      endAt: end,
      dashboard: buildAnalyticsDashboard_(),
    };
    auditReport_('GENERATE_' + period, 'SUCCESS', '');
    notifyReport_(period + ' Report 생성 완료');
    return report;
  }, { operation: 'generate' + period + 'Report' });
}

function dashboardToCsv_(data) {
  const rows = [['SECTION', 'METRIC', 'VALUE']];
  const kpi = data.kpi || {};
  flattenReportObject_(kpi, '', rows);
  return rows.map(function (row) {
    return row.map(csvEscapeReport_).join(',');
  }).join('\r\n');
}

function flattenReportObject_(value, path, rows) {
  if (value === null || typeof value !== 'object' || value instanceof Date) {
    const parts = path.split('.');
    rows.push([parts.shift() || 'KPI', parts.join('.'), value instanceof Date ? value.toISOString() : value]);
    return;
  }
  Object.keys(value).forEach(function (key) {
    flattenReportObject_(value[key], path ? path + '.' + key : key, rows);
  });
}

function csvEscapeReport_(value) {
  const text = String(value === null || value === undefined ? '' : value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function formatDateForReport_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyyMMdd_HHmmss');
}

function auditReport_(message, result, detail) {
  if (typeof writeAudit !== 'function') return;
  writeAudit({
    action: HLAS_CONSTANTS.AUDIT_ACTION.REPORT,
    entity: HLAS_CONSTANTS.ENTITY.REPORT,
    entityId: '', result: result, message: message, detail: detail || '',
  });
}

function notifyReport_(title) {
  if (typeof createNotification !== 'function') return;
  createNotification({
    type: HLAS_CONSTANTS.NOTIFICATION_TYPE.SUCCESS,
    user: '',
    entity: HLAS_CONSTANTS.ENTITY.REPORT,
    entityId: '',
    title: title,
    message: '보고서가 정상적으로 생성되었습니다.',
  });
}
