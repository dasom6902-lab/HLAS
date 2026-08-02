/**
 * @fileoverview HLAS 데이터 영역과 논리 테이블을 관리하는 Registry.
 */

const ArchitectureRegistry = Object.freeze({
  /**
   * 전체 Architecture Registry를 반환한다.
   *
   * @return {Object} 테이블 유형별 논리 테이블 Registry
   */
  getRegistry: function () {
    const type = HLAS_CONSTANTS.TABLE_TYPE;
    const registry = {};
    registry[type.MASTER] = PMS_CONFIG.MASTER_TABLES;
    registry[type.TRANSACTION] = PMS_CONFIG.TRANSACTION_TABLES;
    registry[type.ANALYTICS] = PMS_CONFIG.ANALYTICS_TABLES;
    registry[type.RULE] = PMS_CONFIG.RULE_TABLES;
    return Object.freeze(registry);
  },

  /**
   * 지정한 테이블 유형의 Registry를 반환한다.
   *
   * @param {string} tableType HLAS_CONSTANTS.TABLE_TYPE 값
   * @return {Object} 해당 유형의 논리 테이블
   */
  getTables: function (tableType) {
    const registry = this.getRegistry();
    if (!Object.prototype.hasOwnProperty.call(registry, tableType)) {
      throw new ValidationError(
        '등록되지 않은 테이블 유형입니다.',
        'tableType',
        { tableType: tableType },
        'TABLE_TYPE_NOT_REGISTERED'
      );
    }
    return registry[tableType];
  },

  /**
   * 논리 테이블이 Architecture Registry에 등록되어 있는지 확인한다.
   *
   * @param {string} tableName 논리 테이블명
   * @return {boolean} 등록 여부
   */
  isRegistered: function (tableName) {
    const registry = this.getRegistry();
    return Object.keys(registry).some(function (type) {
      return Object.keys(registry[type]).some(function (key) {
        return registry[type][key] === tableName;
      });
    });
  },

  /**
   * 논리 테이블의 테이블 유형을 조회한다.
   *
   * @param {string} tableName 논리 테이블명
   * @return {string|null} 테이블 유형 또는 null
   */
  getTableType: function (tableName) {
    const registry = this.getRegistry();
    const types = Object.keys(registry);
    for (let index = 0; index < types.length; index += 1) {
      const type = types[index];
      const tables = registry[type];
      const found = Object.keys(tables).some(function (key) {
        return tables[key] === tableName;
      });
      if (found) return type;
    }
    return null;
  },
});
