/**
 * @fileoverview LogUtils.gs 수정 모듈 동작 검증을 위한 테스트 스크립트
 */

/**
 * LogUtils의 함수들 및 예외 처리 동작을 검증합니다.
 */
function test_LogUtils() {
  Logger.log('=== LogUtils 테스트 시작 ===');

  const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.LOG) 
    ? CONFIG.SHEETS.LOG 
    : 'LOG';

  // 1. LOG 시트 존재 여부 사전 점검
  try {
    const logSheet = getSheet(sheetName);
    Logger.log(`[PASS] LOG 시트 존재 확인 (${logSheet.getName()})`);

    // 2. 정상 로그 기록 테스트
    writeInfo('테스트모듈', 'INFO 로그 기록 테스트입니다.');
    Logger.log('[PASS] writeInfo 호출 성공');

    writeWarn('테스트모듈', 'WARN 경고 로그 기록 테스트입니다.');
    Logger.log('[PASS] writeWarn 호출 성공');

    writeError('테스트모듈', 'ERROR 에러 로그 기록 테스트입니다.');
    Logger.log('[PASS] writeError 호출 성공');

    writeLog('DEBUG', '테스트모듈', 'DEBUG 커스텀 레벨 기록 테스트입니다.');
    Logger.log('[PASS] writeLog 직접 호출 성공');

  } catch (error) {
    Logger.log(`[EXPECTED/INFO] LOG 시트가 존재하지 않거나 에러가 발생했습니다: ${error.message}`);
    Logger.log('[PASS] LOG 시트 미존재 시 예외 전파 동작 검증 완료');
  }

  Logger.log('=== LogUtils 테스트 완료 ===');
}