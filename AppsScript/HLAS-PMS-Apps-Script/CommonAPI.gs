/**
 * @fileoverview HLAS 공통 API 응답, 실행, 변경 로그 처리.
 */

const CommonAPI = Object.freeze({
  /**
   * 성공 응답을 생성한다.
   *
   * @param {*} data 반환 데이터
   * @param {Object=} meta 메타데이터
   * @return {Object} 표준 성공 응답
   */
  success: function (data, meta) {
    return {
      ok: true,
      data: data === undefined ? null : data,
      error: null,
      meta: buildApiMeta_(meta),
    };
  },

  /**
   * 오류 응답을 생성한다.
   *
   * @param {Error|CoreError|Object} error 오류
   * @param {Object=} meta 메타데이터
   * @return {Object} 표준 오류 응답
   */
  error: function (error, meta) {
    return {
      ok: false,
      data: null,
      error: normalizeApiError_(error),
      meta: buildApiMeta_(meta),
    };
  },

  /**
   * 검증 함수를 실행한다.
   *
   * @param {Function} validator 검증 함수
   * @return {boolean} 검증 성공 여부
   */
  validate: function (validator) {
    if (typeof validator !== 'function') {
      throw new ValidationError(
        '검증 함수가 필요합니다.',
        'validator',
        null,
        'VALIDATION_REQUIRED'
      );
    }
    validator();
    return true;
  },

  /**
   * CHANGELOG를 Repository를 통해 기록한다.
   *
   * @param {Object} logData 로그 입력값
   * @return {Object} 저장된 로그
   */
  writeLog: function (logData) {
    const data = logData || {};
    const fields = HLAS_CONSTANTS.FIELD.CHANGELOG;
    const record = {};

    record[fields.LOG_ID] = data.logId || createCommonLogId_();
    record[fields.VERSION] =
      data.version ||
      (typeof PMS_CONFIG !== 'undefined' ? PMS_CONFIG.version : '');
    record[fields.CHANGED_AT] =
      data.timestamp instanceof Date ? data.timestamp : new Date();
    record[fields.CHANGE_TYPE] = data.changeType || 'SYSTEM';
    record[fields.MESSAGE] = data.message || '';
    record[fields.RELATED_ID] = data.relatedId || '';
    record[fields.ACTOR] =
      data.actor || Session.getActiveUser().getEmail() || 'UNKNOWN';
    record[fields.RESULT] =
      data.result || HLAS_CONSTANTS.LOG_RESULT.SUCCESS;

    return SheetRepository.insert(HLAS_CONSTANTS.SHEETS.CHANGELOG, record);
  },

  /**
   * 실행 함수를 표준 응답으로 감싼다.
   *
   * @param {Function} handler 실행 함수
   * @param {Object=} meta 메타데이터
   * @return {Object} CommonAPI 표준 응답
   */
  execute: function (handler, meta) {
    try {
      if (typeof handler !== 'function') {
        throw new ValidationError(
          '실행 함수가 필요합니다.',
          'handler',
          null,
          'VALIDATION_REQUIRED'
        );
      }
      return this.success(handler(), meta);
    } catch (error) {
      return this.error(error, meta);
    }
  },
});

function buildApiMeta_(meta) {
  const input = meta || {};
  return {
    requestId: input.requestId || createCommonRequestId_(),
    timestamp: new Date().toISOString(),
    version:
      input.version ||
      (typeof PMS_CONFIG !== 'undefined' ? PMS_CONFIG.version : ''),
  };
}

function normalizeApiError_(error) {
  if (error instanceof CoreError) {
    return error.toObject();
  }
  return {
    code: 'INTERNAL_ERROR',
    message:
      error && error.message
        ? error.message
        : '시스템 오류가 발생했습니다.',
    field: null,
    details: null,
  };
}

function createCommonRequestId_() {
  return 'REQ-' + Utilities.getUuid();
}

function createCommonLogId_() {
  return 'LOG-' + Utilities.getUuid();
}
