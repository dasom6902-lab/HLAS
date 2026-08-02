/**
 * HLAS Core 공통 입력 검증 모듈.
 *
 * 검증 실패 시 boolean false 대신 표준 ValidationError 또는
 * DuplicateError를 발생시켜 호출 계층에서 일관되게 처리한다.
 */
const Validation = Object.freeze({
  required: function (value, fieldName) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      throw new ValidationError(
        (fieldName || '값') + '은(는) 필수입니다.',
        fieldName || null,
        null,
        'VALIDATION_REQUIRED'
      );
    }
    return true;
  },

  maxLength: function (value, max, fieldName) {
    const text = String(value === null || value === undefined ? '' : value);
    if (text.length > Number(max)) {
      throw new ValidationError(
        (fieldName || '값') + '은(는) 최대 ' + max + '자까지 입력할 수 있습니다.',
        fieldName || null,
        { maxLength: Number(max), actualLength: text.length },
        'VALIDATION_MAX_LENGTH'
      );
    }
    return true;
  },

  minLength: function (value, min, fieldName) {
    const text = String(value === null || value === undefined ? '' : value);
    if (text.length < Number(min)) {
      throw new ValidationError(
        (fieldName || '값') + '은(는) 최소 ' + min + '자 이상이어야 합니다.',
        fieldName || null,
        { minLength: Number(min), actualLength: text.length },
        'VALIDATION_MIN_LENGTH'
      );
    }
    return true;
  },

  uniqueId: function (sheetName, id) {
    this.required(id, 'id');
    if (SheetRepository.findById(sheetName, id)) {
      throw new DuplicateError(
        '이미 사용 중인 ID입니다: ' + id,
        'id',
        { sheetName: sheetName, id: id }
      );
    }
    return true;
  },

  validStatus: function (status, allowedStatuses, fieldName) {
    const statuses = allowedStatuses || [
      'Draft',
      'Analysis',
      'Design',
      'Approved',
      'Development',
      'Testing',
      'Release',
      'Done',
      'Closed',
      '대기',
      '진행중',
      '완료',
      '보류',
      '취소',
    ];

    if (statuses.indexOf(status) === -1) {
      throw new ValidationError(
        '허용되지 않은 상태값입니다: ' + status,
        fieldName || 'status',
        { allowedStatuses: statuses },
        'VALIDATION_STATUS'
      );
    }
    return true;
  },

  validDate: function (value, fieldName) {
    if (value === '' || value === null || value === undefined) {
      return true;
    }

    if (value instanceof Date && !isNaN(value.getTime())) {
      return true;
    }

    const text = String(value).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      throw new ValidationError(
        (fieldName || '날짜') + ' 형식은 yyyy-mm-dd여야 합니다.',
        fieldName || null,
        { value: value },
        'VALIDATION_DATE'
      );
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) {
      throw new ValidationError(
        '유효하지 않은 날짜입니다.',
        fieldName || null,
        { value: value },
        'VALIDATION_DATE'
      );
    }
    return true;
  },

  dateRange: function (startDate, endDate) {
    this.validDate(startDate, 'startDate');
    this.validDate(endDate, 'endDate');

    if (!startDate || !endDate) {
      return true;
    }

    const start = toValidationDate_(startDate);
    const end = toValidationDate_(endDate);

    if (end.getTime() < start.getTime()) {
      throw new ValidationError(
        '종료일은 시작일보다 빠를 수 없습니다.',
        'endDate',
        { startDate: startDate, endDate: endDate },
        'VALIDATION_DATE_RANGE'
      );
    }
    return true;
  },
});

function toValidationDate_(value) {
  if (value instanceof Date) {
    return value;
  }

  const parts = String(value).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

