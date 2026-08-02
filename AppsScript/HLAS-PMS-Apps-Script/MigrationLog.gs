/**
 * @fileoverview TASK-0027 Migration 실행 이력 Repository.
 */
const MigrationLog = Object.freeze({
  /**
   * Migration Log를 생성한다.
   *
   * @param {Object} data Log 데이터
   * @return {Object} 저장 결과
   */
  create: function (data) {
    const f = HLAS_CONSTANTS.MIGRATION_FIELD;
    const record = Object.assign({}, data || {});
    Validation.required(record[f.MIGRATION_ID], f.MIGRATION_ID);
    Validation.required(record[f.ENTITY], f.ENTITY);
    return SheetRepository.insert(PMS_CONFIG.MIGRATION_TABLES.LOG, record);
  },

  /**
   * Migration Log를 갱신한다.
   *
   * @param {string} migrationId Migration ID
   * @param {Object} changes 변경값
   * @return {Object} 갱신 결과
   */
  update: function (migrationId, changes) {
    return SheetRepository.update(
      PMS_CONFIG.MIGRATION_TABLES.LOG,
      migrationId,
      changes || {}
    );
  },

  /**
   * Migration Log를 조회한다.
   *
   * @param {string=} migrationId Migration ID
   * @return {Object|Array<Object>|null} 조회 결과
   */
  get: function (migrationId) {
    return migrationId
      ? SheetRepository.findById(PMS_CONFIG.MIGRATION_TABLES.LOG, migrationId)
      : SheetRepository.findAll(PMS_CONFIG.MIGRATION_TABLES.LOG);
  },
});
