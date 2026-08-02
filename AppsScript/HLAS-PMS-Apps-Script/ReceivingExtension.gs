/**
 * @fileoverview Receiving 원본 Transaction과 PMS 확장 필드 분리 도구.
 */

const ReceivingExtension = Object.freeze({
  /**
   * Receiving 표준 Transaction 필드를 반환한다.
   *
   * @return {Array<string>} 표준 필드
   */
  getMasterFields: function () {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    return [
      field.RECEIVING_ID, field.RECEIVING_DATE, field.PRODUCER_ID,
      field.PRODUCT_ID, field.PRODUCT_NAME, field.CENTER_CODE,
      field.CENTER_NAME, field.QUANTITY, field.UNIT, field.UNIT_PRICE,
      field.AMOUNT, field.RECEIVING_TYPE, field.RETURN_QUANTITY,
      field.RETURN_AMOUNT, field.STATUS, field.REMARK,
    ];
  },

  /**
   * Receiving PMS 확장 필드를 반환한다.
   *
   * @return {Array<string>} 확장 필드
   */
  getExtensionFields: function () {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    return [
      field.RECEIVING_ID, field.SETTLEMENT_STATUS, field.FUND_APPLICABLE,
      field.AGREEMENT_APPLICABLE, field.INSPECTION_STATUS, field.MEMO,
      field.CREATED_AT, field.CREATED_BY, field.UPDATED_AT,
      field.UPDATED_BY, field.SCHEMA_VERSION, field.IS_ACTIVE,
      field.DELETED_AT,
    ];
  },

  /**
   * 입력 객체에서 표준 Transaction 필드만 추출한다.
   *
   * @param {Object} data Receiving 전체 데이터
   * @return {Object} 표준 Transaction 레코드
   */
  extractMaster: function (data) {
    return pickReceivingFields_(data, this.getMasterFields());
  },

  /**
   * 입력 객체에서 PMS 확장 필드만 추출한다.
   *
   * @param {Object} data Receiving 전체 데이터
   * @return {Object} PMS 확장 레코드
   */
  extractExtension: function (data) {
    return pickReceivingFields_(data, this.getExtensionFields());
  },

  /**
   * 신규 Receiving 확장 레코드 기본값을 적용한다.
   *
   * @param {Object} extension 확장 입력값
   * @return {Object} 기본값이 적용된 확장 레코드
   */
  withDefaults: function (extension) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const record = Object.assign({}, extension || {});
    const now = new Date();
    record[field.SETTLEMENT_STATUS] =
      record[field.SETTLEMENT_STATUS] ||
      HLAS_CONSTANTS.SETTLEMENT_STATUS.PENDING;
    record[field.INSPECTION_STATUS] =
      record[field.INSPECTION_STATUS] ||
      HLAS_CONSTANTS.INSPECTION_STATUS.PENDING;
    if (record[field.FUND_APPLICABLE] === undefined) {
      record[field.FUND_APPLICABLE] =
        HLAS_CONSTANTS.RECEIVING.BOOLEAN_FALSE;
    }
    if (record[field.AGREEMENT_APPLICABLE] === undefined) {
      record[field.AGREEMENT_APPLICABLE] =
        HLAS_CONSTANTS.RECEIVING.BOOLEAN_FALSE;
    }
    record[field.CREATED_AT] = record[field.CREATED_AT] || now;
    record[field.UPDATED_AT] = now;
    record[field.CREATED_BY] = record[field.CREATED_BY] || '';
    record[field.UPDATED_BY] =
      record[field.UPDATED_BY] || record[field.CREATED_BY] || '';
    record[field.SCHEMA_VERSION] =
      record[field.SCHEMA_VERSION] ||
      HLAS_CONSTANTS.RECEIVING.SCHEMA_VERSION;
    record[field.IS_ACTIVE] =
      record[field.IS_ACTIVE] === undefined
        ? HLAS_CONSTANTS.RECEIVING.BOOLEAN_TRUE
        : record[field.IS_ACTIVE];
    record[field.DELETED_AT] = record[field.DELETED_AT] || '';
    return record;
  },

  /**
   * 표준 Transaction과 PMS 확장 레코드를 결합한다.
   *
   * @param {Object} master 표준 Transaction 레코드
   * @param {Object=} extension PMS 확장 레코드
   * @return {Object} 결합된 Receiving
   */
  merge: function (master, extension) {
    return Object.assign({}, master || {}, extension || {});
  },
});

function pickReceivingFields_(data, fields) {
  const input = data || {};
  const result = {};
  fields.forEach(function (name) {
    if (Object.prototype.hasOwnProperty.call(input, name)) {
      result[name] = input[name];
    }
  });
  return result;
}
