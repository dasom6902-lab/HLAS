/**
 * @fileoverview Receiving Transaction 비즈니스 Service.
 */

const ReceivingService = Object.freeze({
  /**
   * Receiving 입력값을 검증한다.
   *
   * @param {Object} data Receiving 데이터
   * @return {boolean} 검증 성공
   */
  validateReceiving: function (data) {
    return ReceivingValidator.validate(data);
  },

  /**
   * 정상 입고를 등록한다.
   *
   * @param {Object} data 입고 데이터
   * @return {Object} 저장된 Receiving
   */
  registerReceiving: function (data) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const input = Object.assign({}, data || {});
    input[field.RECEIVING_TYPE] =
      HLAS_CONSTANTS.RECEIVING_TYPE.RECEIVING;
    input[field.RETURN_QUANTITY] =
      HLAS_CONSTANTS.RECEIVING.ZERO_VALUE;
    input[field.RETURN_AMOUNT] = HLAS_CONSTANTS.RECEIVING.ZERO_VALUE;
    input[field.AMOUNT] = this.calculateReceivingAmount(
      input[field.QUANTITY],
      input[field.UNIT_PRICE]
    );
    return ReceivingRepository.saveReceiving(input);
  },

  /**
   * 반품 Transaction을 등록한다.
   *
   * @param {Object} data 반품 데이터
   * @return {Object} 저장된 반품 Receiving
   */
  registerReturn: function (data) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const input = Object.assign({}, data || {});
    input[field.RECEIVING_TYPE] = HLAS_CONSTANTS.RECEIVING_TYPE.RETURN;
    input[field.AMOUNT] = this.calculateReceivingAmount(
      input[field.QUANTITY],
      input[field.UNIT_PRICE]
    );
    input[field.RETURN_AMOUNT] = this.calculateReceivingAmount(
      input[field.RETURN_QUANTITY],
      input[field.UNIT_PRICE]
    );
    return ReceivingRepository.saveReceiving(input);
  },

  /**
   * 수량과 단가로 금액을 계산한다.
   *
   * @param {number|string} quantity 수량
   * @param {number|string} unitPrice 단가
   * @return {number} 계산 금액
   */
  calculateReceivingAmount: function (quantity, unitPrice) {
    ReceivingValidator.nonNegative(
      quantity,
      HLAS_CONSTANTS.FIELD.RECEIVING.QUANTITY
    );
    ReceivingValidator.nonNegative(
      unitPrice,
      HLAS_CONSTANTS.FIELD.RECEIVING.UNIT_PRICE
    );
    return Number(quantity || HLAS_CONSTANTS.RECEIVING.ZERO_VALUE) *
      Number(unitPrice || HLAS_CONSTANTS.RECEIVING.ZERO_VALUE);
  },

  /**
   * Receiving 목록의 공급 통계를 계산한다.
   *
   * @param {Array<Object>} rows Receiving 목록
   * @return {Object} 입고·반품·순공급 통계
   */
  calculateReceivingStatistics: function (rows) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const statistics = {
      count: 0,
      receivingCount: 0,
      returnCount: 0,
      quantity: 0,
      returnQuantity: 0,
      netQuantity: 0,
      amount: 0,
      returnAmount: 0,
      netAmount: 0,
    };
    (rows || []).forEach(function (row) {
      if (row[field.IS_ACTIVE] === false ||
          row[field.STATUS] === HLAS_CONSTANTS.RECEIVING_STATUS.DELETED) {
        return;
      }
      statistics.count += 1;
      if (row[field.RECEIVING_TYPE] ===
          HLAS_CONSTANTS.RECEIVING_TYPE.RETURN) {
        statistics.returnCount += 1;
      } else {
        statistics.receivingCount += 1;
      }
      statistics.quantity += Number(
        row[field.QUANTITY] || HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
      );
      statistics.returnQuantity += Number(
        row[field.RETURN_QUANTITY] ||
        HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
      );
      statistics.amount += Number(
        row[field.AMOUNT] || HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
      );
      statistics.returnAmount += Number(
        row[field.RETURN_AMOUNT] ||
        HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
      );
    });
    statistics.netQuantity =
      statistics.quantity - statistics.returnQuantity;
    statistics.netAmount =
      statistics.amount - statistics.returnAmount;
    return statistics;
  },

  /**
   * 생산자별 공급 통계를 계산한다.
   *
   * @param {string} producerId Producer ID
   * @return {Object} 생산자 공급 통계
   */
  calculateProducerSupply: function (producerId) {
    return this.calculateReceivingStatistics(
      ReceivingRepository.getReceivingByProducer(producerId)
    );
  },

  /**
   * 품목별 공급 통계를 계산한다.
   *
   * @param {string} productId Product ID
   * @return {Object} 품목 공급 통계
   */
  calculateProductSupply: function (productId) {
    return this.calculateReceivingStatistics(
      ReceivingRepository.getReceivingByProduct(productId)
    );
  },
});
