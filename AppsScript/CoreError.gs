/**
 * HLAS Core에서 사용하는 표준 오류의 최상위 클래스.
 *
 * 모든 오류는 code, message, field, details를 동일한 구조로 제공한다.
 */
class CoreError extends Error {
  constructor(code, message, field, details) {
    super(message || '오류가 발생했습니다.');
    this.name = 'CoreError';
    this.code = code || 'INTERNAL_ERROR';
    this.field = field || null;
    this.details = details || null;
  }

  /**
   * HTML 또는 API 응답에 안전하게 포함할 수 있는 일반 객체로 변환한다.
   */
  toObject() {
    return {
      code: this.code,
      message: this.message,
      field: this.field,
      details: this.details,
    };
  }
}

/**
 * 입력값 검증 실패 오류.
 */
class ValidationError extends CoreError {
  constructor(message, field, details, code) {
    super(code || 'VALIDATION_ERROR', message, field, details);
    this.name = 'ValidationError';
  }
}

/**
 * 조회 대상 또는 필수 시트를 찾지 못한 경우의 오류.
 */
class NotFoundError extends CoreError {
  constructor(message, field, details, code) {
    super(code || 'ENTITY_NOT_FOUND', message, field, details);
    this.name = 'NotFoundError';
  }
}

/**
 * ID 또는 데이터 중복 오류.
 */
class DuplicateError extends CoreError {
  constructor(message, field, details, code) {
    super(code || 'DUPLICATE_ID', message, field, details);
    this.name = 'DuplicateError';
  }
}

/**
 * 외부에 세부 구현 내용을 노출하지 않을 시스템 오류.
 */
class SystemError extends CoreError {
  constructor(message, details, code) {
    super(code || 'INTERNAL_ERROR', message || '시스템 오류가 발생했습니다.', null, details);
    this.name = 'SystemError';
  }
}

