/**
 * @fileoverview Agreement 표준/확장 필드 분리 도구.
 */
const AgreementExtension = Object.freeze({
  /** @return {Array<string>} 표준 필드 */
  getMasterFields: function () {
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    return [
      f.AGREEMENT_ID, f.AGREEMENT_YEAR, f.PRODUCER_ID, f.PRODUCT_ID,
      f.PRODUCT_NAME, f.AGREEMENT_QUANTITY, f.AGREEMENT_AMOUNT,
      f.EXPECTED_SUPPLY_DATE, f.START_DATE, f.END_DATE, f.AGREEMENT_STATUS,
    ];
  },

  /** @return {Array<string>} 확장 필드 */
  getExtensionFields: function () {
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    return [
      f.AGREEMENT_ID, f.AGREEMENT_TYPE, f.SETTLEMENT_STATUS,
      f.FUND_APPLICABLE, f.PRIORITY, f.REMARK, f.INTERNAL_MEMO,
      f.CREATED_AT, f.CREATED_BY, f.UPDATED_AT, f.UPDATED_BY,
      f.SCHEMA_VERSION, f.IS_ACTIVE, f.DELETED_AT, f.DELETED_BY,
      f.DELETE_REASON,
    ];
  },

  /** @param {Object} data 전체 데이터 @return {Object} 표준 레코드 */
  extractMaster: function (data) {
    return pickAgreementFields_(data, this.getMasterFields());
  },

  /** @param {Object} data 전체 데이터 @return {Object} 확장 레코드 */
  extractExtension: function (data) {
    return pickAgreementFields_(data, this.getExtensionFields());
  },

  /** @param {Object} data 입력값 @param {string=} user 작업자 @return {Object} 기본값 적용 레코드 */
  withDefaults: function (data, user) {
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const record = Object.assign({}, data || {});
    record[f.AGREEMENT_TYPE] =
      record[f.AGREEMENT_TYPE] || HLAS_CONSTANTS.AGREEMENT_TYPE.ANNUAL;
    record[f.SETTLEMENT_STATUS] =
      record[f.SETTLEMENT_STATUS] || HLAS_CONSTANTS.SETTLEMENT_STATUS.PENDING;
    record[f.PRIORITY] =
      record[f.PRIORITY] || HLAS_CONSTANTS.AGREEMENT_PRIORITY.NORMAL;
    if (record[f.FUND_APPLICABLE] === undefined) {
      record[f.FUND_APPLICABLE] = false;
    }
    return AuditManager.initializeAudit(record, user);
  },

  /** @param {Object} master 표준 @param {Object=} extension 확장 @return {Object} 병합 데이터 */
  merge: function (master, extension) {
    return Object.assign({}, master || {}, extension || {});
  },
});

function pickAgreementFields_(data, fields) {
  const result = {};
  const input = data || {};
  fields.forEach(function (name) {
    if (Object.prototype.hasOwnProperty.call(input, name)) {
      result[name] = input[name];
    }
  });
  return result;
}

