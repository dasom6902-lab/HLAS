/**
 * @fileoverview TASK-0025A Import Framework 공개 API.
 *
 * 기존 previewImport/validateImport/executeImport API는 그대로 유지한다.
 */

/**
 * Source 파싱·매핑 후 Import Preview를 반환한다.
 *
 * @param {Object} request entity, source, columnMapping, dataTypes
 * @return {Object} CommonAPI 표준 응답
 */
function previewFrameworkImport(request) {
  return CommonAPI.execute(function () {
    const context = buildFrameworkImportRequest_(request);
    return ImportRepository.preview(context.entity, context.records);
  }, { operation: 'previewFrameworkImport' });
}

/**
 * Source 파싱·매핑 후 Import를 실행한다.
 *
 * @param {Object} request Import 요청
 * @return {Object} CommonAPI 표준 응답
 */
function executeFrameworkImport(request) {
  return CommonAPI.execute(function () {
    const context = buildFrameworkImportRequest_(request);
    const preview = ImportRepository.preview(
      context.entity,
      context.records
    );
    if (!preview.valid) {
      throw new ValidationError(
        'Import Preview 오류를 해결해야 합니다.',
        'records',
        preview.errors,
        'IMPORT_PREVIEW_FAILED'
      );
    }
    return ImportRepository.execute(
      context.entity,
      context.records,
      (request || {}).user
    );
  }, { operation: 'executeFrameworkImport' });
}

/**
 * Framework Import를 Rollback한다.
 *
 * @param {string} rollbackToken Rollback Token
 * @return {Object} CommonAPI 표준 응답
 */
function rollbackFrameworkImport(rollbackToken) {
  return CommonAPI.execute(function () {
    return ImportRepository.rollback(rollbackToken);
  }, { operation: 'rollbackFrameworkImport' });
}

function buildFrameworkImportRequest_(request) {
  const input = request || {};
  const entity = String(input.entity || '').trim().toUpperCase();
  const sourceRecords = ImportMapper.parse(input.source || {});
  const records = ImportMapper.map(
    sourceRecords,
    input.columnMapping || {},
    input.dataTypes || {}
  );
  ImportValidator.validateRequest(entity, records);
  return { entity: entity, records: records };
}
