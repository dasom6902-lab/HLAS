/**
 * @fileoverview Planning Module 공개 API.
 */

/**
 * 목표를 조회한다.
 *
 * @param {string} targetType 목표 유형
 * @param {Object=} criteria 조회 조건
 * @return {Object} CommonAPI 표준 응답
 */
function getTarget(targetType, criteria) {
  return CommonAPI.execute(function () {
    return TargetService.getTarget(targetType, criteria);
  }, { operation: 'TARGET_GET' });
}

/**
 * 목표를 저장한다.
 *
 * @param {string} targetType 목표 유형
 * @param {Object} data 목표 데이터
 * @return {Object} CommonAPI 표준 응답
 */
function saveTarget(targetType, data) {
  return CommonAPI.execute(function () {
    return TargetService.saveTarget(targetType, data);
  }, { operation: 'TARGET_SAVE' });
}

/**
 * 목표를 수정한다.
 *
 * @param {string} targetType 목표 유형
 * @param {string} targetId Target ID
 * @param {Object} data 수정 데이터
 * @return {Object} CommonAPI 표준 응답
 */
function updateTarget(targetType, targetId, data) {
  return CommonAPI.execute(function () {
    return TargetService.updateTarget(targetType, targetId, data);
  }, { operation: 'TARGET_UPDATE' });
}

/**
 * 목표 대비 실적을 계산한다.
 *
 * @param {number|string} targetAmount 목표 금액
 * @param {number|string} actualAmount 실적 금액
 * @return {Object} CommonAPI 표준 응답
 */
function getAchievement(targetAmount, actualAmount) {
  return CommonAPI.execute(function () {
    return {
      achievementRate: TargetService.calculateAchievementRate(
        targetAmount,
        actualAmount
      ),
      variance: TargetService.calculateVariance(targetAmount, actualAmount),
      progress: TargetService.calculateProgress(targetAmount, actualAmount),
    };
  }, { operation: 'TARGET_ACHIEVEMENT' });
}
