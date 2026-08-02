/**
 * @fileoverview HLAS Planning Entity와 테이블/중복 기준 Registry.
 */

const PlanningRegistry = Object.freeze({
  /**
   * 전체 Planning Entity 정의를 반환한다.
   *
   * @return {Object<string,Object>} Planning Registry
   */
  getRegistry: function () {
    const type = HLAS_CONSTANTS.TARGET_TYPE;
    const field = HLAS_CONSTANTS.FIELD.TARGET;
    const tables = PMS_CONFIG.PLANNING_TABLES;
    const registry = {};

    registry[type.ANNUAL] = planningDefinition_(
      type.ANNUAL, tables.ANNUAL_TARGET,
      [field.YEAR, field.CATEGORY]
    );
    registry[type.MONTHLY] = planningDefinition_(
      type.MONTHLY, tables.MONTHLY_TARGET,
      [field.YEAR, field.MONTH, field.CATEGORY]
    );
    registry[type.SUPPLY] = planningDefinition_(
      type.SUPPLY, tables.SUPPLY_TARGET,
      [field.YEAR, field.MONTH, field.ROUTE_CODE]
    );
    registry[type.STORE] = planningDefinition_(
      type.STORE, tables.STORE_TARGET,
      [field.YEAR, field.MONTH, field.STORE_CODE]
    );
    registry[type.HISTORY] = planningDefinition_(
      type.HISTORY, tables.TARGET_HISTORY,
      [field.HISTORY_ID]
    );
    return Object.freeze(registry);
  },

  /**
   * Target Type의 Planning 정의를 조회한다.
   *
   * @param {string} targetType HLAS_CONSTANTS.TARGET_TYPE 값
   * @return {Object} Planning Entity 정의
   */
  get: function (targetType) {
    const registry = this.getRegistry();
    if (!Object.prototype.hasOwnProperty.call(registry, targetType)) {
      throw new ValidationError(
        '등록되지 않은 목표 유형입니다.',
        'targetType',
        { targetType: targetType },
        'TARGET_TYPE_NOT_REGISTERED'
      );
    }
    return registry[targetType];
  },

  /**
   * Target Type 등록 여부를 확인한다.
   *
   * @param {string} targetType 목표 유형
   * @return {boolean} 등록 여부
   */
  isRegistered: function (targetType) {
    return Object.prototype.hasOwnProperty.call(this.getRegistry(), targetType);
  },
});

function planningDefinition_(targetType, tableName, uniqueFields) {
  return Object.freeze({
    targetType: targetType,
    tableName: tableName,
    uniqueFields: Object.freeze(uniqueFields),
  });
}
