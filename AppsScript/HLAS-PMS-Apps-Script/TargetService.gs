/**
 * @fileoverview Planning 목표 계산 및 업무 Service.
 */

const TargetService = Object.freeze({
  /**
   * 목표 달성률을 계산한다.
   *
   * @param {number|string} targetAmount 목표 금액
   * @param {number|string} actualAmount 실적 금액
   * @return {number} 달성률(%)
   */
  calculateAchievementRate: function (targetAmount, actualAmount) {
    TargetValidator.nonNegativeAmount(targetAmount);
    TargetValidator.nonNegativeAmount(actualAmount);
    const target = Number(targetAmount);
    const actual = Number(actualAmount);
    if (target === HLAS_CONSTANTS.TARGET.ZERO_AMOUNT) {
      return actual === HLAS_CONSTANTS.TARGET.ZERO_AMOUNT
        ? HLAS_CONSTANTS.TARGET.ZERO_AMOUNT
        : HLAS_CONSTANTS.TARGET.RATE_MULTIPLIER;
    }
    return roundTargetRate_(
      actual / target * HLAS_CONSTANTS.TARGET.RATE_MULTIPLIER
    );
  },

  /**
   * 실적과 목표의 차이를 계산한다.
   *
   * @param {number|string} targetAmount 목표 금액
   * @param {number|string} actualAmount 실적 금액
   * @return {number} 실적 - 목표
   */
  calculateVariance: function (targetAmount, actualAmount) {
    TargetValidator.nonNegativeAmount(targetAmount);
    TargetValidator.nonNegativeAmount(actualAmount);
    return Number(actualAmount) - Number(targetAmount);
  },

  /**
   * 목표 진행률을 계산한다.
   *
   * @param {number|string} targetAmount 목표 금액
   * @param {number|string} actualAmount 실적 금액
   * @return {number} 진행률(%)
   */
  calculateProgress: function (targetAmount, actualAmount) {
    return this.calculateAchievementRate(targetAmount, actualAmount);
  },

  /**
   * 월별 목표 목록과 월별 실적을 결합하여 달성 결과를 계산한다.
   *
   * @param {Array<Object>} targets 월별 목표
   * @param {Object<number,number>} actualByMonth 월별 실적 Map
   * @return {Array<Object>} 월별 달성 결과
   */
  calculateMonthlyAchievement: function (targets, actualByMonth) {
    const field = HLAS_CONSTANTS.FIELD.TARGET;
    const actuals = actualByMonth || {};
    return (targets || []).map(function (target) {
      const month = Number(target[field.MONTH]);
      const targetAmount = Number(target[field.TARGET_AMOUNT]);
      const actualAmount = Number(actuals[month] || HLAS_CONSTANTS.TARGET.ZERO_AMOUNT);
      return {
        month: month,
        targetAmount: targetAmount,
        actualAmount: actualAmount,
        achievementRate: TargetService.calculateAchievementRate(
          targetAmount,
          actualAmount
        ),
        variance: TargetService.calculateVariance(targetAmount, actualAmount),
      };
    });
  },

  /**
   * 목표를 조회한다.
   *
   * @param {string} targetType 목표 유형
   * @param {Object=} criteria 조회 조건
   * @return {Array<Object>} 목표 목록
   */
  getTarget: function (targetType, criteria) {
    return TargetRepository.findTargets(targetType, criteria || {});
  },

  /**
   * 목표를 저장한다.
   *
   * @param {string} targetType 목표 유형
   * @param {Object} data 목표 데이터
   * @return {Object} 저장된 목표
   */
  saveTarget: function (targetType, data) {
    return TargetRepository.saveTarget(targetType, data);
  },

  /**
   * 목표를 수정한다.
   *
   * @param {string} targetType 목표 유형
   * @param {string} targetId Target ID
   * @param {Object} data 수정 데이터
   * @return {Object} 수정된 목표
   */
  updateTarget: function (targetType, targetId, data) {
    return TargetRepository.updateTarget(targetType, targetId, data);
  },
});

function roundTargetRate_(value) {
  return Math.round(Number(value) * HLAS_CONSTANTS.TARGET.RATE_MULTIPLIER) /
    HLAS_CONSTANTS.TARGET.RATE_MULTIPLIER;
}
