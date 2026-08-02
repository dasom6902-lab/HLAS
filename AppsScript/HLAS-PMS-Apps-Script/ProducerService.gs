/**
 * @fileoverview Producer Master 비즈니스 Service.
 */

const ProducerService = Object.freeze({
  /**
   * Producer 입력값을 검증한다.
   *
   * @param {Object} data Producer 데이터
   * @return {boolean} 검증 성공 여부
   */
  validateProducer: function (data) {
    return ProducerValidator.validate(data);
  },

  /**
   * Producer를 활성화한다.
   *
   * @param {string} producerId Producer ID
   * @return {Object} 활성화된 Producer
   */
  activateProducer: function (producerId) {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const changes = {};
    changes[field.PRODUCER_STATUS] = HLAS_CONSTANTS.PRODUCER_STATUS.ACTIVE;
    changes[field.TRADE_STATUS] = HLAS_CONSTANTS.SUPPLY_STATUS.ACTIVE;
    changes[field.IS_ACTIVE] = HLAS_CONSTANTS.PRODUCER.BOOLEAN_TRUE;
    changes[field.DELETED_AT] = '';
    return ProducerRepository.updateProducer(producerId, changes);
  },

  /**
   * Producer를 비활성화한다.
   *
   * @param {string} producerId Producer ID
   * @return {Object} 비활성화된 Producer
   */
  deactivateProducer: function (producerId) {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const changes = {};
    changes[field.PRODUCER_STATUS] = HLAS_CONSTANTS.PRODUCER_STATUS.INACTIVE;
    changes[field.TRADE_STATUS] = HLAS_CONSTANTS.SUPPLY_STATUS.PAUSED;
    changes[field.IS_ACTIVE] = HLAS_CONSTANTS.PRODUCER.BOOLEAN_FALSE;
    return ProducerRepository.updateProducer(producerId, changes);
  },

  /**
   * 입고 이력에서 Producer 공급 통계를 계산한다.
   *
   * @param {string} producerId Producer ID
   * @param {Array<Object>} receivingRows 입고 이력
   * @return {{count:number,quantity:number,amount:number,lastReceivingDate:*}} 통계
   */
  calculateSupplyStatistics: function (producerId, receivingRows) {
    const column = HLAS_CONSTANTS.COLUMN_NAME;
    const rows = (receivingRows || []).filter(function (row) {
      return String(row[column.PRODUCER_ID]) === String(producerId);
    });
    let quantity = HLAS_CONSTANTS.PRODUCER.ZERO_VALUE;
    let amount = HLAS_CONSTANTS.PRODUCER.ZERO_VALUE;
    let lastReceivingDate = null;
    rows.forEach(function (row) {
      quantity += Number(row[column.QUANTITY] || HLAS_CONSTANTS.PRODUCER.ZERO_VALUE);
      amount += Number(row[column.AMOUNT] || HLAS_CONSTANTS.PRODUCER.ZERO_VALUE);
      const date = row[column.RECEIVING_DATE];
      if (date && (!lastReceivingDate || new Date(date) > new Date(lastReceivingDate))) {
        lastReceivingDate = date;
      }
    });
    return {
      count: rows.length,
      quantity: quantity,
      amount: amount,
      lastReceivingDate: lastReceivingDate,
    };
  },

  /**
   * Producer 기본정보와 공급 통계를 결합한다.
   *
   * @param {string} producerId Producer ID
   * @param {Array<Object>=} receivingRows 입고 이력
   * @return {{producer:Object,statistics:Object}} Producer 요약
   */
  getProducerSummary: function (producerId, receivingRows) {
    const producer = ProducerRepository.getProducerById(producerId);
    if (!producer) {
      throw new NotFoundError(
        'Producer를 찾을 수 없습니다.',
        HLAS_CONSTANTS.FIELD.PRODUCER.PRODUCER_ID,
        { producerId: producerId },
        'PRODUCER_NOT_FOUND'
      );
    }
    return {
      producer: producer,
      statistics: this.calculateSupplyStatistics(
        producerId,
        receivingRows || []
      ),
    };
  },
});
