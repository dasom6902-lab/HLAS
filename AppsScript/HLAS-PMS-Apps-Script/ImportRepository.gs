/**
 * @fileoverview Framework Import 저장·미리보기·Rollback Repository.
 */

const ImportRepository = Object.freeze({
  /**
   * Import 신규/수정/오류 건수를 계산한다.
   *
   * @param {string} entity Entity
   * @param {Array<Object>} records 표준 레코드
   * @return {Object} Preview 결과
   */
  preview: function (entity, records) {
    const config = getFrameworkImportConfig_(entity);
    const validation = ImportValidator.validateRecords(records, config);
    const existing = buildImportExistingMap_(config);
    let created = 0;
    let updated = 0;
    records.forEach(function (record) {
      const id = DataTypeManager.normalizeField(
        config.idField,
        record[config.idField]
      );
      if (existing[id]) updated += 1;
      else created += 1;
    });
    return {
      entity: entity,
      status: HLAS_CONSTANTS.IMPORT_STATUS.PREVIEW,
      created: created,
      updated: updated,
      errors: validation.errors,
      valid: validation.valid,
    };
  },

  /**
   * Import를 실행하고 Rollback용 Snapshot을 저장한다.
   *
   * @param {string} entity Entity
   * @param {Array<Object>} records 표준 레코드
   * @param {string=} user 작업자
   * @return {Object} 실행 결과
   */
  execute: function (entity, records, user) {
    const config = getFrameworkImportConfig_(entity);
    const validation = ImportValidator.validateRecords(records, config);
    if (!validation.valid) {
      throw new ValidationError(
        'Import Validation 오류가 있습니다.',
        'records',
        validation.errors,
        'IMPORT_VALIDATION_FAILED'
      );
    }
    const token = 'IMPORT-' + Utilities.getUuid();
    const before = SheetRepository.findAll(config.sheetName);
    CacheManager.put(
      'ROLLBACK:' + token,
      { sheetName: config.sheetName, records: before },
      PMS_CONFIG.IMPORT.ROLLBACK_TTL_SECONDS
    );
    const existing = buildImportExistingMap_(config);
    let created = 0;
    let updated = 0;
    records.forEach(function (source) {
      const record = AuditManager.initializeAudit(
        DataTypeManager.normalizeRecord(source),
        user
      );
      const id = record[config.idField];
      if (existing[id]) {
        SheetRepository.update(
          config.sheetName,
          id,
          AuditManager.updateAudit(record, user)
        );
        updated += 1;
      } else {
        SheetRepository.insert(config.sheetName, record);
        created += 1;
      }
    });
    return {
      entity: entity,
      status: HLAS_CONSTANTS.IMPORT_STATUS.EXECUTED,
      created: created,
      updated: updated,
      rollbackToken: token,
    };
  },

  /**
   * Import 실행 전 Snapshot으로 복원한다.
   *
   * @param {string} rollbackToken Rollback Token
   * @return {Object} 복원 결과
   */
  rollback: function (rollbackToken) {
    const snapshot = CacheManager.get('ROLLBACK:' + rollbackToken);
    if (!snapshot) {
      throw new NotFoundError(
        'Rollback Snapshot을 찾을 수 없습니다.',
        'rollbackToken',
        { rollbackToken: rollbackToken },
        'IMPORT_ROLLBACK_NOT_FOUND'
      );
    }
    const count = SheetRepository.replaceAll(
      snapshot.sheetName,
      snapshot.records
    );
    CacheManager.clearCache('ROLLBACK:' + rollbackToken);
    return {
      status: HLAS_CONSTANTS.IMPORT_STATUS.ROLLED_BACK,
      restored: count,
    };
  },
});

function getFrameworkImportConfig_(entity) {
  const configs = {
    PRODUCER: {
      sheetName: PMS_CONFIG.PRODUCER_TABLES.MASTER,
      idField: 'ProducerID',
      required: ['ProducerID', 'ProducerName'],
    },
    PRODUCT: {
      sheetName: '26_PRODUCT_IMPORT_STAGING',
      idField: 'ProductID',
      required: ['ProductID', 'ProductName'],
    },
    RECEIVING: {
      sheetName: PMS_CONFIG.RECEIVING_TABLES.MASTER,
      idField: 'ReceivingID',
      required: ['ReceivingID', 'ReceivingDate', 'ProducerID', 'ProductID'],
    },
    AGREEMENT: {
      sheetName: '27_AGREEMENT_MASTER',
      idField: 'AgreementID',
      required: ['AgreementID', 'ProducerID', 'ProductID'],
    },
    PLANNING: {
      sheetName: PMS_CONFIG.PLANNING_TABLES.ANNUAL_TARGET,
      idField: 'TARGET_ID',
      required: ['TARGET_ID', 'YEAR', 'CATEGORY', 'TARGET_AMOUNT'],
    },
  };
  const config = configs[entity];
  if (!config) {
    throw new ValidationError(
      '지원하지 않는 Import Entity입니다.',
      'entity',
      { entity: entity },
      'IMPORT_ENTITY_UNSUPPORTED'
    );
  }
  return config;
}

function buildImportExistingMap_(config) {
  const map = {};
  SheetRepository.findAll(config.sheetName).forEach(function (record) {
    const key = DataTypeManager.normalizeField(
      config.idField,
      record[config.idField]
    );
    if (key) map[key] = record;
  });
  return map;
}
