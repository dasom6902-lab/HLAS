/**
 * @fileoverview Agreement Domain 입력 및 FK 검증.
 */
const AgreementValidator = Object.freeze({
  /** @param {Object} data Agreement 데이터 @return {boolean} 성공 */
  validate: function (data) {
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const input = data || {};
    [
      f.AGREEMENT_ID, f.AGREEMENT_YEAR, f.PRODUCER_ID, f.PRODUCT_ID,
      f.AGREEMENT_QUANTITY, f.AGREEMENT_AMOUNT, f.AGREEMENT_STATUS,
    ].forEach(function (name) {
      Validation.required(input[name], name);
    });
    this.validateYear(input[f.AGREEMENT_YEAR]);
    this.nonNegative(input[f.AGREEMENT_QUANTITY], f.AGREEMENT_QUANTITY);
    this.nonNegative(input[f.AGREEMENT_AMOUNT], f.AGREEMENT_AMOUNT);
    Validation.validDate(input[f.EXPECTED_SUPPLY_DATE], f.EXPECTED_SUPPLY_DATE);
    Validation.validDate(input[f.START_DATE], f.START_DATE);
    Validation.validDate(input[f.END_DATE], f.END_DATE);
    Validation.dateRange(input[f.START_DATE], input[f.END_DATE]);
    Validation.validStatus(
      input[f.AGREEMENT_STATUS],
      HLAS_CONSTANTS.AGREEMENT_STATUS.VALUES,
      f.AGREEMENT_STATUS
    );
    if (input[f.AGREEMENT_TYPE]) {
      Validation.validStatus(
        input[f.AGREEMENT_TYPE],
        HLAS_CONSTANTS.AGREEMENT_TYPE.VALUES,
        f.AGREEMENT_TYPE
      );
    }
    if (input[f.PRIORITY]) {
      Validation.validStatus(
        input[f.PRIORITY],
        HLAS_CONSTANTS.AGREEMENT_PRIORITY.VALUES,
        f.PRIORITY
      );
    }
    this.validateProducer(input[f.PRODUCER_ID]);
    this.validateProduct(input[f.PRODUCT_ID]);
    return true;
  },

  /** @param {string} id Agreement ID @param {Object|null} existing 기존 값 @return {boolean} 성공 */
  uniqueId: function (id, existing) {
    if (existing) {
      throw new DuplicateError(
        '이미 등록된 AgreementID입니다.',
        HLAS_CONSTANTS.FIELD.AGREEMENT.AGREEMENT_ID,
        { agreementId: id },
        'AGREEMENT_DUPLICATE'
      );
    }
    return true;
  },

  /** @param {*} year 연도 @return {boolean} 성공 */
  validateYear: function (year) {
    const number = Number(year);
    if (!Number.isInteger(number) || number < 2000 || number > 2100) {
      throw new ValidationError(
        'AgreementYear는 2000~2100 사이의 연도여야 합니다.',
        HLAS_CONSTANTS.FIELD.AGREEMENT.AGREEMENT_YEAR,
        { year: year },
        'AGREEMENT_YEAR_INVALID'
      );
    }
    return true;
  },

  /** @param {*} value 값 @param {string} fieldName 필드 @return {boolean} 성공 */
  nonNegative: function (value, fieldName) {
    const number = Number(value);
    if (!isFinite(number) || number < 0) {
      throw new ValidationError(
        fieldName + '은(는) 0 이상의 숫자여야 합니다.',
        fieldName,
        { value: value },
        'AGREEMENT_NEGATIVE_VALUE'
      );
    }
    return true;
  },

  /** @param {string} producerId Producer ID @return {boolean} 성공 */
  validateProducer: function (producerId) {
    if (!ProducerRepository.getProducerById(
      DataTypeManager.normalizeProducerID(producerId)
    )) {
      throw new NotFoundError(
        '연결할 Producer를 찾을 수 없습니다.',
        HLAS_CONSTANTS.FIELD.AGREEMENT.PRODUCER_ID,
        { producerId: producerId },
        'AGREEMENT_PRODUCER_NOT_FOUND'
      );
    }
    return true;
  },

  /** @param {string} productId Product ID @return {boolean} 성공 */
  validateProduct: function (productId) {
    const target = DataTypeManager.normalizeProductID(productId);
    const productField = HLAS_CONSTANTS.FIELD.MASTER_DATA.ITEM_CODE;
    const exists = MasterDataRepository.readMasterData().records.some(
      function (record) {
        return DataTypeManager.normalizeProductID(record[productField]) === target;
      }
    );
    if (!exists) {
      throw new NotFoundError(
        '연결할 Product를 찾을 수 없습니다.',
        HLAS_CONSTANTS.FIELD.AGREEMENT.PRODUCT_ID,
        { productId: productId },
        'AGREEMENT_PRODUCT_NOT_FOUND'
      );
    }
    return true;
  },
});
