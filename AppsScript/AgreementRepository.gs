/**
 * @fileoverview Agreement Master Repository.
 *
 * Spreadsheet 접근은 SheetRepository에만 위임한다.
 */
const AgreementRepository = Object.freeze({
  /** @param {Object=} filters 필터 @return {Array<Object>} Agreement 목록 */
  getAgreement: function (filters) {
    const criteria = filters || {};
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const masters = SheetRepository.findAll(PMS_CONFIG.AGREEMENT_TABLES.MASTER);
    const extensions = SheetRepository.findAll(
      PMS_CONFIG.AGREEMENT_TABLES.EXTENSION
    );
    const extensionMap = {};
    extensions.forEach(function (row) {
      extensionMap[DataTypeManager.normalizeStringKey(row[f.AGREEMENT_ID])] = row;
    });
    const filterNames = Object.keys(criteria).filter(function (name) {
      return criteria[name] !== undefined &&
        criteria[name] !== null && criteria[name] !== '';
    });
    return masters.map(function (master) {
      const id = DataTypeManager.normalizeStringKey(master[f.AGREEMENT_ID]);
      return AgreementExtension.merge(master, extensionMap[id]);
    }).filter(function (row) {
      return filterNames.every(function (name) {
        return normalizeAgreementComparison_(name, row[name]) ===
          normalizeAgreementComparison_(name, criteria[name]);
      });
    });
  },

  /** @param {string} agreementId Agreement ID @return {Object|null} Agreement */
  getAgreementById: function (agreementId) {
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const id = DataTypeManager.normalizeStringKey(agreementId);
    const cached = IndexManager.findByKey(
      HLAS_CONSTANTS.INDEX_TYPE.AGREEMENT,
      id
    );
    const master = cached || SheetRepository.findById(
      PMS_CONFIG.AGREEMENT_TABLES.MASTER,
      id
    );
    if (!master) return null;
    const extension = SheetRepository.findById(
      PMS_CONFIG.AGREEMENT_TABLES.EXTENSION,
      id
    );
    return AgreementExtension.merge(master, extension);
  },

  /** @param {string} producerId Producer ID @return {Array<Object>} 목록 */
  getAgreementByProducer: function (producerId) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.AGREEMENT.PRODUCER_ID] =
      DataTypeManager.normalizeProducerID(producerId);
    return this.getAgreement(filters);
  },

  /** @param {string} productId Product ID @return {Array<Object>} 목록 */
  getAgreementByProduct: function (productId) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.AGREEMENT.PRODUCT_ID] =
      DataTypeManager.normalizeProductID(productId);
    return this.getAgreement(filters);
  },

  /** @param {number|string} year 연도 @return {Array<Object>} 목록 */
  getAgreementByYear: function (year) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.AGREEMENT.AGREEMENT_YEAR] = Number(year);
    return this.getAgreement(filters);
  },

  /** @param {string} status 상태 @return {Array<Object>} 목록 */
  getAgreementByStatus: function (status) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.AGREEMENT.AGREEMENT_STATUS] = status;
    return this.getAgreement(filters);
  },

  /** @param {Object} data Agreement 데이터 @return {Object} 저장 결과 */
  saveAgreement: function (data) {
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const input = normalizeAgreementKeys_(data);
    input[f.AGREEMENT_STATUS] =
      input[f.AGREEMENT_STATUS] || HLAS_CONSTANTS.AGREEMENT_STATUS.DRAFT;
    AgreementValidator.validate(input);
    AgreementValidator.uniqueId(
      input[f.AGREEMENT_ID],
      this.getAgreementById(input[f.AGREEMENT_ID])
    );
    const master = AgreementExtension.extractMaster(input);
    const extension = AgreementExtension.withDefaults(
      AgreementExtension.extractExtension(input),
      input[f.CREATED_BY]
    );
    extension[f.AGREEMENT_ID] = input[f.AGREEMENT_ID];
    SheetRepository.insert(PMS_CONFIG.AGREEMENT_TABLES.MASTER, master);
    try {
      SheetRepository.insert(PMS_CONFIG.AGREEMENT_TABLES.EXTENSION, extension);
    } catch (error) {
      SheetRepository.delete(
        PMS_CONFIG.AGREEMENT_TABLES.MASTER,
        input[f.AGREEMENT_ID]
      );
      throw error;
    }
    refreshAgreementIndex_();
    return this.getAgreementById(input[f.AGREEMENT_ID]);
  },

  /** @param {string} agreementId ID @param {Object} data 변경값 @return {Object} 수정 결과 */
  updateAgreement: function (agreementId, data) {
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const id = DataTypeManager.normalizeStringKey(agreementId);
    const current = this.getAgreementById(id);
    if (!current) {
      throw new NotFoundError(
        'Agreement를 찾을 수 없습니다.',
        f.AGREEMENT_ID,
        { agreementId: id },
        'AGREEMENT_NOT_FOUND'
      );
    }
    const merged = normalizeAgreementKeys_(Object.assign({}, current, data || {}));
    merged[f.AGREEMENT_ID] = id;
    AgreementValidator.validate(merged);
    const audited = AuditManager.updateAudit(merged, merged[f.UPDATED_BY]);
    SheetRepository.update(
      PMS_CONFIG.AGREEMENT_TABLES.MASTER,
      id,
      AgreementExtension.extractMaster(audited)
    );
    SheetRepository.update(
      PMS_CONFIG.AGREEMENT_TABLES.EXTENSION,
      id,
      AgreementExtension.extractExtension(audited)
    );
    refreshAgreementIndex_();
    return this.getAgreementById(id);
  },

  /** @param {string} agreementId ID @param {string=} reason 사유 @return {Object} 삭제 상태 */
  deleteAgreement: function (agreementId, reason) {
    const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
    const current = this.getAgreementById(agreementId);
    if (!current) {
      throw new NotFoundError(
        'Agreement를 찾을 수 없습니다.',
        f.AGREEMENT_ID,
        { agreementId: agreementId },
        'AGREEMENT_NOT_FOUND'
      );
    }
    const deleted = AuditManager.softDelete(
      current,
      current[f.UPDATED_BY],
      reason
    );
    deleted[f.AGREEMENT_STATUS] = HLAS_CONSTANTS.AGREEMENT_STATUS.CANCELLED;
    return this.updateAgreement(agreementId, deleted);
  },
});

function normalizeAgreementKeys_(data) {
  const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
  const result = Object.assign({}, data || {});
  result[f.AGREEMENT_ID] =
    DataTypeManager.normalizeStringKey(result[f.AGREEMENT_ID]);
  result[f.PRODUCER_ID] =
    DataTypeManager.normalizeProducerID(result[f.PRODUCER_ID]);
  result[f.PRODUCT_ID] =
    DataTypeManager.normalizeProductID(result[f.PRODUCT_ID]);
  if (result[f.AGREEMENT_YEAR] !== undefined) {
    result[f.AGREEMENT_YEAR] = Number(result[f.AGREEMENT_YEAR]);
  }
  [
    f.EXPECTED_SUPPLY_DATE,
    f.START_DATE,
    f.END_DATE,
  ].forEach(function (fieldName) {
    const value = result[fieldName];
    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T/.test(value)
    ) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        result[fieldName] = Utilities.formatDate(
          date,
          Session.getScriptTimeZone(),
          'yyyy-MM-dd'
        );
      }
    }
  });
  return result;
}

function normalizeAgreementComparison_(fieldName, value) {
  const f = HLAS_CONSTANTS.FIELD.AGREEMENT;
  if (fieldName === f.PRODUCER_ID) {
    return DataTypeManager.normalizeProducerID(value);
  }
  if (fieldName === f.PRODUCT_ID) {
    return DataTypeManager.normalizeProductID(value);
  }
  if (fieldName === f.AGREEMENT_ID) {
    return DataTypeManager.normalizeStringKey(value);
  }
  return String(value === undefined || value === null ? '' : value);
}

function refreshAgreementIndex_() {
  IndexManager.refreshIndex(
    HLAS_CONSTANTS.INDEX_TYPE.AGREEMENT,
    SheetRepository.findAll(PMS_CONFIG.AGREEMENT_TABLES.MASTER)
  );
}
