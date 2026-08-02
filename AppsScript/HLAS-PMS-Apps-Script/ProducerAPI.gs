/**
 * @fileoverview Producer Master 공개 API.
 */

/**
 * Producer를 조회한다.
 *
 * @param {Object=} criteria ProducerID 또는 필드 필터
 * @return {Object} CommonAPI 표준 응답
 */
function getProducer(criteria) {
  return CommonAPI.execute(function () {
    const input = criteria || {};
    const idField = HLAS_CONSTANTS.FIELD.PRODUCER.PRODUCER_ID;
    if (input[idField]) {
      return ProducerRepository.getProducerById(input[idField]);
    }
    return ProducerRepository.getProducer(input);
  }, { operation: 'PRODUCER_GET' });
}

/**
 * Producer를 저장한다.
 *
 * @param {Object} data Producer 데이터
 * @return {Object} CommonAPI 표준 응답
 */
function saveProducer(data) {
  return CommonAPI.execute(function () {
    return ProducerRepository.saveProducer(data);
  }, { operation: 'PRODUCER_SAVE' });
}

/**
 * Producer를 수정한다.
 *
 * @param {string} producerId Producer ID
 * @param {Object} data 수정 데이터
 * @return {Object} CommonAPI 표준 응답
 */
function updateProducer(producerId, data) {
  return CommonAPI.execute(function () {
    return ProducerRepository.updateProducer(producerId, data);
  }, { operation: 'PRODUCER_UPDATE' });
}

/**
 * Producer를 키워드와 필터로 검색한다.
 *
 * @param {Object=} options keyword, region, community, status
 * @return {Object} CommonAPI 표준 응답
 */
function searchProducer(options) {
  return CommonAPI.execute(function () {
    const input = options || {};
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const filters = {};
    if (input.region) filters[field.REGION] = input.region;
    if (input.community) filters[field.COMMUNITY] = input.community;
    if (input.status) filters[field.TRADE_STATUS] = input.status;
    const keyword = String(input.keyword || '').trim().toLowerCase();
    return ProducerRepository.getProducer(filters).filter(function (producer) {
      if (!keyword) return true;
      return [
        producer[field.PRODUCER_ID],
        producer[field.PRODUCER_NAME],
        producer[field.REGION],
        producer[field.COMMUNITY],
      ].join(HLAS_CONSTANTS.PRODUCER.SEARCH_SEPARATOR)
        .toLowerCase()
        .indexOf(keyword) !== -1;
    });
  }, { operation: 'PRODUCER_SEARCH' });
}
