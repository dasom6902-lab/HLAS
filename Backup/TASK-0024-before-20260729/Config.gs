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
  ]),
});
