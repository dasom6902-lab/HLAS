/**
 * @fileoverview Planning 목표 데이터 Repository.
 *
 * SpreadsheetApp에 직접 접근하지 않고 SheetRepository만 사용한다.
 */

const TargetRepository = Object.freeze({
  /**
   * 연간 목표를 조회한다.
   *
   * @param {number|string=} year 연도
   * @param {string=} category 목표 Category
   * @return {Array<Object>} 연간 목표
   */
  getAnnualTarget: function (year, category) {
    const field = HLAS_CONSTANTS.FIELD.TARGET;
    return this.findTargets(HLAS_CONSTANTS.TARGET_TYPE.ANNUAL, {
      [field.YEAR]: year,
      [field.CATEGORY]: category,
    });
  },

  /**
   * 월간 목표를 조회한다.
   *
   * @param {number|string=} year 연도
   * @param {number|string=} month 월
   * @param {string=} category 목표 Category
   * @return {Array<Object>} 월간 목표
   */
  getMonthlyTarget: function (year, month, category) {
    const field = HLAS_CONSTANTS.FIELD.TARGET;
    return this.findTargets(HLAS_CONSTANTS.TARGET_TYPE.MONTHLY, {
      [field.YEAR]: year,
      [field.MONTH]: month,
      [field.CATEGORY]: category,
    });
  },

  /**
   * 공급 목표를 조회한다.
   *
   * @param {number|string=} year 연도
   * @param {number|string=} month 월
   * @param {string=} routeCode 공급코스
   * @return {Array<Object>} 공급 목표
   */
  getSupplyTarget: function (year, month, routeCode) {
    const field = HLAS_CONSTANTS.FIELD.TARGET;
    return this.findTargets(HLAS_CONSTANTS.TARGET_TYPE.SUPPLY, {
      [field.YEAR]: year,
      [field.MONTH]: month,
      [field.ROUTE_CODE]: routeCode,
    });
  },

  /**
   * 매장 목표를 조회한다.
   *
   * @param {number|string=} year 연도
   * @param {number|string=} month 월
   * @param {string=} storeCode 매장코드
   * @return {Array<Object>} 매장 목표
   */
  getStoreTarget: function (year, month, storeCode) {
    const field = HLAS_CONSTANTS.FIELD.TARGET;
    return this.findTargets(HLAS_CONSTANTS.TARGET_TYPE.STORE, {
      [field.YEAR]: year,
      [field.MONTH]: month,
      [field.STORE_CODE]: storeCode,
    });
  },

  /**
   * 조건에 맞는 목표를 한 번의 Repository 조회 후 메모리에서 필터링한다.
   *
   * @param {string} targetType 목표 유형
   * @param {Object=} filters 필터
   * @return {Array<Object>} 목표 목록
   */
  findTargets: function (targetType, filters) {
    const definition = PlanningRegistry.get(targetType);
    const criteria = filters || {};
    const rows = SheetRepository.findAll(definition.tableName);
    const names = Object.keys(criteria).filter(function (name) {
      return criteria[name] !== undefined &&
        criteria[name] !== null &&
        criteria[name] !== '';
    });
    return rows.filter(function (row) {
      return names.every(function (name) {
        return String(row[name]) === String(criteria[name]);
      });
    });
  },

  /**
   * 목표를 저장한다.
   *
   * @param {string} targetType 목표 유형
   * @param {Object} rowData 저장 데이터
   * @return {Object} 저장된 목표
   */
  saveTarget: function (targetType, rowData) {
    const definition = PlanningRegistry.get(targetType);
    TargetValidator.validate(targetType, rowData);
    TargetValidator.unique(
      targetType,
      rowData,
      SheetRepository.findAll(definition.tableName)
    );
    const record = prepareTargetRecord_(rowData, false);
    const saved = SheetRepository.insert(definition.tableName, record);
    writeTargetHistory_(
      targetType,
      saved,
      HLAS_CONSTANTS.TARGET.ACTION_CREATE,
      null
    );
    return saved;
  },

  /**
   * 목표를 수정한다.
   *
   * @param {string} targetType 목표 유형
   * @param {string} targetId Target ID
   * @param {Object} rowData 수정 데이터
   * @return {Object} 수정된 목표
   */
  updateTarget: function (targetType, targetId, rowData) {
    const definition = PlanningRegistry.get(targetType);
    const current = SheetRepository.findById(definition.tableName, targetId);
    if (!current) {
      throw new NotFoundError(
        '수정할 목표를 찾을 수 없습니다.',
        HLAS_CONSTANTS.FIELD.TARGET.TARGET_ID,
        { targetId: targetId },
        'TARGET_NOT_FOUND'
      );
    }
    const merged = Object.assign({}, current, rowData);
    TargetValidator.validate(targetType, merged);
    TargetValidator.unique(
      targetType,
      merged,
      SheetRepository.findAll(definition.tableName),
      targetId
    );
    const saved = SheetRepository.update(
      definition.tableName,
      targetId,
      prepareTargetRecord_(rowData, true)
    );
    writeTargetHistory_(
      targetType,
      saved,
      HLAS_CONSTANTS.TARGET.ACTION_UPDATE,
      current
    );
    return saved;
  },
});

function prepareTargetRecord_(data, updateOnly) {
  const field = HLAS_CONSTANTS.FIELD.TARGET;
  const now = new Date();
  const record = Object.assign({}, data);
  if (!updateOnly) {
    record[field.TARGET_ID] =
      record[field.TARGET_ID] ||
      HLAS_CONSTANTS.TARGET.ID_PREFIX + Utilities.getUuid();
    record[field.CREATED_AT] = record[field.CREATED_AT] || now;
    record[field.STATUS] =
      record[field.STATUS] || HLAS_CONSTANTS.TARGET_STATUS.ACTIVE;
  }
  record[field.UPDATED_AT] = now;
  return record;
}

function writeTargetHistory_(targetType, afterValue, action, beforeValue) {
  const field = HLAS_CONSTANTS.FIELD.TARGET;
  const record = {};
  record[field.HISTORY_ID] =
    HLAS_CONSTANTS.TARGET.HISTORY_ID_PREFIX + Utilities.getUuid();
  record[field.TARGET_ID] = afterValue[field.TARGET_ID];
  record[field.TARGET_TYPE] = targetType;
  record[field.ACTION] = action;
  record[field.BEFORE_VALUE] = beforeValue ? JSON.stringify(beforeValue) : '';
  record[field.AFTER_VALUE] = JSON.stringify(afterValue);
  record[field.CHANGED_AT] = new Date();
  SheetRepository.insert(PMS_CONFIG.PLANNING_TABLES.TARGET_HISTORY, record);
}
