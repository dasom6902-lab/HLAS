/**
 * @fileoverview Receiving Transaction Validation.
 */

const ReceivingValidator = Object.freeze({
  /**
   * Receiving 필수값, 코드값, 숫자 및 FK를 검증한다.
   *
   * @param {Object} data Receiving 데이터
   * @return {boolean} 검증 성공
   */
  validate: function (data) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const input = data || {};

    Validation.required(input[field.RECEIVING_ID], field.RECEIVING_ID);
    Validation.required(input[field.RECEIVING_DATE], field.RECEIVING_DATE);
    Validation.required(input[field.PRODUCER_ID], field.PRODUCER_ID);
    Validation.required(input[field.PRODUCT_ID], field.PRODUCT_ID);
    Validation.required(input[field.CENTER_CODE], field.CENTER_CODE);
    Validation.required(input[field.RECEIVING_TYPE], field.RECEIVING_TYPE);
    Validation.required(input[field.STATUS], field.STATUS);

    Validation.validDate(
      input[field.RECEIVING_DATE],
      field.RECEIVING_DATE
    );
    Validation.validStatus(
      input[field.RECEIVING_TYPE],
      HLAS_CONSTANTS.RECEIVING_TYPE.VALUES,
      field.RECEIVING_TYPE
    );
    Validation.validStatus(
      input[field.STATUS],
      HLAS_CONSTANTS.RECEIVING_STATUS.VALUES,
      field.STATUS
    );
    if (input[field.SETTLEMENT_STATUS]) {
      Validation.validStatus(
        input[field.SETTLEMENT_STATUS],
        HLAS_CONSTANTS.SETTLEMENT_STATUS.VALUES,
        field.SETTLEMENT_STATUS
      );
    }
    if (input[field.INSPECTION_STATUS]) {
      Validation.validStatus(
        input[field.INSPECTION_STATUS],
        HLAS_CONSTANTS.INSPECTION_STATUS.VALUES,
        field.INSPECTION_STATUS
      );
    }

    this.nonNegative(input[field.QUANTITY], field.QUANTITY);
    this.nonNegative(input[field.UNIT_PRICE], field.UNIT_PRICE);
    this.nonNegative(
      input[field.RETURN_QUANTITY],
      field.RETURN_QUANTITY
    );
    this.validateReturnQuantity(input);
    this.validateCenterCode(input[field.CENTER_CODE]);
    this.validateProducer(input[field.PRODUCER_ID]);
    this.validateProduct(input[field.PRODUCT_ID]);
    return true;
  },

  /**
   * ReceivingID 중복을 검사한다.
   *
   * @param {string} receivingId Receiving ID
   * @param {Object|null} existing 기존 데이터
   * @return {boolean} 중복 없음
   */
  uniqueId: function (receivingId, existing) {
    if (existing) {
      throw new DuplicateError(
        '이미 등록된 ReceivingID입니다.',
        HLAS_CONSTANTS.FIELD.RECEIVING.RECEIVING_ID,
        { receivingId: receivingId },
        'RECEIVING_DUPLICATE'
      );
    }
    return true;
  },

  /**
   * 값이 0 이상의 유한 숫자인지 검사한다.
   *
   * @param {*} value 숫자 값
   * @param {string} fieldName 필드명
   * @return {boolean} 검증 성공
   */
  nonNegative: function (value, fieldName) {
    const numberValue = Number(
      value === '' || value === null || value === undefined
        ? HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
        : value
    );
    if (!isFinite(numberValue) ||
        numberValue < HLAS_CONSTANTS.RECEIVING.ZERO_VALUE) {
      throw new ValidationError(
        fieldName + '은(는) 0 이상의 숫자여야 합니다.',
        fieldName,
        { value: value },
        'RECEIVING_NEGATIVE_VALUE'
      );
    }
    return true;
  },

  /**
   * 반품 거래의 반품 수량을 검사한다.
   *
   * @param {Object} data Receiving 데이터
   * @return {boolean} 검증 성공
   */
  validateReturnQuantity: function (data) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    if (data[field.RECEIVING_TYPE] !== HLAS_CONSTANTS.RECEIVING_TYPE.RETURN) {
      return true;
    }
    const returnQuantity = Number(
      data[field.RETURN_QUANTITY] ||
      HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
    );
    const quantity = Number(
      data[field.QUANTITY] || HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
    );
    if (returnQuantity <= HLAS_CONSTANTS.RECEIVING.ZERO_VALUE) {
      throw new ValidationError(
        '반품 거래는 ReturnQuantity가 0보다 커야 합니다.',
        field.RETURN_QUANTITY,
        { value: returnQuantity },
        'RETURN_QUANTITY_REQUIRED'
      );
    }
    if (quantity > HLAS_CONSTANTS.RECEIVING.ZERO_VALUE &&
        returnQuantity > quantity) {
      throw new ValidationError(
        '반품 수량은 기준 수량을 초과할 수 없습니다.',
        field.RETURN_QUANTITY,
        { quantity: quantity, returnQuantity: returnQuantity },
        'RETURN_QUANTITY_EXCEEDED'
      );
    }
    return true;
  },

  /**
   * 센터코드 형식을 검사한다.
   *
   * @param {string} centerCode 센터코드
   * @return {boolean} 검증 성공
   */
  validateCenterCode: function (centerCode) {
    const pattern = new RegExp(
      HLAS_CONSTANTS.RECEIVING.CENTER_CODE_PATTERN
    );
    if (!pattern.test(String(centerCode || '').trim())) {
      throw new ValidationError(
        'CenterCode 형식이 올바르지 않습니다.',
        HLAS_CONSTANTS.FIELD.RECEIVING.CENTER_CODE,
        { centerCode: centerCode },
        'CENTER_CODE_INVALID'
      );
    }
    return true;
  },

  /**
   * Producer Master FK 존재 여부를 검사한다.
   *
   * @param {string} producerId Producer ID
   * @return {boolean} 검증 성공
   */
  validateProducer: function (producerId) {
    if (!ProducerRepository.getProducerById(producerId)) {
      throw new NotFoundError(
        '연결할 Producer를 찾을 수 없습니다.',
        HLAS_CONSTANTS.FIELD.RECEIVING.PRODUCER_ID,
        { producerId: producerId },
        'RECEIVING_PRODUCER_NOT_FOUND'
      );
    }
    return true;
  },

  /**
   * Product Master FK 존재 여부를 검사한다.
   *
   * @param {string} productId Product ID
   * @return {boolean} 검증 성공
   */
  validateProduct: function (productId) {
    if (!ReceivingRepository.getProductById(productId)) {
      throw new NotFoundError(
        '연결할 Product를 찾을 수 없습니다.',
        HLAS_CONSTANTS.FIELD.RECEIVING.PRODUCT_ID,
        { productId: productId },
        'RECEIVING_PRODUCT_NOT_FOUND'
      );
    }
    return true;
  },
});
