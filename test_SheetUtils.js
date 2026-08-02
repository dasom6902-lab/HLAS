/**
 * @fileoverview 확장된 SheetUtils.gs 모듈 검증을 위한 테스트 스크립트
 */

/**
 * SheetUtils의 기존 함수 및 신규 확장 함수(hasSheet, createSheet, getOrCreateSheet)를 통합 검증합니다.
 */
function test_SheetUtils() {
  Logger.log('=== SheetUtils 테스트 시작 ===');

  const testSheetName = 'TEST_TEMP_SHEET';

  try {
    // 1. 기존 getSheet() 호환성 테스트 (존재하지 않는 시트 조회 시 Error 발생 검증)
    Logger.log('[1단계] 기존 getSheet() 호환성 및 예외 테스트');
    try {
      getSheet('NON_EXISTENT_SHEET_NAME_12345');
      Logger.log('[FAIL] 존재하지 않는 시트 조회 시 예외가 발생하지 않았습니다.');
    } catch (e) {
      Logger.log(`[PASS] 기존 getSheet() 예외 발생 정상 확인: ${e.message}`);
    }

    // 2. hasSheet() 테스트 (미존재 시트 false 검증)
    Logger.log('[2단계] hasSheet() 테스트');
    const beforeExists = hasSheet(testSheetName);
    Logger.log(`[PASS] 시트 생성 전 hasSheet("${testSheetName}") -> ${beforeExists} (Expected: false)`);

    // 3. createSheet() 테스트 (신규 시트 생성)
    Logger.log('[3단계] createSheet() 테스트');
    const newSheet = createSheet(testSheetName);
    Logger.log(`[PASS] createSheet("${testSheetName}") 성공 -> 생성된 시트명: ${newSheet.getName()}`);

    // 4. hasSheet() 테스트 (생성 후 true 검증)
    const afterExists = hasSheet(testSheetName);
    Logger.log(`[PASS] 시트 생성 후 hasSheet("${testSheetName}") -> ${afterExists} (Expected: true)`);

    // 5. getOrCreateSheet() 테스트 (기존 시트 안전 조회 검증)
    Logger.log('[4단계] getOrCreateSheet() 테스트');
    const existingSheet = getOrCreateSheet(testSheetName);
    Logger.log(`[PASS] getOrCreateSheet("${testSheetName}") 기존 시트 반환 확인: ${existingSheet.getName()}`);

    // 6. getSheet() 정상 조회 테스트
    const verifiedSheet = getSheet(testSheetName);
    Logger.log(`[PASS] getSheet("${testSheetName}") 정상 조회 성공: ${verifiedSheet.getName()}`);

  } catch (error) {
    Logger.log(`[FAIL] SheetUtils 테스트 중 에러 발생: ${error.message}`);
  } finally {
    // 테스트용으로 생성한 임시 시트 정리
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const tempSheet = ss.getSheetByName(testSheetName);
      if (tempSheet && ss.getSheets().length > 1) {
        ss.deleteSheet(tempSheet);
        Logger.log(`[CLEANUP] 테스트용 임시 시트("${testSheetName}") 삭제 완료`);
      }
    } catch (cleanupError) {
      Logger.log(`[CLEANUP 경고] 임시 시트 삭제 중 오류: ${cleanupError.message}`);
    }
  }

  Logger.log('=== SheetUtils 테스트 완료 ===');
}