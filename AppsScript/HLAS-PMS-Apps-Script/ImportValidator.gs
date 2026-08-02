/**
 * @fileoverview Framework Import Validation.
 */

const ImportValidator = Object.freeze({
  /**
   * 지원 Entity와 행 수를 검증한다.
   *
   * @param {string} entity Entity
   * @param {Array<Object>} records Import 레코드
   * @return {boolean} 검증 성공
   */
  validateRequest: function (entity, records) {
    Validation.validStatus(
      entity,
      PMS_CONFIG.IMPORT.SUPPORTED_ENTITIES,
      'entity'
    );
    if (!Array.isArray(records)) {
      throw new ValidationError(
        'records 배열이 필요합니다.',
        'records',
        null,
        'IMPORT_RECORDS_REQUIRED'
      );
    }
    if (records.length > PMS_CONFIG.IMPORT.MAX_ROWS) {
      throw new ValidationError(
        '한 번에 Import할 수 있는 행 수를 초과했습니다.',
        'records',
        { count: records.length },
        'IMPORT_MAX_ROWS_EXCEEDED'
      );
    }
    return true;
  },

  /**
   * 필수값과 Import 내부 중복 Key를 검사한다.
   *
   * @param {Array<Object>} records 레코드
   * @param {Object} config Entity 설정
   * @return {{valid:boolean,errors:Array<Object>}} 검증 결과
   */
  validateRecords: function (records, config) {
    const errors = [];
    const seen = {};
    (records || []).forEach(function (record, index) {
      try {
        config.required.forEach(function (field) {
          Validation.required(record[field], field);
        });
        const key = DataTypeManager.normalizeField(
          config.idField,
          record[config.idField]
        );
        if (seen[key]) {
          throw new DuplicateError(
            'Import 데이터에 중복 Key가 있습니다.',
            config.idField,
            { key: key },
            'IMPORT_DUPLICATE_KEY'
          );
        }
        seen[key] = true;
      } catch (error) {
        errors.push({
          row: index + 1,
          code: error.code || 'IMPORT_VALIDATION_ERROR',
          message: error.message,
        });
      }
    });
    return { valid: errors.length === 0, errors: errors };
  },
});
