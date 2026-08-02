/**
 * @fileoverview ERP Producer 원본과 PMS 전용 확장 필드 분리 도구.
 */

const ProducerExtension = Object.freeze({
  /**
   * Producer Master 필드 목록을 반환한다.
   *
   * @return {Array<string>} Master 필드
   */
  getMasterFields: function () {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    return [
      field.PRODUCER_ID, field.PRODUCER_NAME, field.REGION,
      field.COMMUNITY, field.COMMUNITY_ID, field.BUSINESS_TYPE,
      field.PRODUCER_TYPE, field.TRADE_STATUS, field.MEMBERSHIP_STATUS,
      field.JOIN_DATE, field.PHONE, field.ADDRESS, field.BANK,
      field.ACCOUNT, field.PARCEL_COUNT, field.PARCEL_AREA,
      field.MAIN_PRODUCT, field.LAST_RECEIVING_DATE, field.PRODUCER_STATUS,
    ];
  },

  /**
   * PMS Extension 필드 목록을 반환한다.
   *
   * @return {Array<string>} Extension 필드
   */
  getExtensionFields: function () {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    return [
      field.PRODUCER_ID, field.ASSOCIATION_MEMBER,
      field.ASSOCIATION_JOIN_DATE, field.AGREEMENT_PARTICIPATION,
      field.FUND_ELIGIBLE, field.SUPPORT_GRADE, field.INTERNAL_MEMO,
      field.CREATED_AT, field.UPDATED_AT, field.IS_ACTIVE, field.DELETED_AT,
    ];
  },

  /**
   * 입력 객체에서 Master 필드만 추출한다.
   *
   * @param {Object} data Producer 전체 데이터
   * @return {Object} Master 레코드
   */
  extractMaster: function (data) {
    return pickProducerFields_(data, this.getMasterFields());
  },

  /**
   * 입력 객체에서 Extension 필드만 추출한다.
   *
   * @param {Object} data Producer 전체 데이터
   * @return {Object} Extension 레코드
   */
  extractExtension: function (data) {
    return pickProducerFields_(data, this.getExtensionFields());
  },

  /**
   * 신규 Extension의 기본값을 적용한다.
   *
   * @param {Object} extension Extension 입력값
   * @return {Object} 기본값이 적용된 Extension
   */
  withDefaults: function (extension) {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const record = Object.assign({}, extension);
    const now = new Date();
    if (record[field.ASSOCIATION_MEMBER] === undefined) {
      record[field.ASSOCIATION_MEMBER] =
        HLAS_CONSTANTS.PRODUCER.BOOLEAN_FALSE;
    }
    if (record[field.AGREEMENT_PARTICIPATION] === undefined) {
      record[field.AGREEMENT_PARTICIPATION] =
        HLAS_CONSTANTS.PRODUCER.BOOLEAN_FALSE;
    }
    if (record[field.FUND_ELIGIBLE] === undefined) {
      record[field.FUND_ELIGIBLE] =
        HLAS_CONSTANTS.PRODUCER.BOOLEAN_FALSE;
    }
    record[field.SUPPORT_GRADE] =
      record[field.SUPPORT_GRADE] || HLAS_CONSTANTS.SUPPORT_GRADE.NONE;
    record[field.IS_ACTIVE] =
      record[field.IS_ACTIVE] === undefined
        ? HLAS_CONSTANTS.PRODUCER.BOOLEAN_TRUE
        : record[field.IS_ACTIVE];
    record[field.CREATED_AT] = record[field.CREATED_AT] || now;
    record[field.UPDATED_AT] = now;
    record[field.DELETED_AT] = record[field.DELETED_AT] || '';
    return record;
  },

  /**
   * Master와 Extension 레코드를 하나의 Producer 객체로 결합한다.
   *
   * @param {Object} master Master 레코드
   * @param {Object=} extension Extension 레코드
   * @return {Object} 결합된 Producer
   */
  merge: function (master, extension) {
    return Object.assign({}, master || {}, extension || {});
  },
});

function pickProducerFields_(data, fields) {
  const input = data || {};
  const result = {};
  fields.forEach(function (name) {
    if (Object.prototype.hasOwnProperty.call(input, name)) {
      result[name] = input[name];
    }
  });
  return result;
}
