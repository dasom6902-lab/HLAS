/**
 * @fileoverview HLAS String Key 표준화 도구.
 */

const DataTypeManager = Object.freeze({
  /**
   * ProductID를 선행 0이 보존되는 문자열로 정규화한다.
   *
   * @param {*} value ProductID
   * @param {number=} length 숫자형 ProductID 표준 길이
   * @return {string} 정규화된 ProductID
   */
  normalizeProductID: function (value, length) {
    const text = this.normalizeStringKey(value);
    const targetLength = Number(
      length || PMS_CONFIG.STRING_KEYS.PRODUCT_ID_LENGTH
    );
    if (/^\d+$/.test(text) && text.length < targetLength) {
      return text.padStart(targetLength, '0');
    }
    return text;
  },

  /**
   * ProducerID를 문자열로 정규화한다.
   *
   * @param {*} value ProducerID
   * @return {string} 정규화된 ProducerID
   */
  normalizeProducerID: function (value) {
    return this.normalizeStringKey(value);
  },

  /**
   * Barcode를 문자열로 정규화한다.
   *
   * @param {*} value Barcode
   * @return {string} 정규화된 Barcode
   */
  normalizeBarcode: function (value) {
    return this.normalizeStringKey(value);
  },

  /**
   * 범용 Key를 공백 없는 문자열로 정규화한다.
   *
   * @param {*} value Key 값
   * @return {string} 정규화된 Key
   */
  normalizeStringKey: function (value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  },

  /**
   * 필드명에 맞는 String Key 정규화를 적용한다.
   *
   * @param {string} fieldName 필드명
   * @param {*} value 값
   * @return {*} 정규화된 값
   */
  normalizeField: function (fieldName, value) {
    if (fieldName === 'ProductID' || fieldName === 'ERPProductID') {
      return this.normalizeProductID(value);
    }
    if (fieldName === 'ProducerID') {
      return this.normalizeProducerID(value);
    }
    if (fieldName === 'Barcode') {
      return this.normalizeBarcode(value);
    }
    if (HLAS_CONSTANTS.STRING_KEY_FIELDS.indexOf(fieldName) !== -1) {
      return this.normalizeStringKey(value);
    }
    return value;
  },

  /**
   * 객체의 모든 표준 String Key를 정규화한다.
   *
   * @param {Object} record 입력 객체
   * @return {Object} 정규화된 복사본
   */
  normalizeRecord: function (record) {
    const result = Object.assign({}, record || {});
    HLAS_CONSTANTS.STRING_KEY_FIELDS.forEach(function (fieldName) {
      if (Object.prototype.hasOwnProperty.call(result, fieldName)) {
        result[fieldName] = DataTypeManager.normalizeField(
          fieldName,
          result[fieldName]
        );
      }
    });
    return result;
  },
});
