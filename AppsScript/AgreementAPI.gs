/**
 * @fileoverview Agreement Domain 공개 API.
 */

/** @param {Object=} criteria 조회조건 @return {Object} CommonAPI 응답 */
function getAgreement(criteria) {
  return CommonAPI.execute(function () {
    const input = criteria || {};
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    return input[f.AGREEMENT_ID]
      ? AgreementRepository.getAgreementById(input[f.AGREEMENT_ID])
      : AgreementRepository.getAgreement(input);
  }, { operation: 'AGREEMENT_GET' });
}

/** @param {Object} data Agreement 데이터 @return {Object} CommonAPI 응답 */
function saveAgreement(data) {
  return CommonAPI.execute(function () {
    return AgreementService.registerAgreement(data);
  }, { operation: 'AGREEMENT_SAVE' });
}

/** @param {string} id Agreement ID @param {Object} data 변경값 @return {Object} CommonAPI 응답 */
function updateAgreement(id, data) {
  return CommonAPI.execute(function () {
    return AgreementService.changeAgreement(id, data);
  }, { operation: 'AGREEMENT_UPDATE' });
}

/** @param {Object=} options 검색조건 @return {Object} CommonAPI 응답 */
function searchAgreement(options) {
  return CommonAPI.execute(function () {
    const input = options || {};
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const filters = {};
    if (input.producerId) filters[f.PRODUCER_ID] = input.producerId;
    if (input.productId) filters[f.PRODUCT_ID] = input.productId;
    if (input.year) filters[f.AGREEMENT_YEAR] = input.year;
    if (input.status) filters[f.AGREEMENT_STATUS] = input.status;
    const keyword = String(input.keyword || '').trim().toLowerCase();
    return AgreementRepository.getAgreement(filters).filter(function (row) {
      if (!keyword) return true;
      return [
        row[f.AGREEMENT_ID], row[f.PRODUCER_ID], row[f.PRODUCT_ID],
        row[f.PRODUCT_NAME], row[f.REMARK],
      ].join(' ').toLowerCase().indexOf(keyword) !== -1;
    });
  }, { operation: 'AGREEMENT_SEARCH' });
}

/** @param {string} id Agreement ID @return {Object} CommonAPI 응답 */
function getAgreementSummary(id) {
  return CommonAPI.execute(function () {
    return AgreementService.getAgreementSummary(id);
  }, { operation: 'AGREEMENT_SUMMARY' });
}

