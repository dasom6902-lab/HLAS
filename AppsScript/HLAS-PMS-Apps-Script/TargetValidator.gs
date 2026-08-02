/**
 * @fileoverview Planning 목표 입력값 및 중복 검증.
 */

const TargetValidator = Object.freeze({
  /**
   * Target Type별 필수값과 금액을 검사한다.
   *
   * @param {string} targetType 목표 유형
   * @param {Object} data 목표 데이터
   * @return {boolean} 검증 성공 여부
   */
  validate: function (targetType, data) {
    const field = HLAS_CONSTANTS.FIELD.TARGET;
    const type = HLAS_CONSTANTS.TARGET_TYPE;
    const input = data || {};

    PlanningRegistry.get(targetType);
    Validation.required(input[field.YEAR], field.YEAR);
    Validation.required(input[field.TARGET_AMOUNT], field.TARGET_AMOUNT);
    this.nonNegativeAmount(input[field.TARGET_AMOUNT]);

    if (targetType === type.ANNUAL || targetType === type.MONTHLY) {
      Validation.required(input[field.CATEGORY], field.CATEGORY);
      Validation.validStatus(
        input[field.CATEGORY],
        HLAS_CONSTANTS.TARGET_CATEGORY.VALUES,
        field.CATEGORY
      );
    }
    if (targetType !== type.ANNUAL) {
      this.validMonth(input[field.MONTH]);
    }
    if (targetType === type.SUPPLY) {
      Validation.required(input[field.ROUTE_CODE], field.ROUTE_CODE);
    }
    if (targetType === type.STORE) {
      Validation.required(input[field.STORE_CODE], field.STORE_CODE);
    }
    if (input[field.STATUS]) {
      Validation.validStatus(
        input[field.STATUS],
        HLAS_CONSTANTS.TARGET_STATUS.VALUES,
        field.STATUS
      );
    }
    return true;
  },

  /**
   * 목표 금액이 음수가 아닌지 검사한다.
   *
   * @param {number|string} amount 목표 금액
   * @return {boolean} 검증 성공 여부
   */
  nonNegativeAmount: function (amount) {
    const number = Number(amount);
    if (!isFinite(number) || number < HLAS_CONSTANTS.TARGET.ZERO_AMOUNT) {
      throw new ValidationError(
        '목표 금액은 0 이상의 숫자여야 합니다.',
        HLAS_CONSTANTS.FIELD.TARGET.TARGET_AMOUNT,
        { value: amount },
        'TARGET_AMOUNT_INVALID'
      );
    }
    return true;
  },

  /**
   * 월 값이 1~12 범위인지 검사한다.
   *
   * @param {number|string} month 월
   * @return {boolean} 검증 성공 여부
   */
  validMonth: function (month) {
    const number = Number(month);
    if (
      !Number.isInteger(number) ||
      number < HLAS_CONSTANTS.TARGET.MIN_MONTH ||
      number > HLAS_CONSTANTS.TARGET.MAX_MONTH
    ) {
      throw new ValidationError(
        '월은 1부터 12 사이의 정수여야 합니다.',
        HLAS_CONSTANTS.FIELD.TARGET.MONTH,
        { value: month },
        'TARGET_MONTH_INVALID'
      );
    }
    return true;
  },

  /**
   * 동일한 연도·월·구분 목표가 존재하는지 검사한다.
   *
   * @param {string} targetType 목표 유형
   * @param {Object} data 목표 데이터
   * @param {Array<Object>} existingRows 기존 목표 목록
   * @param {string=} excludeId 수정 시 제외할 Target ID
   * @return {boolean} 중복 없음
   */
  unique: function (targetType, data, existingRows, excludeId) {
    const definition = PlanningRegistry.get(targetType);
    const field = HLAS_CONSTANTS.FIELD.TARGET;
    const duplicate = (existingRows || []).some(function (row) {
      if (excludeId && String(row[field.TARGET_ID]) === String(excludeId)) {
        return false;
      }
      return definition.uniqueFields.every(function (name) {
        return String(row[name]) === String(data[name]);
      });
    });
    if (duplicate) {
      throw new DuplicateError(
        '동일한 기준의 목표가 이미 존재합니다.',
        definition.uniqueFields.join(','),
        { targetType: targetType, fields: definition.uniqueFields },
        'TARGET_DUPLICATE'
      );
    }
    return true;
  },
});
