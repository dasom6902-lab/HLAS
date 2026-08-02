/**
 * @fileoverview CSV/XLSX/Google Sheet 입력을 표준 레코드로 변환한다.
 */

const ImportMapper = Object.freeze({
  /**
   * Import Source를 객체 배열로 변환한다.
   *
   * XLSX는 외부 변환 단계에서 추출한 records 배열을 입력받는다.
   *
   * @param {Object} source format, csv, values 또는 records
   * @return {Array<Object>} 원본 레코드
   */
  parse: function (source) {
    const input = source || {};
    const format = String(input.format || '').trim().toUpperCase();
    Validation.validStatus(
      format,
      PMS_CONFIG.IMPORT.SUPPORTED_FORMATS,
      'format'
    );
    if (format === 'CSV') return this.parseCsv(input.csv || '');
    if (format === 'XLSX') {
      if (!Array.isArray(input.records)) {
        throw new ValidationError(
          'XLSX는 변환된 records 배열이 필요합니다.',
          'records',
          null,
          'XLSX_RECORDS_REQUIRED'
        );
      }
      return input.records.map(function (record) {
        return Object.assign({}, record);
      });
    }
    if (Array.isArray(input.records)) {
      return input.records.map(function (record) {
        return Object.assign({}, record);
      });
    }
    return this.fromValues(input.values || []);
  },

  /**
   * Header가 포함된 CSV 문자열을 객체 배열로 변환한다.
   *
   * @param {string} csv CSV 문자열
   * @return {Array<Object>} 레코드
   */
  parseCsv: function (csv) {
    Validation.required(csv, 'csv');
    return this.fromValues(Utilities.parseCsv(String(csv)));
  },

  /**
   * 2차원 배열의 첫 행을 Header로 사용해 객체 배열로 변환한다.
   *
   * @param {Array<Array<*>>} values 표 데이터
   * @return {Array<Object>} 레코드
   */
  fromValues: function (values) {
    if (!Array.isArray(values) || values.length < 1) return [];
    const headers = values[0].map(function (header) {
      return String(header || '').trim();
    });
    return values.slice(1).filter(function (row) {
      return row.some(function (value) {
        return value !== '' && value !== null && value !== undefined;
      });
    }).map(function (row) {
      const record = {};
      headers.forEach(function (header, index) {
        if (header) record[header] = row[index];
      });
      return record;
    });
  },

  /**
   * Column Mapping과 자료형 변환을 적용한다.
   *
   * @param {Array<Object>} records 원본 레코드
   * @param {Object<string,string>=} columnMapping 원본→표준 필드
   * @param {Object<string,string>=} dataTypes 표준 필드→자료형
   * @return {Array<Object>} 변환 레코드
   */
  map: function (records, columnMapping, dataTypes) {
    const mapping = columnMapping || {};
    const types = dataTypes || {};
    return (records || []).map(function (source) {
      const target = {};
      Object.keys(source).forEach(function (sourceField) {
        const targetField = mapping[sourceField] || sourceField;
        target[targetField] = convertImportValue_(
          DataTypeManager.normalizeField(targetField, source[sourceField]),
          types[targetField]
        );
      });
      return DataTypeManager.normalizeRecord(target);
    });
  },
});

function convertImportValue_(value, type) {
  const normalizedType = String(type || 'STRING').toUpperCase();
  if (normalizedType === 'NUMBER') {
    const numberValue = Number(String(value).replace(/,/g, ''));
    if (!isFinite(numberValue)) {
      throw new ValidationError(
        '숫자로 변환할 수 없습니다.',
        'value',
        { value: value },
        'IMPORT_NUMBER_INVALID'
      );
    }
    return numberValue;
  }
  if (normalizedType === 'BOOLEAN') {
    return ['TRUE', 'Y', '1'].indexOf(String(value).toUpperCase()) !== -1;
  }
  if (normalizedType === 'DATE') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError(
        '날짜로 변환할 수 없습니다.',
        'value',
        { value: value },
        'IMPORT_DATE_INVALID'
      );
    }
    return date;
  }
  return DataTypeManager.normalizeStringKey(value);
}
