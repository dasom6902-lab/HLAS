/**
 * @fileoverview TASK-0027 Import Framework 기반 Migration Repository.
 */
const MigrationRepository = Object.freeze({
  /**
   * Migration Preview를 계산한다.
   *
   * @param {string} entity Migration Entity
   * @param {Array<Object>} records 표준 레코드
   * @return {Object} Preview 결과
   */
  preview: function (entity, records) {
    return ImportRepository.preview(
      String(entity || '').toUpperCase(),
      records || []
    );
  },

  /**
   * 검증된 레코드를 Import Framework로 실행한다.
   *
   * @param {string} entity Migration Entity
   * @param {Array<Object>} records 표준 레코드
   * @param {string=} user 실행 사용자
   * @return {Object} 실행 결과
   */
  execute: function (entity, records, user) {
    const type = String(entity || '').toUpperCase();
    const input = records || [];
    const config = getFrameworkImportConfig_(type);
    const validation = ImportValidator.validateRecords(input, config);
    if (!validation.valid) {
      throw new ValidationError(
        'Migration Validation 오류가 있습니다.',
        'records',
        validation.errors,
        'MIGRATION_VALIDATION_FAILED'
      );
    }
    const token = 'MIGRATION-' + Utilities.getUuid();
    const cacheKey =
      PMS_CONFIG.MIGRATION.CACHE_PREFIX + 'ROLLBACK:' + token;
    const before = SheetRepository.findAll(config.sheetName);
    const snapshot = {};
    before.forEach(function (record, index) {
      snapshot[String(index)] = record;
    });
    CacheManager.putLarge(
      cacheKey,
      snapshot,
      PMS_CONFIG.MIGRATION.ROLLBACK_TTL_SECONDS
    );
    CacheManager.put(
      cacheKey + ':CONTEXT',
      { sheetName: config.sheetName, rowCount: before.length },
      PMS_CONFIG.MIGRATION.ROLLBACK_TTL_SECONDS
    );
    const existing = {};
    before.forEach(function (record) {
      const key = DataTypeManager.normalizeField(
        config.idField,
        record[config.idField]
      );
      if (key) existing[key] = true;
    });
    let created = 0;
    let updated = 0;
    try {
      for (
        let offset = 0;
        offset < input.length;
        offset += PMS_CONFIG.MIGRATION.BATCH_SIZE
      ) {
        input.slice(
          offset,
          offset + PMS_CONFIG.MIGRATION.BATCH_SIZE
        ).forEach(function (source) {
          const normalized = DataTypeManager.normalizeRecord(source);
          const id = DataTypeManager.normalizeField(
            config.idField,
            normalized[config.idField]
          );
          normalized[config.idField] = id;
          if (existing[id]) {
            SheetRepository.update(
              config.sheetName,
              id,
              AuditManager.updateAudit(normalized, user)
            );
            updated += 1;
          } else {
            SheetRepository.insert(
              config.sheetName,
              AuditManager.initializeAudit(normalized, user)
            );
            existing[id] = true;
            created += 1;
          }
        });
      }
    } catch (error) {
      restoreMigrationSnapshot_(cacheKey);
      throw error;
    }
    return {
      entity: type,
      status: HLAS_CONSTANTS.IMPORT_STATUS.EXECUTED,
      created: created,
      updated: updated,
      rollbackToken: token,
    };
  },

  /**
   * Import Framework Snapshot으로 Rollback한다.
   *
   * @param {string} rollbackToken Rollback Token
   * @return {Object} Rollback 결과
   */
  rollback: function (rollbackToken) {
    Validation.required(rollbackToken, 'rollbackToken');
    const cacheKey =
      PMS_CONFIG.MIGRATION.CACHE_PREFIX + 'ROLLBACK:' + rollbackToken;
    return restoreMigrationSnapshot_(cacheKey);
  },
});

function restoreMigrationSnapshot_(cacheKey) {
  const context = CacheManager.get(cacheKey + ':CONTEXT');
  const snapshot = CacheManager.getLarge(cacheKey);
  if (!context || !snapshot) {
    throw new NotFoundError(
      'Migration Rollback Snapshot을 찾을 수 없습니다.',
      'rollbackToken',
      null,
      'MIGRATION_ROLLBACK_NOT_FOUND'
    );
  }
  const records = Object.keys(snapshot)
    .sort(function (left, right) {
      return Number(left) - Number(right);
    })
    .map(function (key) {
      return snapshot[key];
    });
  const restored = SheetRepository.replaceAll(context.sheetName, records);
  CacheManager.clearLarge(cacheKey);
  CacheManager.clearCache(cacheKey + ':CONTEXT');
  return {
    status: HLAS_CONSTANTS.IMPORT_STATUS.ROLLED_BACK,
    restored: restored,
  };
}
