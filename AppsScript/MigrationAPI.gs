/**
 * @fileoverview TASK-0027 Migration 공개 API.
 */

/**
 * Migration Preview를 반환한다.
 *
 * @param {Object} request Migration 요청
 * @return {Object} CommonAPI 응답
 */
function previewMigration(request) {
  return CommonAPI.execute(function () {
    return MigrationService.preview(request);
  }, { operation: HLAS_CONSTANTS.MIGRATION_OPERATION.PREVIEW });
}

/**
 * Migration Validation 결과를 반환한다.
 *
 * @param {Object} request Migration 요청
 * @return {Object} CommonAPI 응답
 */
function validateMigration(request) {
  return CommonAPI.execute(function () {
    return MigrationService.validate(request);
  }, { operation: HLAS_CONSTANTS.MIGRATION_OPERATION.VALIDATE });
}

/**
 * Migration을 실행한다.
 *
 * @param {Object} request Migration 요청
 * @return {Object} CommonAPI 응답
 */
function executeMigration(request) {
  return CommonAPI.execute(function () {
    return MigrationService.execute(request);
  }, { operation: HLAS_CONSTANTS.MIGRATION_OPERATION.EXECUTE });
}

/**
 * Migration을 Rollback한다.
 *
 * @param {string} migrationId Migration ID
 * @return {Object} CommonAPI 응답
 */
function rollbackMigration(migrationId) {
  return CommonAPI.execute(function () {
    return MigrationService.rollback(migrationId);
  }, { operation: HLAS_CONSTANTS.MIGRATION_OPERATION.ROLLBACK });
}

/**
 * Migration Log를 조회한다.
 *
 * @param {string=} migrationId Migration ID
 * @return {Object} CommonAPI 응답
 */
function getMigrationLog(migrationId) {
  return CommonAPI.execute(function () {
    return MigrationLog.get(migrationId);
  }, { operation: HLAS_CONSTANTS.MIGRATION_OPERATION.LOG_GET });
}
