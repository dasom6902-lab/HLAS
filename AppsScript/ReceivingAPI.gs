/**
 * @fileoverview Receiving Transaction 공개 API.
 */

/**
 * Receiving을 조회한다.
 *
 * @param {Object=} criteria ReceivingID 또는 필드 필터
 * @return {Object} CommonAPI 표준 응답
 */
function getReceiving(criteria) {
  return CommonAPI.execute(function () {
    const input = criteria || {};
    const idField = HLAS_CONSTANTS.FIELD.RECEIVING.RECEIVING_ID;
    if (input[idField]) {
      return ReceivingRepository.getReceivingById(input[idField]);
    }
    return ReceivingRepository.getReceiving(input);
  }, { operation: 'RECEIVING_GET' });
}

/**
 * Receiving을 저장한다.
 *
 * @param {Object} data Receiving 데이터
 * @return {Object} CommonAPI 표준 응답
 */
function saveReceiving(data) {
  return CommonAPI.execute(function () {
    const input = data || {};
    const typeField = HLAS_CONSTANTS.FIELD.RECEIVING.RECEIVING_TYPE;
    if (input[typeField] === HLAS_CONSTANTS.RECEIVING_TYPE.RETURN) {
      return ReceivingService.registerReturn(input);
    }
    return ReceivingService.registerReceiving(input);
  }, { operation: 'RECEIVING_SAVE' });
}

/**
 * Receiving을 수정한다.
 *
 * @param {string} receivingId Receiving ID
 * @param {Object} data 수정 데이터
 * @return {Object} CommonAPI 표준 응답
 */
function updateReceiving(receivingId, data) {
  return CommonAPI.execute(function () {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const current = ReceivingRepository.getReceivingById(receivingId);
    if (!current) {
      throw new NotFoundError(
        'Receiving을 찾을 수 없습니다.',
        field.RECEIVING_ID,
        { receivingId: receivingId },
        'RECEIVING_NOT_FOUND'
      );
    }
    const changes = Object.assign({}, data || {});
    const quantity = changes[field.QUANTITY] === undefined
      ? current[field.QUANTITY]
      : changes[field.QUANTITY];
    const unitPrice = changes[field.UNIT_PRICE] === undefined
      ? current[field.UNIT_PRICE]
      : changes[field.UNIT_PRICE];
    const returnQuantity = changes[field.RETURN_QUANTITY] === undefined
      ? current[field.RETURN_QUANTITY]
      : changes[field.RETURN_QUANTITY];
    changes[field.AMOUNT] =
      ReceivingService.calculateReceivingAmount(quantity, unitPrice);
    changes[field.RETURN_AMOUNT] =
      ReceivingService.calculateReceivingAmount(returnQuantity, unitPrice);
    return ReceivingRepository.updateReceiving(receivingId, changes);
  }, { operation: 'RECEIVING_UPDATE' });
}

/**
 * Receiving을 키워드와 필터로 검색한다.
 *
 * @param {Object=} options 검색 조건
 * @return {Object} CommonAPI 표준 응답
 */
function searchReceiving(options) {
  return CommonAPI.execute(function () {
    const input = options || {};
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const filters = {};
    if (input.producerId) filters[field.PRODUCER_ID] = input.producerId;
    if (input.productId) filters[field.PRODUCT_ID] = input.productId;
    if (input.centerCode) filters[field.CENTER_CODE] = input.centerCode;
    if (input.status) filters[field.STATUS] = input.status;
    if (input.receivingType) {
      filters[field.RECEIVING_TYPE] = input.receivingType;
    }
    const keyword = String(input.keyword || '').trim().toLowerCase();
    const startDate = input.startDate
      ? new Date(input.startDate).getTime()
      : null;
    const endDate = input.endDate ? new Date(input.endDate).getTime() : null;

    return ReceivingRepository.getReceiving(filters).filter(
      function (receiving) {
        if (keyword) {
          const searchable = [
            receiving[field.RECEIVING_ID],
            receiving[field.PRODUCER_ID],
            receiving[field.PRODUCT_ID],
            receiving[field.PRODUCT_NAME],
            receiving[field.CENTER_CODE],
            receiving[field.CENTER_NAME],
          ].join(HLAS_CONSTANTS.RECEIVING.SEARCH_SEPARATOR).toLowerCase();
          if (searchable.indexOf(keyword) === -1) return false;
        }
        const rowDate = new Date(receiving[field.RECEIVING_DATE]).getTime();
        if (startDate !== null && rowDate < startDate) return false;
        if (endDate !== null && rowDate > endDate) return false;
        return true;
      }
    );
  }, { operation: 'RECEIVING_SEARCH' });
}

/**
 * 전체 또는 생산자·품목별 Receiving 요약을 반환한다.
 *
 * @param {Object=} options producerId 또는 productId
 * @return {Object} CommonAPI 표준 응답
 */
function getReceivingSummary(options) {
  return CommonAPI.execute(function () {
    const input = options || {};
    if (input.producerId) {
      return ReceivingService.calculateProducerSupply(input.producerId);
    }
    if (input.productId) {
      return ReceivingService.calculateProductSupply(input.productId);
    }
    return ReceivingService.calculateReceivingStatistics(
      ReceivingRepository.getReceiving()
    );
  }, { operation: 'RECEIVING_SUMMARY' });
}
