/**
 * @fileoverview 한살림 부산 PMS 초기 환경 구성 모듈
 * @version 1.1.0
 */

/**
 * 프로젝트 최초 실행 시 필요한 필수 시트(LOG, DASHBOARD, SETTINGS)를 점검하고 생성합니다.
 * 시트가 존재하지 않는 경우에만 새로 생성하며 최초 생성 시에만 지정된 헤더/초기값을 작성합니다.
 * 멱등성(Idempotency)을 보장하여 여러 번 실행해도 기존 시트 및 데이터를 변경하지 않습니다.
 *
 * @returns {void}
 * @throws {Error} 필수 상수 미정의 또는 시트 작업 중 예외 발생 시
 *
 * @example
 * setupProject();
 */
function setupProject() {
  const MODULE_NAME = 'Setup';
  const createdSheets = [];

  // CONFIG 객체 유효성 검증
  if (typeof CONFIG === 'undefined' || !CONFIG.SHEETS) {
    throw new Error('[Setup] CONFIG.SHEETS 상수가 정의되어 있지 않습니다.');
  }

  // 1. LOG 시트 점검 및 생성
  const logSheetName = CONFIG.SHEETS.LOG;
  if (!hasSheet(logSheetName)) {
    const logSheet = createSheet(logSheetName);
    logSheet.appendRow(['시간', 'Level', 'Module', 'Message']);
    createdSheets.push(logSheetName);
  }

  // 2. DASHBOARD 시트 점검 및 생성
  const dashboardSheetName = CONFIG.SHEETS.DASHBOARD;
  if (!hasSheet(dashboardSheetName)) {
    const dashboardSheet = createSheet(dashboardSheetName);
    dashboardSheet.getRange('A1').setValue('한살림 부산 PMS Dashboard');
    createdSheets.push(dashboardSheetName);
  }

  // 3. SETTINGS 시트 점검 및 생성
  const settingsSheetName = CONFIG.SHEETS.SETTINGS;
  if (!hasSheet(settingsSheetName)) {
    const settingsSheet = createSheet(settingsSheetName);
    settingsSheet.appendRow(['KEY', 'VALUE']);
    createdSheets.push(settingsSheetName);
  }

  // 4. 작업 결과 로그 기록 (LogUtils의 writeInfo만 사용)
  if (createdSheets.length > 0) {
    writeInfo(MODULE_NAME, `프로젝트 초기 설정 완료. 생성된 시트: ${createdSheets.join(', ')}`);
  } else {
    writeInfo(MODULE_NAME, '프로젝트 초기 설정 점검 완료. 모든 필수 시트가 이미 존재합니다.');
  }
}