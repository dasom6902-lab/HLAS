/**
 * 단일 Entity를 CSV 또는 JSON으로 내보낸다.
 *
 * @param {string|Object} entity Entity 문자열 또는 {entity, format}
 * @return {Object} Core API 표준 응답
 */
function exportEntity(entity) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.EXPORT, '');
    const input = typeof entity === 'object' ? entity : { entity: entity };
    const entityName = String(input.entity || '').trim().toUpperCase();
    const format = String(input.format || 'JSON').trim().toUpperCase();
    const config = getDataEntityConfig_(entityName);
    const rows = SheetRepository.findAll(config.sheetName);
    const payload = buildExportPayload_(rows, format);
    const fileName = 'HLAS_' + entityName + '_' + exportTimestamp_() + '.' + format.toLowerCase();
    writeImportExportAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.EXPORT,
      entityName,
      'SUCCESS',
      'Export 완료',
      { format: format, count: rows.length, fileName: fileName }
    );
    notifyDataOperation_('Export 완료', fileName);
    return {
      entity: entityName,
      format: format,
      count: rows.length,
      fileName: fileName,
      mimeType: format === 'CSV' ? 'text/csv' : 'application/json',
      content: payload,
    };
  }, { operation: 'exportEntity' });
}

/**
 * 주요 업무 Entity 전체를 JSON으로 내보낸다.
 *
 * @return {Object} Core API 표준 응답
 */
function exportAll() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.EXPORT, '');
    const C = HLAS_CONSTANTS;
    const entities = [
      C.ENTITY.PROJECT, C.ENTITY.EPIC, C.ENTITY.FEATURE,
      C.ENTITY.FUNCTION, C.ENTITY.TASK,
    ];
    const data = {};
    entities.forEach(function (entity) {
      const config = getDataEntityConfig_(entity);
      data[entity] = SheetRepository.findAll(config.sheetName);
    });
    const fileName = 'HLAS_ALL_' + exportTimestamp_() + '.json';
    writeImportExportAudit_(C.AUDIT_ACTION.EXPORT, 'ALL', 'SUCCESS', '전체 Export 완료', { fileName: fileName });
    notifyDataOperation_('Export 완료', fileName);
    return {
      entity: 'ALL',
      format: 'JSON',
      fileName: fileName,
      mimeType: 'application/json',
      content: JSON.stringify(data, null, 2),
    };
  }, { operation: 'exportAll' });
}

function buildExportPayload_(rows, format) {
  if (format === 'JSON') return JSON.stringify(rows, null, 2);
  if (format !== 'CSV') {
    throw new ValidationError('지원 형식은 CSV 또는 JSON입니다.', 'format');
  }
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsvValue_).join(',')];
  rows.forEach(function (row) {
    lines.push(headers.map(function (header) {
      return escapeCsvValue_(row[header]);
    }).join(','));
  });
  return '\uFEFF' + lines.join('\r\n');
}

function escapeCsvValue_(value) {
  const text = value instanceof Date ? value.toISOString() : String(value === null || value === undefined ? '' : value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function exportTimestamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
}
