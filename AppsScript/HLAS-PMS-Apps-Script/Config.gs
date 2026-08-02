/**
 * HLAS-PMS 설정 및 시트 스키마.
 * 색상·헤더 변경은 이 파일에서 관리하며 initializePMS()가 시트에 적용한다.
 */
const PMS_CONFIG = Object.freeze({
  appName: 'HLAS-PMS',
  version: '1.0.0-RC1',
  /**
   * 물류 운영본의 Master Data를 읽기 전용으로 점검하기 위한 설정이다.
   *
   * 기존 운영 수식과 결과값을 보호하기 위해 TASK-0021에서는 기초시트를
   * 수정하지 않는다. 다른 운영본을 점검할 때에는 Script Property
   * `HLAS_MASTER_SPREADSHEET_ID`에 대상 Spreadsheet ID를 저장하면 된다.
   */
  masterData: Object.freeze({
    spreadsheetId: '1-awn3DCAB-dVKAhgCLDVAP6pJox9-rKwCwJosUgeKMw',
    spreadsheetPropertyKey: 'HLAS_MASTER_SPREADSHEET_ID',
    masterSheetName: '기초',
    masterHeaderRow: 2,
    masterFirstDataRow: 3,
    masterLastColumn: 7,
    orderSheetName: '주문내역',
    orderHeaderRow: 1,
    orderFirstDataRow: 2,
    orderLastColumn: 15,
  }),
  /**
   * TASK-0022 Data Architecture Registry.
   *
   * 실제 시트명 또는 외부 데이터 소스명이 확정되기 전까지 사용하는 논리 테이블명이다.
   * TASK-0021의 masterData 설정과 분리하여 기존 동작에 영향을 주지 않는다.
   */
  MASTER_TABLES: Object.freeze({
    PRODUCT: 'PRODUCT_MASTER',
    PRODUCER: 'PRODUCER_MASTER',
    AGREEMENT: 'AGREEMENT_MASTER',
    ROUTE: 'ROUTE_MASTER',
    COMMON_CODE: 'COMMON_CODE',
  }),
  TRANSACTION_TABLES: Object.freeze({
    RECEIVING: 'RECEIVING_HISTORY',
    RETURN: 'RETURN_HISTORY',
    ORDER: 'REGIONAL_ORDER_HISTORY',
    SHIPMENT: 'SHIPMENT_HISTORY',
    INVENTORY: 'INVENTORY_HISTORY',
    FUND_HISTORY: 'FUND_HISTORY',
  }),
  ANALYTICS_TABLES: Object.freeze({
    AGE_STATISTICS: 'AGE_STATISTICS',
    REGIONAL_STATISTICS: 'REGIONAL_STATISTICS',
  }),
  RULE_TABLES: Object.freeze({
    FUND_RULE: 'FUND_RULE',
  }),
  /**
   * TASK-0023 Planning Module 논리/물리 테이블.
   *
   * 연도는 행 데이터로 관리하므로 향후 연도가 추가되어도 시트는 늘어나지 않는다.
   */
  PLANNING_TABLES: Object.freeze({
    ANNUAL_TARGET: '17_ANNUAL_TARGET',
    MONTHLY_TARGET: '18_MONTHLY_TARGET',
    SUPPLY_TARGET: '19_SUPPLY_TARGET',
    STORE_TARGET: '20_STORE_TARGET',
    TARGET_HISTORY: '21_TARGET_HISTORY',
  }),
  /**
   * TASK-0024 Producer Master 물리 테이블.
   *
   * ERP 원본 성격의 표준 필드와 PMS 전용 확장 필드를 분리한다.
   */
  PRODUCER_TABLES: Object.freeze({
    MASTER: '22_PRODUCER_MASTER',
    EXTENSION: '23_PRODUCER_EXTENSION',
  }),
  /**
   * TASK-0025 Receiving Transaction 물리 테이블.
   *
   * ERP 입고 원본 성격의 표준 필드와 PMS 운영 확장 필드를 분리한다.
   */
  RECEIVING_TABLES: Object.freeze({
    MASTER: '24_RECEIVING_TRANSACTION',
    EXTENSION: '25_RECEIVING_EXTENSION',
  }),
  /**
   * TASK-0026 Agreement Domain 물리 테이블.
   */
  AGREEMENT_TABLES: Object.freeze({
    MASTER: '27_AGREEMENT_MASTER',
    EXTENSION: '28_AGREEMENT_EXTENSION',
  }),
  MIGRATION_TABLES: Object.freeze({
    LOG: '29_MIGRATION_LOG',
  }),
  AGREEMENT_CACHE: Object.freeze({
    TTL_SECONDS: 900,
    PREFIX: 'HLAS:AGREEMENT:',
  }),
  AGREEMENT_INDEX: Object.freeze({
    PRIMARY_KEY: 'AgreementID',
    PRODUCER_KEY: 'ProducerID',
    PRODUCT_KEY: 'ProductID',
    YEAR_KEY: 'AgreementYear',
  }),
  /**
   * TASK-0025A 공통 Framework 설정.
   *
   * 기존 Entity/API 설정과 분리하여 Backward Compatibility를 유지한다.
   */
  IMPORT: Object.freeze({
    MAX_ROWS: 5000,
    BATCH_SIZE: 200,
    ROLLBACK_TTL_SECONDS: 21600,
    SUPPORTED_FORMATS: Object.freeze(['CSV', 'XLSX', 'GOOGLE_SHEET']),
    SUPPORTED_ENTITIES: Object.freeze([
      'PRODUCER', 'PRODUCT', 'RECEIVING', 'AGREEMENT', 'PLANNING',
    ]),
  }),
  MIGRATION: Object.freeze({
    BATCH_SIZE: 200,
    MAX_ROWS: 5000,
    ROLLBACK_TTL_SECONDS: 21600,
    CACHE_PREFIX: 'MIGRATION:',
    SUPPORTED_ENTITIES: Object.freeze([
      'PRODUCER', 'PRODUCT', 'RECEIVING', 'AGREEMENT', 'PLANNING',
    ]),
    SOURCES: Object.freeze({
      SUPPLY_HISTORY_2026: Object.freeze({
        NAME: 'SupplyHistory2026',
        ENTITY: 'RECEIVING',
        SOURCE_TYPE: 'EXCEL',
        ROLE: 'SUPPLEMENT_SOURCE',
        PRIORITY: 'SECONDARY',
        FILE_PATTERN: '^(?:26\\d{4}|0[23]\\d{4}|26\\d{5})\\.xlsx$',
        OPERATING_SOURCE: 'ORDER_SUPPLY_SUMMARY',
      }),
    }),
    FILE_DATE_CORRECTIONS: Object.freeze({
      '020106': '260106',
      '020108': '260108',
      '030114': '260114',
      '2604036': '260406',
      '2606010': '260610',
    }),
  }),
  CACHE: Object.freeze({
    DEFAULT_TTL_SECONDS: 600,
    INDEX_TTL_SECONDS: 900,
    MAX_VALUE_LENGTH: 90000,
    KEY_PREFIX: 'HLAS:',
  }),
  AUDIT: Object.freeze({
    SCHEMA_VERSION: '1.0',
    DEFAULT_USER: 'SYSTEM',
    SOFT_DELETE_REASON: '사용자 요청',
  }),
  INDEX: Object.freeze({
    PRODUCER_KEY: 'ProducerID',
    PRODUCT_KEY: '물품코드',
    RECEIVING_KEY: 'ReceivingID',
    AGREEMENT_KEY: 'AgreementID',
  }),
  STRING_KEYS: Object.freeze({
    PRODUCT_ID_LENGTH: 9,
    FIELDS: Object.freeze([
      'ProductID', 'ERPProductID', 'Barcode', 'LotNo',
      'ReceivingID', 'AgreementID', 'ProducerID',
    ]),
  }),
  headerBackground: '#1F4E78',
  headerFontColor: '#FFFFFF',
  headerFontSize: 10,
  sheets: Object.freeze([
    {
      name: '00_HOME',
      headers: ['항목', '내용', '최종 갱신일시'],
      widths: [180, 360, 170],
    },
    {
      name: '01_PROJECT',
      headers: [
        'PROJECT_ID', '프로젝트명', '설명', '상태', '현재버전',
        '담당자', '시작일', '종료예정일', '생성일시', '수정일시',
      ],
      widths: [120, 220, 360, 100, 100, 120, 110, 110, 170, 170],
    },
    {
      name: '02_EPIC',
      headers: [
        'EPIC_ID', 'PROJECT_ID', 'EPIC명', '설명', '상태',
        '우선순위', '담당자', '시작일', '종료예정일', '생성일시', '수정일시',
      ],
      widths: [110, 120, 220, 360, 100, 100, 120, 110, 110, 170, 170],
    },
    {
      name: '03_FEATURE',
      headers: [
        'FEATURE_ID', 'EPIC_ID', 'FEATURE명', '설명', '상태',
        '우선순위', '담당자', '생성일시', '수정일시',
      ],
      widths: [120, 110, 220, 360, 100, 100, 120, 170, 170],
    },
    {
      name: '04_FUNCTION',
      headers: [
        'FUNCTION_ID', 'FEATURE_ID', '기능명', '설명', '입력',
        '출력', '관련시트', '상태', '담당자', '생성일시', '수정일시',
      ],
      widths: [120, 120, 220, 360, 220, 220, 180, 100, 120, 170, 170],
    },
    {
      name: '05_TASK',
      headers: [
        'TASK_ID', 'FUNCTION_ID', 'EPIC_ID', '작업명', '설명',
        '상태', '우선순위', '담당자', '시작일', '완료예정일',
        '완료일', '진행률', '생성일시', '수정일시',
      ],
      widths: [110, 120, 110, 240, 360, 100, 100, 120, 110, 110, 110, 90, 170, 170],
    },
    {
      name: '06_USER',
      headers: [
        'USER_ID', 'USER_NAME', 'EMAIL', 'ROLE', 'STATUS',
        'CREATED_AT', 'UPDATED_AT',
      ],
      widths: [120, 160, 240, 110, 110, 170, 170],
    },
    {
      name: '07_AUDIT',
      headers: [
        'AUDIT_ID', 'TIMESTAMP', 'USER', 'ROLE', 'ACTION',
        'ENTITY', 'ENTITY_ID', 'RESULT', 'MESSAGE', 'DETAIL',
      ],
      widths: [250, 170, 220, 110, 150, 120, 140, 100, 320, 420],
    },
    {
      name: '08_NOTIFICATION',
      headers: [
        'NOTIFICATION_ID', 'TIMESTAMP', 'TYPE', 'USER', 'ENTITY',
        'ENTITY_ID', 'TITLE', 'MESSAGE', 'STATUS', 'READ_AT',
      ],
      widths: [250, 170, 100, 200, 120, 140, 240, 420, 100, 170],
    },
    {
      name: '09_CHANGELOG',
      headers: [
        'LOG_ID', '버전', '변경일시', '변경유형', '변경내용',
        '관련ID', '작업자', '결과',
      ],
      widths: [110, 90, 170, 110, 420, 140, 140, 100],
    },
    {
      name: '09_BACKUP_HISTORY',
      headers: [
        'BACKUP_ID', 'TIMESTAMP', 'USER', 'TYPE',
        'TARGET', 'FILE_NAME', 'STATUS', 'MESSAGE',
      ],
      widths: [250, 170, 220, 100, 180, 280, 100, 420],
    },
    {
      name: '11_ANALYTICS_CACHE',
      headers: [
        'CACHE_ID', 'METRIC', 'VALUE', 'TARGET', 'CREATED_AT', 'EXPIRES_AT',
      ],
      widths: [250, 180, 500, 180, 170, 170],
    },
    {
      name: '12_API_LOG',
      headers: [
        'API_LOG_ID', 'TIMESTAMP', 'CLIENT', 'API_KEY', 'ENDPOINT',
        'METHOD', 'STATUS', 'RESPONSE_TIME', 'USER', 'MESSAGE',
      ],
      widths: [250, 170, 180, 140, 180, 90, 100, 120, 220, 420],
    },
    {
      name: '13_WEBHOOK',
      headers: [
        'WEBHOOK_ID', 'EVENT', 'TARGET_URL', 'METHOD',
        'STATUS', 'LAST_SENT', 'LAST_RESULT',
      ],
      widths: [250, 200, 420, 90, 100, 170, 420],
    },
    {
      name: '14_SYSTEM_HEALTH',
      headers: ['CHECK_ID', 'TIMESTAMP', 'COMPONENT', 'STATUS', 'RESPONSE_TIME', 'MESSAGE', 'DETAIL'],
      widths: [250, 170, 180, 110, 130, 320, 420],
    },
    {
      name: '15_RUNTIME_METRICS',
      headers: ['METRIC_ID', 'TIMESTAMP', 'SERVICE', 'EXECUTION_TIME', 'SUCCESS', 'MEMORY', 'DETAIL'],
      widths: [250, 170, 180, 140, 100, 120, 420],
    },
    {
      name: '16_FEATURE_FLAG',
      headers: ['FLAG', 'DESCRIPTION', 'ENABLED', 'TARGET', 'UPDATED_AT'],
      widths: [220, 420, 100, 120, 170],
    },
    {
      name: '99_SETTING',
      headers: ['설정그룹', '설정키', '설정값', '설명', '사용여부', '수정일시'],
      widths: [130, 180, 240, 360, 90, 170],
    },
    {
      name: '10_WORKFLOW_HISTORY',
      headers: [
        'WORKFLOW_ID', 'TIMESTAMP', 'ENTITY', 'ENTITY_ID',
        'FROM_STATUS', 'TO_STATUS', 'USER', 'ROLE',
        'ACTION', 'RESULT', 'MESSAGE',
      ],
      widths: [250, 170, 120, 150, 150, 150, 220, 110, 160, 100, 420],
    },
    {
      name: '17_ANNUAL_TARGET',
      headers: [
        'TARGET_ID', 'YEAR', 'CATEGORY', 'TARGET_AMOUNT',
        'STATUS', 'CREATED_AT', 'UPDATED_AT',
      ],
      widths: [250, 100, 140, 150, 110, 170, 170],
    },
    {
      name: '18_MONTHLY_TARGET',
      headers: [
        'TARGET_ID', 'YEAR', 'MONTH', 'CATEGORY', 'TARGET_AMOUNT',
        'STATUS', 'CREATED_AT', 'UPDATED_AT',
      ],
      widths: [250, 100, 90, 140, 150, 110, 170, 170],
    },
    {
      name: '19_SUPPLY_TARGET',
      headers: [
        'TARGET_ID', 'YEAR', 'MONTH', 'ROUTE_CODE', 'TARGET_AMOUNT',
        'STATUS', 'CREATED_AT', 'UPDATED_AT',
      ],
      widths: [250, 100, 90, 140, 150, 110, 170, 170],
    },
    {
      name: '20_STORE_TARGET',
      headers: [
        'TARGET_ID', 'YEAR', 'MONTH', 'STORE_CODE', 'TARGET_AMOUNT',
        'STATUS', 'CREATED_AT', 'UPDATED_AT',
      ],
      widths: [250, 100, 90, 140, 150, 110, 170, 170],
    },
    {
      name: '21_TARGET_HISTORY',
      headers: [
        'HISTORY_ID', 'TARGET_ID', 'TARGET_TYPE', 'ACTION',
        'BEFORE_VALUE', 'AFTER_VALUE', 'CHANGED_AT',
      ],
      widths: [250, 250, 130, 110, 360, 360, 170],
    },
    {
      name: '22_PRODUCER_MASTER',
      headers: [
        'ProducerID', 'ProducerName', 'Region', 'Community', 'CommunityID',
        'BusinessType', 'ProducerType', 'TradeStatus', 'MembershipStatus',
        'JoinDate', 'Phone', 'Address', 'Bank', 'Account', 'ParcelCount',
        'ParcelArea', 'MainProduct', 'LastReceivingDate', 'ProducerStatus',
      ],
      widths: [
        150, 180, 130, 160, 130, 130, 130, 120, 140,
        120, 150, 300, 130, 180, 110, 110, 180, 150, 130,
      ],
    },
    {
      name: '23_PRODUCER_EXTENSION',
      headers: [
        'ProducerID', 'ProducerAssociationMember', 'AssociationJoinDate',
        'AgreementParticipation', 'FundEligible', 'SupportGrade',
        'InternalMemo', 'CreatedAt', 'UpdatedAt', 'IsActive', 'DeletedAt',
      ],
      widths: [150, 180, 150, 180, 130, 130, 360, 170, 170, 110, 170],
    },
    {
      name: '24_RECEIVING_TRANSACTION',
      headers: [
        'ReceivingID', 'ReceivingDate', 'ProducerID', 'ProductID',
        'ProductName', 'CenterCode', 'CenterName', 'Quantity', 'Unit',
        'UnitPrice', 'Amount', 'ReceivingType', 'ReturnQuantity',
        'ReturnAmount', 'Status', 'Remark',
      ],
      widths: [
        190, 130, 150, 150, 220, 130, 180, 110,
        90, 120, 130, 130, 130, 130, 130, 300,
      ],
    },
    {
      name: '25_RECEIVING_EXTENSION',
      headers: [
        'ReceivingID', 'SettlementStatus', 'FundApplicable',
        'AgreementApplicable', 'InspectionStatus', 'Memo', 'CreatedAt',
        'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'SchemaVersion',
        'IsActive', 'DeletedAt',
      ],
      widths: [
        190, 150, 140, 160, 150, 360, 170,
        180, 170, 180, 130, 110, 170,
      ],
    },
    {
      name: '26_PRODUCT_IMPORT_STAGING',
      headers: [
        'ProductID', 'ProductName', 'ERPProductID', 'Barcode',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy',
        'SchemaVersion', 'IsActive', 'DeletedAt', 'DeletedBy',
        'DeleteReason',
      ],
      widths: [150, 220, 150, 180, 170, 180, 170, 180, 130, 110, 170, 180, 260],
    },
    {
      name: '27_AGREEMENT_MASTER',
      headers: [
        'AgreementID', 'AgreementYear', 'ProducerID', 'ProductID',
        'ProductName', 'AgreementQuantity', 'AgreementAmount',
        'ExpectedSupplyDate', 'StartDate', 'EndDate', 'AgreementStatus',
      ],
      widths: [180, 110, 150, 150, 220, 140, 140, 150, 120, 120, 150],
    },
    {
      name: '28_AGREEMENT_EXTENSION',
      headers: [
        'AgreementID', 'AgreementType', 'SettlementStatus',
        'FundApplicable', 'Priority', 'Remark', 'InternalMemo',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy',
        'SchemaVersion', 'IsActive', 'DeletedAt', 'DeletedBy',
        'DeleteReason',
      ],
      widths: [
        180, 140, 150, 140, 110, 300, 360,
        170, 180, 170, 180, 130, 110, 170, 180, 260,
      ],
    },
    {
      name: '29_MIGRATION_LOG',
      headers: [
        'MigrationID', 'Entity', 'SourceFile', 'StartTime', 'EndTime',
        'Duration', 'TotalRows', 'SuccessRows', 'FailedRows', 'SkippedRows',
        'RollbackAvailable', 'ExecutedBy', 'SupplementSource', 'AppliedRows',
        'DuplicateRows',
      ],
      widths: [
        250, 130, 300, 170, 170, 120, 110, 110, 110, 110, 150, 220,
        200, 120, 120,
      ],
    },
  ]),
});
