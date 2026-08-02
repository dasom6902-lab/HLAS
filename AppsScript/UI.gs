/**
 * 스프레드시트를 열 때 HLAS-PMS 사용자 메뉴를 생성한다.
 *
 * Project, Task 등 업무 영역은 하위 메뉴로 분리하여 기능이 늘어나도
 * 사용자가 필요한 메뉴를 쉽게 찾을 수 있도록 구성한다.
 *
 * @return {void}
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const permission = getPermissionContext();
  const projectMenu = ui.createMenu('프로젝트 관리');
  const epicMenu = ui.createMenu('EPIC 관리');
  const featureMenu = ui.createMenu('FEATURE 관리');
  const functionMenu = ui.createMenu('FUNCTION 관리');
  const taskMenu = ui.createMenu('TASK 관리');

  if (permission.create) {
    projectMenu.addItem('프로젝트 생성', 'showProjectCreateDialog');
    epicMenu.addItem('EPIC 생성', 'showEpicCreateDialog');
    featureMenu.addItem('FEATURE 등록', 'showFeatureCreateDialog');
    functionMenu.addItem('FUNCTION 등록', 'showFunctionCreateDialog');
    taskMenu.addItem('TASK 등록', 'showTaskCreateDialog');
  }
  projectMenu.addItem('프로젝트 목록', 'showProjectListDialog');
  epicMenu.addItem('EPIC 목록 조회', 'showEpicListDialog');
  featureMenu.addItem('FEATURE 목록', 'showFeatureListDialog');
  functionMenu.addItem('FUNCTION 목록', 'showFunctionListDialog');
  taskMenu.addItem('TASK 목록', 'showTaskListDialog');

  const root = ui.createMenu('HLAS-PMS');
  if (permission.update) root.addItem('PMS 초기화', 'initializePMS');
  if (permission.dashboard) root.addItem('KPI Dashboard', 'showKpiDashboard');
  if (permission.dashboard) root.addItem('Analytics Center', 'showAnalyticsDashboard');
  if (permission.dashboard) root.addItem('Report Center', 'showReportCenter');
  root.addItem('API Manager', 'showApiManager');
  root.addItem('System Health', 'showSystemHealth');
  root.addItem('Audit Center', 'showAuditCenter');
  root.addItem('Notification Center', 'showNotificationCenter');
  root.addItem('Import Center', 'showImportCenter');
  root.addItem('Export Center', 'showExportCenter');
  root.addItem('Backup Center', 'showBackupCenter');
  root.addItem('Workflow Center', 'showWorkflowCenter');
  root.addItem('Approval Center', 'showApprovalCenter');
  root.addItem('Workflow History', 'showWorkflowHistory');
  root.addSeparator()
    .addSubMenu(projectMenu)
    .addSubMenu(epicMenu)
    .addSubMenu(featureMenu)
    .addSubMenu(functionMenu)
    .addSubMenu(taskMenu)
    .addSeparator()
    .addItem('CHANGELOG 보기', 'showChangeLog')
    .addItem('환경설정', 'openSettings')
    .addSeparator()
    .addItem('도움말', 'showHelp')
    .addToUi();
}

/**
 * Import Center를 표시한다.
 *
 * @return {void}
 */
function showImportCenter() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.IMPORT, '');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('Dialog_Import').setWidth(900).setHeight(700),
    'Import Center'
  );
}

/**
 * Export Center를 표시한다.
 *
 * @return {void}
 */
function showExportCenter() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.EXPORT, '');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('Dialog_Export').setWidth(760).setHeight(560),
    'Export Center'
  );
}

/**
 * Backup Center를 표시한다.
 *
 * @return {void}
 */
function showBackupCenter() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.BACKUP, '');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('Dialog_Backup').setWidth(980).setHeight(700),
    'Backup Center'
  );
}

/** @return {void} Workflow Center를 표시한다. */
function showWorkflowCenter() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.WORKFLOW, '');
  showWorkflowDialog_('WORKFLOW');
}

/** @return {void} Approval Center를 표시한다. */
function showApprovalCenter() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.APPROVAL, '');
  showWorkflowDialog_('APPROVAL');
}

/** @return {void} Workflow History를 표시한다. */
function showWorkflowHistory() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.WORKFLOW, '');
  showWorkflowDialog_('HISTORY');
}

function showWorkflowDialog_(mode) {
  const template = HtmlService.createTemplateFromFile('Dialog_Workflow');
  template.initialMode = mode || 'WORKFLOW';
  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate().setWidth(1080).setHeight(740),
    mode === 'APPROVAL' ? 'Approval Center' :
      mode === 'HISTORY' ? 'Workflow History' : 'Workflow Center'
  );
}

/**
 * 알림 조회 및 읽음 처리를 위한 Notification Center를 표시한다.
 *
 * @return {void}
 */
function showNotificationCenter() {
  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_Notification')
    .setWidth(1080)
    .setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, 'Notification Center');
}

/**
 * 운영 감사 기록을 조회하는 Audit Center를 표시한다.
 *
 * @return {void}
 */
function showAuditCenter() {
  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_Audit')
    .setWidth(1180)
    .setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, 'Audit Center');
}

/**
 * KPI Dashboard Dialog를 표시한다.
 *
 * @return {void}
 */
function showKpiDashboard() {
  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_Dashboard')
    .setWidth(1100)
    .setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, 'KPI Dashboard');
}

/** Analytics 탭을 연 상태로 KPI Dashboard를 표시한다. @return {void} */
function showAnalyticsDashboard() {
  const template = HtmlService.createTemplateFromFile('Dialog_Dashboard');
  template.initialView = 'ANALYTICS';
  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate().setWidth(1160).setHeight(780),
    'Analytics Center'
  );
}

/** 일간·주간·월간 보고서 생성 화면을 표시한다. @return {void} */
function showReportCenter() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.DASHBOARD);
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('Dialog_Report').setWidth(960).setHeight(700),
    'Report Center'
  );
}

/** API, Webhook, Integration 관리 화면을 표시한다. @return {void} */
function showApiManager() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.API, '');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('Dialog_APIManager').setWidth(1120).setHeight(760),
    'HLAS Integration Center'
  );
}

/** Platform Health·Performance·운영 제어 화면을 표시한다. @return {void} */
function showSystemHealth() {
  assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.PLATFORM, '');
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('Dialog_SystemHealth').setWidth(1140).setHeight(780),
    'HLAS System Health'
  );
}

/**
 * 신규 TASK 등록 Dialog를 표시한다.
 *
 * @return {void}
 */
function showTaskCreateDialog() {
  showTaskDialog_('');
}

/**
 * 기존 TASK 수정 Dialog를 표시한다.
 *
 * @param {string} taskId 수정할 TASK_ID
 * @return {void}
 */
function showTaskEditDialog(taskId) {
  showTaskDialog_(taskId);
}

/**
 * TASK 목록 Dialog를 표시한다.
 *
 * @return {void}
 */
function showTaskListDialog() {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.TASK);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'TASK 목록',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_TaskList')
    .setWidth(1150)
    .setHeight(700);

  SpreadsheetApp.getUi().showModalDialog(html, 'TASK 목록');
}

function showTaskDialog_(taskId) {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.FUNCTION);
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.TASK);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'TASK 관리',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const template = HtmlService.createTemplateFromFile('Dialog_Task');
  template.taskId = String(taskId || '').trim();
  const html = template.evaluate().setWidth(620).setHeight(790);

  SpreadsheetApp.getUi().showModalDialog(
    html,
    template.taskId ? 'TASK 수정' : 'TASK 등록'
  );
}

/**
 * 신규 FUNCTION 등록 Dialog를 표시한다.
 *
 * @return {void}
 */
function showFunctionCreateDialog() {
  showFunctionDialog_('');
}

/**
 * 기존 FUNCTION 수정 Dialog를 표시한다.
 *
 * @param {string} functionId 수정할 FUNCTION_ID
 * @return {void}
 */
function showFunctionEditDialog(functionId) {
  showFunctionDialog_(functionId);
}

/**
 * FUNCTION 목록 Dialog를 표시한다.
 *
 * @return {void}
 */
function showFunctionListDialog() {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.FUNCTION);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'FUNCTION 목록',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_FunctionList')
    .setWidth(1100)
    .setHeight(680);

  SpreadsheetApp.getUi().showModalDialog(html, 'FUNCTION 목록');
}

function showFunctionDialog_(functionId) {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.FEATURE);
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.FUNCTION);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'FUNCTION 관리',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const template = HtmlService.createTemplateFromFile('Dialog_Function');
  template.functionId = String(functionId || '').trim();
  const html = template.evaluate().setWidth(580).setHeight(760);

  SpreadsheetApp.getUi().showModalDialog(
    html,
    template.functionId ? 'FUNCTION 수정' : 'FUNCTION 등록'
  );
}

/**
 * 신규 FEATURE 등록 Dialog를 표시한다.
 *
 * @return {void}
 */
function showFeatureCreateDialog() {
  showFeatureDialog_('');
}

/**
 * 기존 FEATURE 수정 Dialog를 표시한다.
 *
 * @param {string} featureId 수정할 FEATURE_ID
 * @return {void}
 */
function showFeatureEditDialog(featureId) {
  showFeatureDialog_(featureId);
}

/**
 * FEATURE 목록 Dialog를 표시한다.
 *
 * @return {void}
 */
function showFeatureListDialog() {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.FEATURE);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'FEATURE 목록',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_FeatureList')
    .setWidth(1050)
    .setHeight(650);

  SpreadsheetApp.getUi().showModalDialog(html, 'FEATURE 목록');
}

function showFeatureDialog_(featureId) {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.EPIC);
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.FEATURE);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'FEATURE 관리',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const template = HtmlService.createTemplateFromFile('Dialog_Feature');
  template.featureId = String(featureId || '').trim();
  const html = template.evaluate().setWidth(560).setHeight(650);

  SpreadsheetApp.getUi().showModalDialog(
    html,
    template.featureId ? 'FEATURE 수정' : 'FEATURE 등록'
  );
}

/**
 * EPIC 생성 화면을 표시한다.
 *
 * 현재는 HtmlService 호출을 직접 수행한다.
 * HLAS Core API 승인 후 DialogManager.gs로 분리할 후보이다.
 *
 * @return {void}
 */
function showEpicCreateDialog() {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.PROJECT);
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.EPIC);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'EPIC 생성',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_Epic')
    .setWidth(540)
    .setHeight(620);

  SpreadsheetApp.getUi().showModalDialog(html, 'EPIC 생성');
}

/**
 * EPIC 목록 조회 화면을 표시한다.
 *
 * 목록 데이터는 화면이 열린 뒤 getEpicList()를 호출하여 불러온다.
 *
 * @return {void}
 */
function showEpicListDialog() {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.EPIC);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'EPIC 목록 조회',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_EpicList')
    .setWidth(920)
    .setHeight(620);

  SpreadsheetApp.getUi().showModalDialog(html, 'EPIC 목록 조회');
}

/**
 * 프로젝트 생성 HTML 화면을 모달 대화상자로 표시한다.
 *
 * @return {void}
 */
function showProjectCreateDialog() {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.PROJECT);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      '프로젝트 생성',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_Project')
    .setWidth(520)
    .setHeight(540);

  SpreadsheetApp.getUi().showModalDialog(html, '프로젝트 생성');
}

/**
 * PROJECT 검색·필터·정렬 목록 Dialog를 표시한다.
 *
 * @return {void}
 */
function showProjectListDialog() {
  try {
    SheetRepository.getSheet(HLAS_CONSTANTS.SHEETS.PROJECT);
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'PROJECT 목록',
      '먼저 HLAS-PMS 메뉴에서 PMS 초기화를 실행해 주세요.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  const html = HtmlService
    .createHtmlOutputFromFile('Dialog_ProjectList')
    .setWidth(920)
    .setHeight(620);
  SpreadsheetApp.getUi().showModalDialog(html, 'PROJECT 목록');
}

/**
 * 변경 이력 시트를 열어 사용자가 바로 확인할 수 있도록 한다.
 *
 * @return {void}
 */
function showChangeLog() {
  activatePmsSheet_('09_CHANGELOG', 'CHANGELOG 보기');
}

/**
 * 환경설정 시트를 연다.
 *
 * @return {void}
 */
function openSettings() {
  activatePmsSheet_('99_SETTING', '환경설정');
}

/**
 * 현재 메뉴에서 사용할 수 있는 기능을 안내한다.
 *
 * @return {void}
 */
function showHelp() {
  SpreadsheetApp.getUi().alert(
    'HLAS-PMS 도움말',
    [
      'PMS 초기화: 핵심 관리 시트와 기본 설정을 생성합니다.',
      '프로젝트 관리 > 프로젝트 생성: 새 프로젝트를 등록합니다.',
      'EPIC 관리 > EPIC 생성: 프로젝트에 연결된 EPIC을 등록합니다.',
      'EPIC 관리 > EPIC 목록 조회: 등록된 EPIC을 확인합니다.',
      'FEATURE 관리 > FEATURE 등록: EPIC에 연결된 FEATURE를 등록합니다.',
      'FEATURE 관리 > FEATURE 목록: FEATURE를 조회·수정·삭제합니다.',
      'FUNCTION 관리 > FUNCTION 등록: FEATURE에 연결된 FUNCTION을 등록합니다.',
      'FUNCTION 관리 > FUNCTION 목록: FUNCTION을 조회·수정·삭제합니다.',
      'TASK 관리 > TASK 등록: FUNCTION에 연결된 TASK를 등록합니다.',
      'TASK 관리 > TASK 목록: TASK를 조회·수정·삭제합니다.',
      'CHANGELOG 보기: 변경 이력 시트로 이동합니다.',
      '환경설정: 시스템 설정 시트로 이동합니다.',
    ].join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 아직 구현되지 않은 메뉴 기능에 공통 안내창을 표시한다.
 *
 * @param {string} featureName 선택한 기능명
 */
function showComingSoon_(featureName) {
  SpreadsheetApp.getUi().alert(
    featureName,
    '준비중입니다.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 지정한 PMS 시트를 활성화한다.
 *
 * @param {string} sheetName 이동할 시트명
 * @param {string} featureName 사용자에게 표시할 기능명
 */
function activatePmsSheet_(sheetName, featureName) {
  try {
    SheetRepository.activateSheet(sheetName);
  } catch (error) {
    showComingSoon_(featureName);
  }
}
