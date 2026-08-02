/**
 * @fileoverview TASK-0027 Migration 업무 흐름 Service.
 */
const MigrationService = Object.freeze({
  /**
   * Source Mapping·Validation·중복 검사를 수행한다.
   *
   * @param {Object} request Migration 요청
   * @return {Object} Preview 결과
   */
  preview: function (request) {
    MigrationValidator.validateRequest(request);
    const records = MigrationMapper.map(request);
    const sourceProfile = request.sourceProfile
      ? MigrationProfile.getSource(request.sourceProfile)
      : null;
    const classification = sourceProfile
      ? MigrationDuplicateService.classify(
          records,
          SheetRepository.findAll(PMS_CONFIG.RECEIVING_TABLES.MASTER)
        )
      : {
          operatingRows: 0,
          supplementRows: records.length,
          duplicateRows: 0,
          finalImportRows: records.length,
          skippedRows: 0,
          finalRecords: records,
        };
    const validation = MigrationValidator.validate(
      request,
      classification.finalRecords
    );
    const preview = MigrationRepository.preview(
      request.entity,
      classification.finalRecords
    );
    return {
      status: HLAS_CONSTANTS.MIGRATION_STATUS.PREVIEW,
      entity: String(request.entity).toUpperCase(),
      totalRows: records.length,
      newRows: preview.created,
      updateRows: preview.updated,
      failedRows: validation.errors.length,
      skippedRows: classification.skippedRows,
      operatingRows: classification.operatingRows,
      supplementRows: classification.supplementRows,
      duplicateRows: classification.duplicateRows,
      finalImportRows: classification.finalImportRows,
      supplementSource: sourceProfile ? sourceProfile.name : '',
      valid: validation.valid && preview.valid,
      errors: validation.errors.concat(preview.errors || []),
      records: classification.finalRecords,
      batchCount: Math.ceil(
        classification.finalRecords.length / PMS_CONFIG.MIGRATION.BATCH_SIZE
      ),
    };
  },

  /**
   * Migration Validation 결과를 반환한다.
   *
   * @param {Object} request Migration 요청
   * @return {Object} 검증 결과
   */
  validate: function (request) {
    const preview = this.preview(request);
    return {
      status: preview.valid
        ? HLAS_CONSTANTS.MIGRATION_STATUS.VALIDATED
        : HLAS_CONSTANTS.MIGRATION_STATUS.FAILED,
      entity: preview.entity,
      valid: preview.valid,
      totalRows: preview.totalRows,
      errors: preview.errors,
    };
  },

  /**
   * Preview와 Validation을 통과한 Migration을 실행한다.
   *
   * @param {Object} request Migration 요청
   * @return {Object} 실행 결과
   */
  execute: function (request) {
    const preview = this.preview(request);
    if (!preview.valid) {
      throw new ValidationError(
        'Migration Validation 오류를 해결해야 합니다.',
        'records',
        preview.errors,
        'MIGRATION_VALIDATION_FAILED'
      );
    }
    const f = HLAS_CONSTANTS.MIGRATION_FIELD;
    const migrationId = createMigrationId_();
    const startedAt = new Date();
    const user = resolveMigrationUser_(request.executedBy);
    MigrationLog.create(buildMigrationLogRecord_(
      migrationId,
      preview,
      request,
      startedAt,
      user
    ));
    try {
      const result = MigrationRepository.execute(
        preview.entity,
        preview.records,
        user
      );
      if (preview.supplementSource && result.updated > 0) {
        MigrationRepository.rollback(result.rollbackToken);
        throw new ValidationError(
          '보완 Source는 기존 운영 데이터를 수정할 수 없습니다.',
          'sourceProfile',
          { updated: result.updated },
          'MIGRATION_SUPPLEMENT_OVERWRITE_BLOCKED'
        );
      }
      const endedAt = new Date();
      const changes = {};
      changes[f.END_TIME] = endedAt;
      changes[f.DURATION] = endedAt.getTime() - startedAt.getTime();
      changes[f.SUCCESS_ROWS] = result.created + result.updated;
      changes[f.FAILED_ROWS] = 0;
      changes[f.SKIPPED_ROWS] = preview.skippedRows;
      changes[f.SUPPLEMENT_SOURCE] = preview.supplementSource;
      changes[f.APPLIED_ROWS] = result.created;
      changes[f.DUPLICATE_ROWS] = preview.duplicateRows;
      changes[f.ROLLBACK_AVAILABLE] = true;
      MigrationLog.update(migrationId, changes);
      CacheManager.put(
        PMS_CONFIG.MIGRATION.CACHE_PREFIX + migrationId + ':ROLLBACK',
        { rollbackToken: result.rollbackToken },
        PMS_CONFIG.MIGRATION.ROLLBACK_TTL_SECONDS
      );
      writeMigrationAudit_(
        migrationId,
        HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
        'Migration 실행 완료'
      );
      return {
        migrationId: migrationId,
        entity: preview.entity,
        status: HLAS_CONSTANTS.MIGRATION_STATUS.EXECUTED,
        totalRows: preview.totalRows,
        successRows: result.created + result.updated,
        failedRows: 0,
        skippedRows: preview.skippedRows,
        created: result.created,
        updated: result.updated,
        batchCount: preview.batchCount,
        rollbackAvailable: true,
      };
    } catch (error) {
      const failedAt = new Date();
      const failure = {};
      failure[f.END_TIME] = failedAt;
      failure[f.DURATION] = failedAt.getTime() - startedAt.getTime();
      failure[f.SUCCESS_ROWS] = 0;
      failure[f.FAILED_ROWS] = preview.totalRows;
      failure[f.ROLLBACK_AVAILABLE] = false;
      MigrationLog.update(migrationId, failure);
      writeMigrationAudit_(
        migrationId,
        HLAS_CONSTANTS.AUDIT_RESULT.FAIL,
        error.message
      );
      throw error;
    }
  },

  /**
   * Migration 실행 전 상태로 복원한다.
   *
   * @param {string} migrationId Migration ID
   * @return {Object} Rollback 결과
   */
  rollback: function (migrationId) {
    Validation.required(migrationId, 'migrationId');
    const cacheKey =
      PMS_CONFIG.MIGRATION.CACHE_PREFIX + migrationId + ':ROLLBACK';
    const context = CacheManager.get(cacheKey);
    if (!context || !context.rollbackToken) {
      throw new NotFoundError(
        'Migration Rollback 정보를 찾을 수 없습니다.',
        'migrationId',
        { migrationId: migrationId },
        'MIGRATION_ROLLBACK_NOT_FOUND'
      );
    }
    const result = MigrationRepository.rollback(context.rollbackToken);
    const changes = {};
    changes[HLAS_CONSTANTS.MIGRATION_FIELD.ROLLBACK_AVAILABLE] = false;
    MigrationLog.update(migrationId, changes);
    CacheManager.clearCache(cacheKey);
    writeMigrationAudit_(
      migrationId,
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'Migration Rollback 완료'
    );
    return {
      migrationId: migrationId,
      status: HLAS_CONSTANTS.MIGRATION_STATUS.ROLLED_BACK,
      restored: result.restored,
      rollbackAvailable: false,
    };
  },
});

function createMigrationId_() {
  return 'MIG-' + Utilities.getUuid();
}

function resolveMigrationUser_(user) {
  if (user) return String(user);
  try {
    const current = getCurrentUser();
    return String(current.email || PMS_CONFIG.AUDIT.DEFAULT_USER);
  } catch (error) {
    return PMS_CONFIG.AUDIT.DEFAULT_USER;
  }
}

function buildMigrationLogRecord_(id, preview, request, startedAt, user) {
  const f = HLAS_CONSTANTS.MIGRATION_FIELD;
  const record = {};
  record[f.MIGRATION_ID] = id;
  record[f.ENTITY] = preview.entity;
  record[f.SOURCE_FILE] = String((request || {}).sourceFile || '');
  record[f.START_TIME] = startedAt;
  record[f.END_TIME] = '';
  record[f.DURATION] = 0;
  record[f.TOTAL_ROWS] = preview.totalRows;
  record[f.SUCCESS_ROWS] = 0;
  record[f.FAILED_ROWS] = 0;
  record[f.SKIPPED_ROWS] = preview.skippedRows;
  record[f.ROLLBACK_AVAILABLE] = false;
  record[f.EXECUTED_BY] = user;
  record[f.SUPPLEMENT_SOURCE] = preview.supplementSource || '';
  record[f.APPLIED_ROWS] = 0;
  record[f.DUPLICATE_ROWS] = preview.duplicateRows || 0;
  return record;
}

function writeMigrationAudit_(migrationId, result, message) {
  if (typeof writeAudit !== 'function') return;
  writeAudit({
    action: HLAS_CONSTANTS.AUDIT_ACTION.MIGRATION,
    entity: HLAS_CONSTANTS.MIGRATION_OPERATION.AUDIT_ENTITY,
    entityId: migrationId,
    result: result,
    message: message || '',
    detail: '',
  });
}
