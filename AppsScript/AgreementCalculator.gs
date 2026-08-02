/**
 * @fileoverview Agreement 수량·금액·이행률 계산기.
 */
const AgreementCalculator = Object.freeze({
  /** @param {number} agreementQuantity 약정수량 @param {number} suppliedQuantity 공급수량 @return {Object} 계산 결과 */
  calculateAchievement: function (agreementQuantity, suppliedQuantity) {
    const target = toAgreementNumber_(agreementQuantity);
    const supplied = toAgreementNumber_(suppliedQuantity);
    return {
      agreementQuantity: target,
      suppliedQuantity: supplied,
      achievementRate: target === 0 ? 0 : roundAgreement_(supplied / target * 100),
      remainingQuantity: Math.max(0, target - supplied),
    };
  },

  /** @param {number} agreementQuantity 약정수량 @param {number} suppliedQuantity 공급수량 @return {number} 공급률 */
  calculateSupplyRate: function (agreementQuantity, suppliedQuantity) {
    return this.calculateAchievement(
      agreementQuantity,
      suppliedQuantity
    ).achievementRate;
  },

  /** @param {number} quantity 수량 @param {number} unitPrice 단가 @return {number} 금액 */
  calculateAmount: function (quantity, unitPrice) {
    return toAgreementNumber_(quantity) * toAgreementNumber_(unitPrice);
  },

  /** @param {number} suppliedAmount 공급금액 @param {number=} rate 기금 기준율 @return {number} 기금 기준액 */
  calculateFundBase: function (suppliedAmount, rate) {
    return roundAgreement_(
      toAgreementNumber_(suppliedAmount) * toAgreementNumber_(rate)
    );
  },

  /** @param {number} agreementQuantity 약정수량 @param {number=} expectedRate 예상 공급률 @return {number} 예상공급량 */
  calculateExpectedSupply: function (agreementQuantity, expectedRate) {
    const rate = expectedRate === undefined ? 100 : toAgreementNumber_(expectedRate);
    return roundAgreement_(toAgreementNumber_(agreementQuantity) * rate / 100);
  },
});

function toAgreementNumber_(value) {
  const number = Number(value || 0);
  if (!isFinite(number) || number < 0) {
    throw new ValidationError(
      'Agreement 계산값은 0 이상의 숫자여야 합니다.',
      'AgreementValue',
      { value: value },
      'AGREEMENT_NUMBER_INVALID'
    );
  }
  return number;
}

function roundAgreement_(value) {
  return Math.round(Number(value) * 100) / 100;
}

