/**
 * @fileoverview Producer/Product/Receiving/Agreement 공통 Index Manager.
 */

const IndexManager = Object.freeze({
  /**
   * 레코드 배열로 Key 기반 Index를 생성한다.
   *
   * @param {string} indexType Index 유형
   * @param {Array<Object>} records 원본 레코드
   * @param {string=} keyField Key 필드
   * @return {Object<string,Object>} Index
   */
  createIndex: function (indexType, records, keyField) {
    validateFrameworkIndexType_(indexType);
    const field = keyField || resolveFrameworkIndexField_(indexType);
    const index = {};
    (records || []).forEach(function (record) {
      const key = DataTypeManager.normalizeField(field, record[field]);
      if (key) index[key] = record;
    });
    CacheManager.putLarge(
      buildFrameworkIndexCacheKey_(indexType),
      index,
      PMS_CONFIG.CACHE.INDEX_TTL_SECONDS
    );
    return index;
  },

  /**
   * Entity 원본에서 Index를 다시 생성한다.
   *
   * @param {string} indexType Index 유형
   * @return {Object<string,Object>} 갱신된 Index
   */
  refreshIndex: function (indexType) {
    const source = readFrameworkIndexSource_(indexType);
    return this.createIndex(indexType, source.records, source.keyField);
  },

  /**
   * Index에서 Key로 단건을 조회한다.
   *
   * @param {string} indexType Index 유형
   * @param {*} key 검색 Key
   * @return {Object|null} 조회 레코드
   */
  findByKey: function (indexType, key) {
    validateFrameworkIndexType_(indexType);
    const cacheKey = buildFrameworkIndexCacheKey_(indexType);
    let index = CacheManager.getLarge(cacheKey);
    if (!index) index = this.refreshIndex(indexType);
    const field = resolveFrameworkIndexField_(indexType);
    const normalized = DataTypeManager.normalizeField(field, key);
    return index[normalized] || null;
  },

  /**
   * 지정 Index Cache를 제거한다.
   *
   * @param {string} indexType Index 유형
   * @return {boolean} 삭제 성공
   */
  clearCache: function (indexType) {
    validateFrameworkIndexType_(indexType);
    return CacheManager.clearLarge(buildFrameworkIndexCacheKey_(indexType));
  },

  /**
   * 모든 지원 Index를 준비한다.
   *
   * @return {Object<string,number>} Index별 레코드 수
   */
  warmup: function () {
    const result = {};
    HLAS_CONSTANTS.INDEX_TYPE.VALUES.forEach(function (type) {
      try {
        result[type] = Object.keys(IndexManager.refreshIndex(type)).length;
      } catch (error) {
        result[type] = 0;
      }
    });
    return result;
  },
});

function validateFrameworkIndexType_(indexType) {
  Validation.validStatus(
    indexType,
    HLAS_CONSTANTS.INDEX_TYPE.VALUES,
    'indexType'
  );
}

function resolveFrameworkIndexField_(indexType) {
  const C = HLAS_CONSTANTS.INDEX_TYPE;
  const fields = {};
  fields[C.PRODUCER] = PMS_CONFIG.INDEX.PRODUCER_KEY;
  fields[C.PRODUCT] = PMS_CONFIG.INDEX.PRODUCT_KEY;
  fields[C.RECEIVING] = PMS_CONFIG.INDEX.RECEIVING_KEY;
  fields[C.AGREEMENT] = PMS_CONFIG.INDEX.AGREEMENT_KEY;
  return fields[indexType];
}

function buildFrameworkIndexCacheKey_(indexType) {
  return 'INDEX:' + String(indexType);
}

function readFrameworkIndexSource_(indexType) {
  const C = HLAS_CONSTANTS.INDEX_TYPE;
  if (indexType === C.PRODUCER) {
    return {
      records: ProducerRepository.getProducer(),
      keyField: PMS_CONFIG.INDEX.PRODUCER_KEY,
    };
  }
  if (indexType === C.PRODUCT) {
    return {
      records: MasterDataRepository.readMasterData().records,
      keyField: PMS_CONFIG.INDEX.PRODUCT_KEY,
    };
  }
  if (indexType === C.RECEIVING) {
    return {
      records: ReceivingRepository.getReceiving(),
      keyField: PMS_CONFIG.INDEX.RECEIVING_KEY,
    };
  }
  return {
    records: SheetRepository.findAll('27_AGREEMENT_MASTER'),
    keyField: PMS_CONFIG.INDEX.AGREEMENT_KEY,
  };
}
