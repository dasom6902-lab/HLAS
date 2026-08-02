/**
 * @fileoverview SettingsUtils.gs 모듈 동작 및 캐시 정책 검증을 위한 테스트 스크립트
 */

/**
 * SettingsUtils의 CRUD 기능(getSetting, setSetting, getAllSettings, deleteSetting)과 캐시 정책을 검증합니다.
 */
function test_SettingsUtils() {
  Logger.log('=== SettingsUtils 테스트 시작 ===');

  const testKey = 'TEST_KEY_001';
  const testValue1 = 'INITIAL_VALUE';
  const testValue2 = 'UPDATED_VALUE';

  try {
    // 0. 초기화: 기존 테스트 키가 남아있다면 정리
    deleteSetting(testKey);
    clearSettingsCache();

    // 1. getSetting 기본값 테스트 (존재하지 않는 키)
    Logger.log('[1단계] 미존재 KEY 조회 및 defaultValue 반환 테스트');
    const defaultValue = getSetting(testKey, 'DEFAULT');
    if (defaultValue === 'DEFAULT') {
      Logger.log(`[PASS] getSetting 미존재 키 기본값 반환 정상 확인: "${defaultValue}"`);
    } else {
      Logger.log(`[FAIL] getSetting 기본값 반환 실패: "${defaultValue}"`);
    }

    // 2. setSetting 신규 등록 테스트
    Logger.log('[2단계] setSetting 신규 설정 등록');
    setSetting(testKey, testValue1);

    const registeredValue = getSetting(testKey);
    if (registeredValue === testValue1) {
      Logger.log(`[PASS] setSetting 등록 및 getSetting 조회 성공: "${registeredValue}"`);
    } else {
      Logger.log(`[FAIL] 신규 등록값 불일치: "${registeredValue}"`);
    }

    // 3. setSetting 값 수정(Upsert) 테스트
    Logger.log('[3단계] setSetting 기존 설정값 수정(Upsert)');
    setSetting(testKey, testValue2);

    const updatedValue = getSetting(testKey);
    if (updatedValue === testValue2) {
      Logger.log(`[PASS] setSetting 값 수정 성공: "${updatedValue}"`);
    } else {
      Logger.log(`[FAIL] 수정값 불일치: "${updatedValue}"`);
    }

    // 4. getAllSettings 및 캐시 검증
    Logger.log('[4단계] getAllSettings 전체 조회 및 캐시 검증');
    const allSettings = getAllSettings();
    if (allSettings[testKey] === testValue2) {
      Logger.log('[PASS] getAllSettings 객체 내 설정값 확인 성공');
    } else {
      Logger.log('[FAIL] getAllSettings 설정값 미포함');
    }

    // 5. deleteSetting 삭제 테스트
    Logger.log('[5단계] deleteSetting 삭제 처리');
    const isDeleted = deleteSetting(testKey);
    if (isDeleted) {
      Logger.log('[PASS] deleteSetting 성공 반환 (true)');
    } else {
      Logger.log('[FAIL] deleteSetting 실패 반환 (false)');
    }

    const valueAfterDelete = getSetting(testKey, null);
    if (valueAfterDelete === null) {
      Logger.log('[PASS] 삭제 후 getSetting 조회 시 null 반환 정상 확인');
    } else {
      Logger.log(`[FAIL] 삭제 후에도 값이 존재함: "${valueAfterDelete}"`);
    }

    // 6. deleteSetting 미존재 키 삭제 시도 (false 반환 검증)
    const isReDeleted = deleteSetting(testKey);
    if (!isReDeleted) {
      Logger.log('[PASS] 미존재 키 삭제 시 false 반환 정상 확인');
    } else {
      Logger.log('[FAIL] 미존재 키 삭제 시 true 반환 오류');
    }

  } catch (error) {
    Logger.log(`[FAIL] SettingsUtils 테스트 중 에러 발생: ${error.message}`);
  } finally {
    // 임시 캐시 정리
    clearSettingsCache();
  }

  Logger.log('=== SettingsUtils 테스트 완료 ===');
}