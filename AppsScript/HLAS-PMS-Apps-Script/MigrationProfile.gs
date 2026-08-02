/**
 * @fileoverview TASK-0027 Entity별 Migration 표준 Profile.
 */
const MigrationProfile = Object.freeze({
  /**
   * Entity의 Migration Profile을 반환한다.
   *
   * @param {string} entity Migration Entity
   * @return {Object} Profile
   */
  get: function (entity) {
    const type = String(entity || '').trim().toUpperCase();
    const profiles = buildMigrationProfiles_();
    if (!profiles[type]) {
      throw new ValidationError(
        '지원하지 않는 Migration Entity입니다.',
        'entity',
        { entity: type },
        'MIGRATION_ENTITY_UNSUPPORTED'
      );
    }
    return profiles[type];
  },

  /**
   * 지원 Entity 목록을 반환한다.
   *
   * @return {Array<string>} Entity 목록
   */
  list: function () {
    return PMS_CONFIG.MIGRATION.SUPPORTED_ENTITIES.slice();
  },

  /**
   * 등록된 운영 Source Profile을 반환한다.
   *
   * @param {string} sourceName Source Profile명
   * @return {Object} Source Profile
   */
  getSource: function (sourceName) {
    const name = String(sourceName || '').trim();
    const source = PMS_CONFIG.MIGRATION.SOURCES.SUPPLY_HISTORY_2026;
    if (name !== source.NAME) {
      throw new ValidationError(
        '등록되지 않은 Migration Source입니다.',
        'sourceProfile',
        { sourceProfile: name },
        'MIGRATION_SOURCE_UNSUPPORTED'
      );
    }
    return {
      name: source.NAME,
      entity: source.ENTITY,
      sourceType: source.SOURCE_TYPE,
      role: source.ROLE,
      priority: source.PRIORITY,
      operatingSource: source.OPERATING_SOURCE,
      columnMapping: {
        '공급일련번호': 'SupplySerial',
        '조합원번호': 'ProducerID',
        '조합원명': 'ProducerName',
        '물품코드': 'ProductID',
        '물품명': 'ProductName',
        '결과수량': 'Quantity',
        '결과금액': 'Amount',
        '배송코드': 'CenterCode',
      },
    };
  },
});

function buildMigrationProfiles_() {
  return {
    PRODUCER: {
      entity: HLAS_CONSTANTS.MIGRATION_ENTITY.PRODUCER,
      sheetName: PMS_CONFIG.PRODUCER_TABLES.MASTER,
      idField: 'ProducerID',
      required: ['ProducerID', 'ProducerName'],
      dataTypes: {},
    },
    PRODUCT: {
      entity: HLAS_CONSTANTS.MIGRATION_ENTITY.PRODUCT,
      sheetName: '26_PRODUCT_IMPORT_STAGING',
      idField: 'ProductID',
      required: ['ProductID', 'ProductName'],
      dataTypes: {},
    },
    RECEIVING: {
      entity: HLAS_CONSTANTS.MIGRATION_ENTITY.RECEIVING,
      sheetName: PMS_CONFIG.RECEIVING_TABLES.MASTER,
      idField: 'ReceivingID',
      required: ['ReceivingID', 'ReceivingDate', 'ProducerID', 'ProductID'],
      dataTypes: {
        ReceivingDate: 'DATE',
        Quantity: 'NUMBER',
        UnitPrice: 'NUMBER',
        Amount: 'NUMBER',
        ReturnQuantity: 'NUMBER',
        ReturnAmount: 'NUMBER',
      },
    },
    AGREEMENT: {
      entity: HLAS_CONSTANTS.MIGRATION_ENTITY.AGREEMENT,
      sheetName: PMS_CONFIG.AGREEMENT_TABLES.MASTER,
      idField: 'AgreementID',
      required: ['AgreementID', 'ProducerID', 'ProductID'],
      dataTypes: {
        AgreementYear: 'NUMBER',
        AgreementQuantity: 'NUMBER',
        AgreementAmount: 'NUMBER',
        ExpectedSupplyDate: 'DATE',
        StartDate: 'DATE',
        EndDate: 'DATE',
      },
    },
    PLANNING: {
      entity: HLAS_CONSTANTS.MIGRATION_ENTITY.PLANNING,
      sheetName: PMS_CONFIG.PLANNING_TABLES.ANNUAL_TARGET,
      idField: 'TARGET_ID',
      required: ['TARGET_ID', 'YEAR', 'CATEGORY', 'TARGET_AMOUNT'],
      dataTypes: {
        YEAR: 'NUMBER',
        TARGET_AMOUNT: 'NUMBER',
      },
    },
  };
}
