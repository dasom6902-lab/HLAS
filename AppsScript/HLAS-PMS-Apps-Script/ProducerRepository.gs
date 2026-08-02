/**
 * @fileoverview Producer Master Repository.
 *
 * 모든 시트 접근은 SheetRepository를 통해 수행한다.
 */

const ProducerRepository = Object.freeze({
  /**
   * 조건에 맞는 Producer 목록을 반환한다.
   *
   * @param {Object=} filters 필드 기반 필터
   * @return {Array<Object>} Producer 목록
   */
  getProducer: function (filters) {
    const criteria = filters || {};
    const masterRows = SheetRepository.findAll(PMS_CONFIG.PRODUCER_TABLES.MASTER);
    const extensionRows = SheetRepository.findAll(
      PMS_CONFIG.PRODUCER_TABLES.EXTENSION
    );
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const extensionMap = {};
    extensionRows.forEach(function (extension) {
      extensionMap[String(extension[field.PRODUCER_ID])] = extension;
    });
    const filterFields = Object.keys(criteria).filter(function (name) {
      return criteria[name] !== undefined &&
        criteria[name] !== null &&
        criteria[name] !== '';
    });
    return masterRows
      .map(function (master) {
        return ProducerExtension.merge(
          master,
          extensionMap[String(master[field.PRODUCER_ID])]
        );
      })
      .filter(function (producer) {
        return filterFields.every(function (name) {
          return String(producer[name]) === String(criteria[name]);
        });
      });
  },

  /**
   * ProducerID로 단건을 조회한다.
   *
   * @param {string} producerId Producer ID
   * @return {Object|null} Producer 또는 null
   */
  getProducerById: function (producerId) {
    const master = SheetRepository.findById(
      PMS_CONFIG.PRODUCER_TABLES.MASTER,
      producerId
    );
    if (!master) return null;
    const extension = SheetRepository.findById(
      PMS_CONFIG.PRODUCER_TABLES.EXTENSION,
      producerId
    );
    return ProducerExtension.merge(master, extension);
  },

  /**
   * 지역별 Producer를 조회한다.
   *
   * @param {string} region 지역
   * @return {Array<Object>} Producer 목록
   */
  getProducerByRegion: function (region) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.PRODUCER.REGION] = region;
    return this.getProducer(filters);
  },

  /**
   * 공동체별 Producer를 조회한다.
   *
   * @param {string} community 공동체
   * @return {Array<Object>} Producer 목록
   */
  getProducerByCommunity: function (community) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.PRODUCER.COMMUNITY] = community;
    return this.getProducer(filters);
  },

  /**
   * 거래상태별 Producer를 조회한다.
   *
   * @param {string} status 거래상태
   * @return {Array<Object>} Producer 목록
   */
  getProducerByStatus: function (status) {
    const filters = {};
    filters[HLAS_CONSTANTS.FIELD.PRODUCER.TRADE_STATUS] = status;
    return this.getProducer(filters);
  },

  /**
   * Producer Master와 Extension을 함께 저장한다.
   *
   * @param {Object} data Producer 데이터
   * @return {Object} 저장된 Producer
   */
  saveProducer: function (data) {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const input = Object.assign({}, data || {});
    input[field.PRODUCER_STATUS] =
      input[field.PRODUCER_STATUS] || HLAS_CONSTANTS.PRODUCER_STATUS.ACTIVE;
    ProducerValidator.validate(input);
    ProducerValidator.uniqueId(
      input[field.PRODUCER_ID],
      this.getProducerById(input[field.PRODUCER_ID])
    );
    const master = ProducerExtension.extractMaster(input);
    const extension = ProducerExtension.withDefaults(
      ProducerExtension.extractExtension(input)
    );
    extension[field.PRODUCER_ID] = input[field.PRODUCER_ID];

    SheetRepository.insert(PMS_CONFIG.PRODUCER_TABLES.MASTER, master);
    try {
      SheetRepository.insert(PMS_CONFIG.PRODUCER_TABLES.EXTENSION, extension);
    } catch (error) {
      SheetRepository.delete(
        PMS_CONFIG.PRODUCER_TABLES.MASTER,
        input[field.PRODUCER_ID]
      );
      throw error;
    }
    return this.getProducerById(input[field.PRODUCER_ID]);
  },

  /**
   * Producer Master와 Extension을 수정한다.
   *
   * @param {string} producerId Producer ID
   * @param {Object} data 수정 데이터
   * @return {Object} 수정된 Producer
   */
  updateProducer: function (producerId, data) {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const current = this.getProducerById(producerId);
    if (!current) {
      throw new NotFoundError(
        'Producer를 찾을 수 없습니다.',
        field.PRODUCER_ID,
        { producerId: producerId },
        'PRODUCER_NOT_FOUND'
      );
    }
    const merged = Object.assign({}, current, data || {});
    merged[field.PRODUCER_ID] = producerId;
    merged[field.UPDATED_AT] = new Date();
    ProducerValidator.validate(merged);
    SheetRepository.update(
      PMS_CONFIG.PRODUCER_TABLES.MASTER,
      producerId,
      ProducerExtension.extractMaster(merged)
    );
    SheetRepository.update(
      PMS_CONFIG.PRODUCER_TABLES.EXTENSION,
      producerId,
      ProducerExtension.extractExtension(merged)
    );
    return this.getProducerById(producerId);
  },

  /**
   * Producer를 참조 보존형 Soft Delete 상태로 변경한다.
   *
   * @param {string} producerId Producer ID
   * @return {Object} 비활성화된 Producer
   */
  deleteProducer: function (producerId) {
    const field = HLAS_CONSTANTS.FIELD.PRODUCER;
    const changes = {};
    changes[field.PRODUCER_STATUS] = HLAS_CONSTANTS.PRODUCER_STATUS.DELETED;
    changes[field.TRADE_STATUS] = HLAS_CONSTANTS.SUPPLY_STATUS.STOPPED;
    changes[field.IS_ACTIVE] = HLAS_CONSTANTS.PRODUCER.BOOLEAN_FALSE;
    changes[field.DELETED_AT] = new Date();
    return this.updateProducer(producerId, changes);
  },
});
