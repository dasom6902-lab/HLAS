/**
 * 중요 시스템 이벤트를 07_AUDIT 시트에 기록한다.
 *
 * 감사 기록 실패가 원래 업무 처리를 중단시키지 않도록 표준 응답으로 반환한다.
 *
 * @param {Object} data 감사 이벤트
 * @return {Object} Core API 표준 응답
 */
function writeAudit(data) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    const input = data || {};
    const currentUser = getCurrentUser();
    const now = new Date();
    const record = {};

    record[C.FIELD.AUDIT.AUDIT_ID] =
      'AUDIT-' + Utilities.getUuid().toUpperCase();
    record[C.FIELD.AUDIT.TIMESTAMP] = now;
    record[C.FIELD.AUDIT.USER] =
      String(input.user || currentUser.email || 'UNKNOWN');
    record[C.FIELD.AUDIT.ROLE] =
      String(input.role || currentUser.role || '');
    record[C.FIELD.AUDIT.ACTION] =
      String(input.action || '').trim().toUpperCase();
    record[C.FIELD.AUDIT.ENTITY] =
      String(input.entity || '').trim().toUpperCase();
    record[C.FIELD.AUDIT.ENTITY_ID] =
      String(input.entityId || '').trim();
    record[C.FIELD.AUDIT.RESULT] =
      String(input.result || C.AUDIT_RESULT.SUCCESS).trim().toUpperCase();
    record[C.FIELD.AUDIT.MESSAGE] = String(input.message || '');
    record[C.FIELD.AUDIT.DETAIL] = normalizeAuditDetail_(input.detail);

    Validation.required(
      record[C.FIELD.AUDIT.ACTION],
      C.FIELD.AUDIT.ACTION
    );
    Validation.required(
      record[C.FIELD.AUDIT.RESULT],
      C.FIELD.AUDIT.RESULT
    );

    const saved = SheetRepository.insert(C.SHEETS.AUDIT, record);
    return toAuditModel_(saved);
  }, { operation: 'writeAudit' });
}

/**
 * 감사 기록을 한 번 읽은 뒤 메모리에서 검색·필터·정렬한다.
 *
 * @param {Object=} options 날짜, 사용자, Action, Entity, Result, 정렬 옵션
 * @return {Object} Core API 표준 응답
 */
function getAuditList(options) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.READ);
    const C = HLAS_CONSTANTS;
    const input = options || {};
    const dateFrom = parseAuditBoundary_(input.dateFrom, false);
    const dateTo = parseAuditBoundary_(input.dateTo, true);
    const user = String(input.user || '').trim().toLowerCase();
    const action = String(input.action || '').trim().toUpperCase();
    const entity = String(input.entity || '').trim().toUpperCase();
    const result = String(input.result || '').trim().toUpperCase();
    const sortOrder =
      String(input.sortOrder || C.SEARCH.DESC).toLowerCase() === C.SEARCH.ASC
        ? C.SEARCH.ASC
        : C.SEARCH.DESC;

    const rows = SheetRepository.findAll(C.SHEETS.AUDIT);
    const filtered = rows.filter(function (row) {
      const timestamp = new Date(row[C.FIELD.AUDIT.TIMESTAMP]);
      if (dateFrom && timestamp < dateFrom) return false;
      if (dateTo && timestamp > dateTo) return false;
      if (
        user &&
        String(row[C.FIELD.AUDIT.USER] || '').toLowerCase().indexOf(user) === -1
      ) return false;
      if (
        action &&
        String(row[C.FIELD.AUDIT.ACTION] || '').toUpperCase() !== action
      ) return false;
      if (
        entity &&
        String(row[C.FIELD.AUDIT.ENTITY] || '').toUpperCase() !== entity
      ) return false;
      if (
        result &&
        String(row[C.FIELD.AUDIT.RESULT] || '').toUpperCase() !== result
      ) return false;
      return true;
    });

    filtered.sort(function (left, right) {
      const a = new Date(left[C.FIELD.AUDIT.TIMESTAMP]).getTime() || 0;
      const b = new Date(right[C.FIELD.AUDIT.TIMESTAMP]).getTime() || 0;
      return sortOrder === C.SEARCH.ASC ? a - b : b - a;
    });
    return filtered.map(toAuditModel_);
  }, { operation: 'getAuditList' });
}

/**
 * 업무 API에서 감사 이벤트를 안전하게 남긴다.
 *
 * @param {string} action 수행 작업
 * @param {string} entity 대상 엔티티
 * @param {string} entityId 대상 ID
 * @param {string} result 처리 결과
 * @param {string=} message 메시지
 * @param {*=} detail 상세 정보
 * @return {Object} Core API 표준 응답
 */
function writeEntityAudit_(
  action, entity, entityId, result, message, detail
) {
  return writeAudit({
    action: action,
    entity: entity,
    entityId: entityId,
    result: result,
    message: message || '',
    detail: detail || '',
  });
}

function normalizeAuditDetail_(detail) {
  if (detail === null || typeof detail === 'undefined') return '';
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch (error) {
    return String(detail);
  }
}

function parseAuditBoundary_(value, endOfDay) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError('유효한 날짜가 아닙니다.', 'date');
  }
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

function toAuditModel_(record) {
  const C = HLAS_CONSTANTS;
  const timestamp = record[C.FIELD.AUDIT.TIMESTAMP];
  return {
    auditId: String(record[C.FIELD.AUDIT.AUDIT_ID] || ''),
    timestamp: timestamp instanceof Date
      ? Utilities.formatDate(
          timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'
        )
      : String(timestamp || ''),
    user: String(record[C.FIELD.AUDIT.USER] || ''),
    role: String(record[C.FIELD.AUDIT.ROLE] || ''),
    action: String(record[C.FIELD.AUDIT.ACTION] || ''),
    entity: String(record[C.FIELD.AUDIT.ENTITY] || ''),
    entityId: String(record[C.FIELD.AUDIT.ENTITY_ID] || ''),
    result: String(record[C.FIELD.AUDIT.RESULT] || ''),
    message: String(record[C.FIELD.AUDIT.MESSAGE] || ''),
    detail: String(record[C.FIELD.AUDIT.DETAIL] || ''),
  };
}
