/**
 * @fileoverview Producer Master 공통 Validation.
 */

const ProducerValidator = Object.freeze({
  /**
   * Producer 필수값과 코드값을 검증한다.
   *
   * @param {Object} data Producer 데이터
   * @return {boolean} 검증 성공 여부
   */
  validate: function (data) {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const input = data || {};

    Validation.required(input[field.PRODUCER_ID], field.PRODUCER_ID);
    Validation.required(input[field.PRODUCER_NAME], field.PRODUCER_NAME);
    Validation.required(input[field.REGION], field.REGION);
    Validation.required(input[field.COMMUNITY], field.COMMUNITY);
    Validation.required(input[field.TRADE_STATUS], field.TRADE_STATUS);
    Validation.required(
      input[field.MEMBERSHIP_STATUS],
      field.MEMBERSHIP_STATUS
    );
    this.validErpNumber(input[field.PRODUCER_ID]);
    Validation.validStatus(
      input[field.TRADE_STATUS],
      HLAS_CONSTANTS.SUPPLY_STATUS.VALUES,
      field.TRADE_STATUS
    );
    Validation.validStatus(
      input[field.MEMBERSHIP_STATUS],
      HLAS_CONSTANTS.MEMBERSHIP_TYPE.VALUES,
      field.MEMBERSHIP_STATUS
    );
    if (input[field.PRODUCER_STATUS]) {
      Validation.validStatus(
        input[field.PRODUCER_STATUS],
        HLAS_CONSTANTS.PRODUCER_STATUS.VALUES,
        field.PRODUCER_STATUS
      );
    }
    if (input[field.SUPPORT_GRADE]) {
      Validation.validStatus(
        input[field.SUPPORT_GRADE],
        HLAS_CONSTANTS.SUPPORT_GRADE.VALUES,
        field.SUPPORT_GRADE
      );
    }
    Validation.validDate(input[field.JOIN_DATE], field.JOIN_DATE);
    Validation.validDate(
      input[field.ASSOCIATION_JOIN_DATE],
      field.ASSOCIATION_JOIN_DATE
    );
    Validation.validDate(
      input[field.LAST_RECEIVING_DATE],
      field.LAST_RECEIVING_DATE
    );
    return true;
  },

  /**
   * ProducerID가 ERP 식별자로 사용할 수 있는지 검사한다.
   *
   * @param {string|number} producerId ERP 생산자번호
   * @return {boolean} 검증 성공 여부
   */
  validErpNumber: function (producerId) {
    const value = String(producerId || '').trim();
    if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new ValidationError(
        'ProducerID는 ERP에서 사용하는 영문·숫자·하이픈·밑줄 형식이어야 합니다.',
        HLAS_CONSTANTS.FIELD.PRODUCER.PRODUCER_ID,
        { value: producerId },
        'PRODUCER_ERP_ID_INVALID'
      );
    }
    return true;
  },

  /**
   * ProducerID 중복을 검사한다.
   *
   * @param {string} producerId Producer ID
   * @param {Object|null} existing 기존 Producer
   * @return {boolean} 중복 없음
   */
  uniqueId: function (producerId, existing) {
    if (existing) {
      throw new DuplicateError(
        '이미 등록된 ProducerID입니다.',
        HLAS_CONSTANTS.FIELD.PRODUCER.PRODUCER_ID,
        { producerId: producerId },
        'PRODUCER_DUPLICATE'
      );
    }
    return true;
  },
});
