/**
 * @fileoverview Agreement Domain 비즈니스 Service.
 */
const AgreementService = Object.freeze({
  /** @param {Object} data 등록 데이터 @return {Object} Agreement */
  registerAgreement: function (data) {
    return AgreementRepository.saveAgreement(data);
  },

  /** @param {string} id ID @param {Object} data 변경값 @return {Object} Agreement */
  changeAgreement: function (id, data) {
    return AgreementRepository.updateAgreement(id, data);
  },

  /** @param {string} id ID @return {Object} 종료 Agreement */
  closeAgreement: function (id) {
    const changes = {};
    changes[HLAS_CONSTANTS.FIELD.AGREEMENT.AGREEMENT_STATUS] =
      HLAS_CONSTANTS.AGREEMENT_STATUS.CLOSED;
    return AgreementRepository.updateAgreement(id, changes);
  },

  /** @param {string|Object} agreement Agreement 또는 ID @return {number} 이행률 */
  calculateAchievementRate: function (agreement) {
    const context = getAgreementSupplyContext_(agreement);
    return AgreementCalculator.calculateSupplyRate(
      context.agreement[HLAS_CONSTANTS.FIELD.AGREEMENT.AGREEMENT_QUANTITY],
      context.suppliedQuantity
    );
  },

  /** @param {string|Object} agreement Agreement 또는 ID @return {number} 잔여수량 */
  calculateRemainingQuantity: function (agreement) {
    const context = getAgreementSupplyContext_(agreement);
    return AgreementCalculator.calculateAchievement(
      context.agreement[HLAS_CONSTANTS.FIELD.AGREEMENT.AGREEMENT_QUANTITY],
      context.suppliedQuantity
    ).remainingQuantity;
  },

  /** @param {string|Object} agreement Agreement 또는 ID @return {number} 잔여금액 */
  calculateRemainingAmount: function (agreement) {
    const context = getAgreementSupplyContext_(agreement);
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const quantity = Number(context.agreement[f.AGREEMENT_QUANTITY] || 0);
    const amount = Number(context.agreement[f.AGREEMENT_AMOUNT] || 0);
    const remaining = AgreementCalculator.calculateAchievement(
      quantity,
      context.suppliedQuantity
    ).remainingQuantity;
    return quantity === 0 ? 0 : Math.round(amount * remaining / quantity * 100) / 100;
  },

  /** @param {string|Object} agreement Agreement 또는 ID @return {Object} 요약 */
  getAgreementSummary: function (agreement) {
    const context = getAgreementSupplyContext_(agreement);
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const achievement = AgreementCalculator.calculateAchievement(
      context.agreement[f.AGREEMENT_QUANTITY],
      context.suppliedQuantity
    );
    return Object.assign({}, achievement, {
      agreementId: context.agreement[f.AGREEMENT_ID],
      agreementAmount: Number(context.agreement[f.AGREEMENT_AMOUNT] || 0),
      suppliedAmount: context.suppliedAmount,
      remainingAmount: this.calculateRemainingAmount(context.agreement),
      fundBase: AgreementCalculator.calculateFundBase(
        context.suppliedAmount,
        context.agreement[f.FUND_APPLICABLE] ? 1 : 0
      ),
    });
  },
});

function getAgreementSupplyContext_(agreement) {
  const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
  const r = HLAS_CONSTANTS.FIELD.RECEIVING;
  const row = typeof agreement === 'object'
    ? agreement
    : AgreementRepository.getAgreementById(agreement);
  if (!row) {
    throw new NotFoundError(
      'Agreement를 찾을 수 없습니다.',
      f.AGREEMENT_ID,
      { agreement: agreement },
      'AGREEMENT_NOT_FOUND'
    );
  }
  const producerId = DataTypeManager.normalizeProducerID(row[f.PRODUCER_ID]);
  const productId = DataTypeManager.normalizeProductID(row[f.PRODUCT_ID]);
  const year = Number(row[f.AGREEMENT_YEAR]);
  let suppliedQuantity = 0;
  let suppliedAmount = 0;
  ReceivingRepository.getReceivingByProducer(producerId).forEach(function (item) {
    const itemProduct = DataTypeManager.normalizeProductID(item[r.PRODUCT_ID]);
    const itemYear = new Date(item[r.RECEIVING_DATE]).getFullYear();
    if (itemProduct !== productId || itemYear !== year ||
        item[r.IS_ACTIVE] === false) return;
    suppliedQuantity += Number(item[r.QUANTITY] || 0) -
      Number(item[r.RETURN_QUANTITY] || 0);
    suppliedAmount += Number(item[r.AMOUNT] || 0) -
      Number(item[r.RETURN_AMOUNT] || 0);
  });
  return {
    agreement: row,
    suppliedQuantity: Math.max(0, suppliedQuantity),
    suppliedAmount: Math.max(0, suppliedAmount),
  };
}

