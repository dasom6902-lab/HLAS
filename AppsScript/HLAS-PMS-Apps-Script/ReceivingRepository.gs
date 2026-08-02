/**
 * @fileoverview Receiving Transaction Repository.
 *
 * PMS 시트 접근은 SheetRepository, 운영 Product 참조는
 * MasterDataRepository를 통해서만 수행한다.
 */

const ReceivingRepository = Object.freeze({
  /**
   * 조건에 맞는 Receiving 목록을 반환한다.
   *
   * @param {Object=} filters 필드 기반 필터
   * @return {Array<Object>} Receiving 목록
   */
  getReceiving: function (filters) {
    const criteria = filters || {};
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const masters = SheetRepository.findAll(
      PMS_CONFIG.RECEIVING_TABLES.MASTER
    );
    const extensions = SheetRepository.findAll(
      PMS_CONFIG.RECEIVING_TABLES.EXTENSION
    );
    const productIdMap = buildReceivingProductIdMap_();
    const extensionMap = {};
    extensions.forEach(function (extension) {
      extensionMap[String(extension[field.RECEIVING_ID])] = extension;
    });
    const filterFields = Object.keys(criteria).filter(function (name) {
      return criteria[name] !== undefined &&
        criteria[name] !== null &&
        criteria[name] !== '';
    });
    return masters.map(function (master) {
      return canonicalizeReceivingProduct_(
        ReceivingExtension.merge(
        master,
        extensionMap[String(master[field.RECEIVING_ID])]
        ),
        productIdMap
      );
    }).filter(function (receiving) {
      return filterFields.every(function (name) {
        return String(receiving[name]) === String(criteria[name]);
      });
    });
  },

  /**
   * ReceivingID로 단건을 조회한다.
   *
   * @param {string} receivingId Receiving ID
   * @return {Object|null} Receiving 또는 null
   */
  getReceivingById: function (receivingId) {
    const master = SheetRepository.findById(
      PMS_CONFIG.RECEIVING_TABLES.MASTER,
      receivingId
    );
    if (!master) return null;
    const extension = SheetRepository.findById(
      PMS_CONFIG.RECEIVING_TABLES.EXTENSION,
      receivingId
    );
    return canonicalizeReceivingProduct_(
      ReceivingExtension.merge(master, extension),
      buildReceivingProductIdMap_()
    );
  },

  /**
   * 입고일별 Receiving을 조회한다.
   *
   * @param {Date|string} receivingDate 입고일
   * @return {Array<Object>} Receiving 목록
   */
  getReceivingByDate: function (receivingDate) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    return this.getReceiving().filter(function (receiving) {
      return normalizeReceivingDate_(receiving[field.RECEIVING_DATE]) ===
        normalizeReceivingDate_(receivingDate);
    });
  },

  /**
   * 생산자별 Receiving을 조회한다.
   *
   * @param {string} producerId Producer ID
   * @return {Array<Object>} Receiving 목록
   */
  getReceivingByProducer: function (producerId) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.RECEIVING.PRODUCER_ID] = producerId;
    return this.getReceiving(filters);
  },

  /**
   * 품목별 Receiving을 조회한다.
   *
   * @param {string} productId Product ID
   * @return {Array<Object>} Receiving 목록
   */
  getReceivingByProduct: function (productId) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.RECEIVING.PRODUCT_ID] = productId;
    return this.getReceiving(filters);
  },

  /**
   * 센터별 Receiving을 조회한다.
   *
   * @param {string} centerCode 센터코드
   * @return {Array<Object>} Receiving 목록
   */
  getReceivingByCenter: function (centerCode) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.RECEIVING.CENTER_CODE] = centerCode;
    return this.getReceiving(filters);
  },

  /**
   * 상태별 Receiving을 조회한다.
   *
   * @param {string} status Receiving 상태
   * @return {Array<Object>} Receiving 목록
   */
  getReceivingByStatus: function (status) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.RECEIVING.STATUS] = status;
    return this.getReceiving(filters);
  },

  /**
   * 운영 Product Master에서 ProductID로 단건을 조회한다.
   *
   * @param {string} productId Product ID
   * @return {Object|null} Product 또는 null
   */
  getProductById: function (productId) {
    const snapshot = MasterDataRepository.readMasterData();
    const itemField = HLAS_CONSTANTS.FIELD.MASTER_DATA.ITEM_CODE;
    const target = String(productId || '').trim();
    return snapshot.records.find(function (record) {
      return String(record[itemField] || '').trim() === target;
    }) || null;
  },

  /**
   * Receiving 표준/확장 레코드를 저장한다.
   *
   * @param {Object} data Receiving 데이터
   * @return {Object} 저장된 Receiving
   */
  saveReceiving: function (data) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const input = Object.assign({}, data || {});
    input[field.RECEIVING_TYPE] =
      input[field.RECEIVING_TYPE] ||
      HLAS_CONSTANTS.RECEIVING_TYPE.RECEIVING;
    input[field.STATUS] =
      input[field.STATUS] || HLAS_CONSTANTS.RECEIVING_STATUS.REGISTERED;
    input[field.QUANTITY] = Number(
      input[field.QUANTITY] || HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
    );
    input[field.UNIT_PRICE] = Number(
      input[field.UNIT_PRICE] || HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
    );
    input[field.RETURN_QUANTITY] = Number(
      input[field.RETURN_QUANTITY] ||
      HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
    );
    input[field.AMOUNT] = Number(
      input[field.AMOUNT] || HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
    );
    input[field.RETURN_AMOUNT] = Number(
      input[field.RETURN_AMOUNT] ||
      HLAS_CONSTANTS.RECEIVING.ZERO_VALUE
    );
    ReceivingValidator.validate(input);
    ReceivingValidator.uniqueId(
      input[field.RECEIVING_ID],
      this.getReceivingById(input[field.RECEIVING_ID])
    );

    const master = ReceivingExtension.extractMaster(input);
    const extension = ReceivingExtension.withDefaults(
      ReceivingExtension.extractExtension(input)
    );
    extension[field.RECEIVING_ID] = input[field.RECEIVING_ID];

    SheetRepository.insert(PMS_CONFIG.RECEIVING_TABLES.MASTER, master);
    try {
      SheetRepository.insert(
        PMS_CONFIG.RECEIVING_TABLES.EXTENSION,
        extension
      );
    } catch (error) {
      SheetRepository.delete(
        PMS_CONFIG.RECEIVING_TABLES.MASTER,
        input[field.RECEIVING_ID]
      );
      throw error;
    }
    return this.getReceivingById(input[field.RECEIVING_ID]);
  },

  /**
   * Receiving을 수정한다. ProducerID와 ProductID는 변경할 수 없다.
   *
   * @param {string} receivingId Receiving ID
   * @param {Object} data 수정 데이터
   * @return {Object} 수정된 Receiving
   */
  updateReceiving: function (receivingId, data) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const current = this.getReceivingById(receivingId);
    if (!current) {
      throw new NotFoundError(
        'Receiving을 찾을 수 없습니다.',
        field.RECEIVING_ID,
        { receivingId: receivingId },
        'RECEIVING_NOT_FOUND'
      );
    }
    const changes = data || {};
    validateImmutableReceivingFk_(
      field.PRODUCER_ID,
      current[field.PRODUCER_ID],
      changes[field.PRODUCER_ID]
    );
    validateImmutableReceivingFk_(
      field.PRODUCT_ID,
      current[field.PRODUCT_ID],
      changes[field.PRODUCT_ID]
    );
    const merged = Object.assign({}, current, changes);
    merged[field.RECEIVING_ID] = receivingId;
    merged[field.PRODUCER_ID] = current[field.PRODUCER_ID];
    merged[field.PRODUCT_ID] = current[field.PRODUCT_ID];
    merged[field.UPDATED_AT] = new Date();
    ReceivingValidator.validate(merged);

    SheetRepository.update(
      PMS_CONFIG.RECEIVING_TABLES.MASTER,
      receivingId,
      ReceivingExtension.extractMaster(merged)
    );
    SheetRepository.update(
      PMS_CONFIG.RECEIVING_TABLES.EXTENSION,
      receivingId,
      ReceivingExtension.extractExtension(merged)
    );
    return this.getReceivingById(receivingId);
  },

  /**
   * Receiving을 참조 보존형 Soft Delete 상태로 변경한다.
   *
   * @param {string} receivingId Receiving ID
   * @return {Object} 삭제 상태 Receiving
   */
  deleteReceiving: function (receivingId) {
    const field = HLAS_CONSTANTS.FIELD.RECEIVING;
    const changes = {};
    changes[field.STATUS] = HLAS_CONSTANTS.RECEIVING_STATUS.DELETED;
    changes[field.IS_ACTIVE] = HLAS_CONSTANTS.RECEIVING.BOOLEAN_FALSE;
    changes[field.DELETED_AT] = new Date();
    return this.updateReceiving(receivingId, changes);
  },
});

function normalizeReceivingDate_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}

function validateImmutableReceivingFk_(fieldName, current, requested) {
  if (requested !== undefined && requested !== null &&
      requested !== '' && String(requested) !== String(current)) {
    throw new ValidationError(
      fieldName + '는 등록 후 변경할 수 없습니다.',
      fieldName,
      { current: current, requested: requested },
      'RECEIVING_IMMUTABLE_FK'
    );
  }
}

function buildReceivingProductIdMap_() {
  const itemField = HLAS_CONSTANTS.FIELD.MASTER_DATA.ITEM_CODE;
  const map = {};
  MasterDataRepository.readMasterData().records.forEach(function (record) {
    const canonical = String(record[itemField] || '').trim();
    if (canonical) {
      map[normalizeReceivingProductKey_(canonical)] = canonical;
    }
  });
  return map;
}

function canonicalizeReceivingProduct_(receiving, productIdMap) {
  const field = HLAS_CONSTANTS.FIELD.RECEIVING;
  const record = Object.assign({}, receiving || {});
  const key = normalizeReceivingProductKey_(record[field.PRODUCT_ID]);
  if (productIdMap[key]) {
    record[field.PRODUCT_ID] = productIdMap[key];
  }
  return record;
}

function normalizeReceivingProductKey_(productId) {
  const value = String(productId === null || productId === undefined
    ? ''
    : productId).trim();
  if (/^\d+$/.test(value)) {
    return String(Number(value));
  }
  return value.toUpperCase();
}
