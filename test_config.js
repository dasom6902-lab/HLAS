/**
 * @fileoverview CONFIG.gs 모듈 동작 검증을 위한 테스트 스크립트
 */

/**
 * CONFIG 객체의 값 읽기, 불변성(Deep Freeze), SheetUtils 호환성을 검증합니다.
 */
function test_CONFIG() {
  Logger.log('=== CONFIG 테스트 시작 ===');

  // 1. 기본 값 읽기 검증
  Logger.log(`[PROJECT.NAME] : ${CONFIG.PROJECT.NAME}`);
  Logger.log(`[PROJECT.VERSION] : ${CONFIG.PROJECT.VERSION}`);
  Logger.log(`[PROJECT.OWNER] : ${CONFIG.PROJECT.OWNER}`);
  Logger.log(`[SHEETS.LOG] : ${CONFIG.SHEETS.LOG}`);
  Logger.log(`[SHEETS.DASHBOARD] : ${CONFIG.SHEETS.DASHBOARD}`);
  Logger.log(`[SHEETS.SETTINGS] : ${CONFIG.SHEETS.SETTINGS}`);
  Logger.log(`[UI.TOAST_DURATION] : ${CONFIG.UI.TOAST_DURATION}`);
  Logger.log(`[LOG.PREFIX] : ${CONFIG.LOG.PREFIX}`);

  // 2. Deep Freeze (불변성) 검증
  try {
    // 1차 depth 수정 시도
    CONFIG.PROJECT = {};
  } catch (e) {
    Logger.log(`[PASS] 최상위 객체 수정 불가`);
  }

  try {
    // 2차 depth (하위 속성) 수정 시도
    CONFIG.PROJECT.NAME = '다른 프로젝트 이름';
  } catch (e) {
    Logger.log(`[PASS] 하위 객체 속성 수정 불가`);
  }

  if (CONFIG.PROJECT.NAME === '한살림 부산 PMS') {
    Logger.log('[PASS] Deep Freeze 무결성 검증 완료');
  } else {
    Logger.log('[FAIL] CONFIG 객체의 값이 변경되었습니다.');
  }

  // 3. SheetUtils 호환성 검증
  if (typeof getSheet === 'function') {
    try {
      const logSheet = getSheet(CONFIG.SHEETS.LOG);
      Logger.log(`[PASS] getSheet(CONFIG.SHEETS.LOG) 실행 성공: ${logSheet.getName()}`);
    } catch (error) {
      Logger.log(`[INFO] getSheet 호출 결과 (시트 부재 시 정상 예외): ${error.message}`);
    }
  } else {
    Logger.log('[SKIP] SheetUtils.gs가 프로젝트에 존재하지 않아 getSheet 호환성 테스트를 건너땁니다.');
  }

  Logger.log('=== CONFIG 테스트 완료 ===');
}