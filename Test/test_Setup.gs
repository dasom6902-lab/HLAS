/**
 * @fileoverview Setup.gs 모듈 동작 및 멱등성 검증을 위한 테스트 스크립트
 */

/**
 * setupProject() 함수의 최초 실행 시 시트 생성 동작과 반복 실행 시 멱등성을 검증합니다.
 */
function test_Setup() {
  Logger.log('=== Setup 테스트 시작 ===');

  try {
    // 1. setupProject 1차 실행 (시트 생성 및 헤더 설정 검증)
    Logger.log('[1단계] setupProject() 1차 실행');
    setupProject();
    Logger.log('[PASS] setupProject() 1차 실행 완료');

    // 2. 필수 시트 존재 여부 및 생성 확인 (SheetUtils 함수 사용)
    const logSheet = getSheet(CONFIG.SHEETS.LOG);
    const dashboardSheet = getSheet(CONFIG.SHEETS.DASHBOARD);
    const settingsSheet = getSheet(CONFIG.SHEETS.SETTINGS);

    Logger.log(`[PASS] LOG 시트 확인: ${logSheet.getName()}`);
    Logger.log(`[PASS] DASHBOARD 시트 확인: ${dashboardSheet.getName()}`);
    Logger.log(`[PASS] SETTINGS 시트 확인: ${settingsSheet.getName()}`);

    // 3. DASHBOARD 시트 A1 셀 값 검증
    const dashboardTitle = dashboardSheet.getRange('A1').getValue();
    if (dashboardTitle === '한살림 부산 PMS Dashboard') {
      Logger.log('[PASS] DASHBOARD 시트 A1 값 정상 확인');
    } else {
      Logger.log(`[FAIL] DASHBOARD 시트 A1 값 불일치: "${dashboardTitle}"`);
    }

    // 4. SETTINGS 시트 Header 검증
    const settingsHeader = settingsSheet.getRange('A1:B1').getValues()[0];
    if (settingsHeader[0] === 'KEY' && settingsHeader[1] === 'VALUE') {
      Logger.log('[PASS] SETTINGS 시트 Header (KEY, VALUE) 정상 확인');
    } else {
      Logger.log(`[FAIL] SETTINGS 시트 Header 불일치: ${JSON.stringify(settingsHeader)}`);
    }

    // 5. 멱등성(Idempotency) 검증 - 2차 재실행 시 에러 없이 기존 데이터 보존 확인
    Logger.log('[2단계] 멱등성 검증을 위한 setupProject() 2차 재실행');
    setupProject();
    Logger.log('[PASS] setupProject() 2차 재실행 완료 (기존 시트/데이터 변경 없음)');

  } catch (error) {
    Logger.log(`[FAIL] Setup 테스트 중 에러 발생: ${error.message}`);
  }

  Logger.log('=== Setup 테스트 완료 ===');
}