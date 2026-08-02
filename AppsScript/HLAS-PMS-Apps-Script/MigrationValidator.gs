/**
 * @fileoverview TASK-0027 Migration 요청과 레코드 검증.
 */
const MigrationValidator = Object.freeze({
  /**
   * Migration 요청의 기본 구조를 검증한다.
   *
   * @param {Object} request Migration 요청
   * @return {boolean} 검증 성공
   */
  validateRequest: function (request) {
    const input = request || {};
    Validation.required(input.entity, 'entity');
    Validation.validStatus(
      String(input.entity).toUpperCase(),
      PMS_CONFIG.MIGRATION.SUPPORTED_ENTITIES,
      'entity'
    );
    Validation.required(input.source, 'source');
    if (input.sourceProfile) {
      const sourceProfile = MigrationProfile.getSource(input.sourceProfile);
      if (String(input.entity).toUpperCase() !== sourceProfile.entity) {
        throw new ValidationError(
          'Migration Source와 Entity가 일치하지 않습니다.',
          'entity',
          { source: sourceProfile.name, entity: input.entity },
          'MIGRATION_SOURCE_ENTITY_MISMATCH'
        );
      }
      Validation.required(input.sourceFile, 'sourceFile');
      Validation.validStatus(
        String((input.source || {}).format || '').toUpperCase(),
        sourceProfile.sourceType ===
          HLAS_CONSTANTS.MIGRATION_SOURCE_TYPE.EXCEL
          ? [
              HLAS_CONSTANTS.MIGRATION_SOURCE_TYPE.EXCEL,
              'XLSX',
            ]
          : [sourceProfile.sourceType],
        'source.format'
      );
    }
    return true;
  },

  /**
   * 필수값과 Source 내부 중복 Key를 검증한다.
   *
   * @param {string} entity Migration Entity
   * @param {Array<Object>} records 표준 레코드
   * @return {{valid:boolean,errors:Array<Object>}} 검증 결과
   */
  validateRecords: function (entity, records) {
    const profile = MigrationProfile.get(entity);
    if (!Array.isArray(records)) {
      throw new ValidationError(
        'records 배열이 필요합니다.',
        'records',
        null,
        'MIGRATION_RECORDS_REQUIRED'
      );
    }
    if (records.length > PMS_CONFIG.MIGRATION.MAX_ROWS) {
      throw new ValidationError(
        'Migration 최대 행 수를 초과했습니다.',
        'records',
        { count: records.length },
        'MIGRATION_MAX_ROWS_EXCEEDED'
      );
    }
    return ImportValidator.validateRecords(records, profile);
  },

  /**
   * Migration 전체 검증을 수행한다.
   *
   * @param {Object} request Migration 요청
   * @param {Array<Object>} records 표준 레코드
   * @return {{valid:boolean,errors:Array<Object>}} 검증 결과
   */
  validate: function (request, records) {
    this.validateRequest(request);
    return this.validateRecords(request.entity, records);
  },
});
