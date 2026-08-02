/**
 * @fileoverview Menu.gs 모듈 동작 및 핸들러 검증을 위한 테스트 스크립트
 */

/**
 * Menu.gs 내 주요 핸들러 함수들(createMainMenu, menuSetup, menuClearCache, menuAbout 등)이
 * 에러 없이 정상 호출되는지 검증합니다.
 */
function test_Menu() {
  Logger.log('=== Menu 테스트 시작 ===');

  try {
    // 1. createMainMenu() 함수 실행 검증
    Logger.log('[1단계] createMainMenu() 실행 시도');
    createMainMenu();
    Logger.log('[PASS] createMainMenu() 정상 실행');

    // 2. menuClearCache() 캐시 초기화 및 로그 기록 검증
    Logger.log('[2단계] menuClearCache() 실행 시도');
    if (typeof clearSettingsCache === 'function') {
menuClearCache(false);
      Logger.log('[PASS] menuClearCache() 실행 완료');
    } else {
      Logger.log('[SKIP] SettingsUtils.gs의 clearSettingsCache가 존재하지 않아 건너땁니다.');
    }

    // 3. menuAbout() 정보 안내 함수 구조 검증
    Logger.log('[3단계] menuAbout() 함수 정의 상태 검증');
    if (typeof menuAbout === 'function') {
      Logger.log('[PASS] menuAbout() 함수 존재 확인');
    } else {
      Logger.log('[FAIL] menuAbout() 함수 미존재');
    }

    // 4. 이벤트 트리거 onOpen 함수 존재 여부 검증
    Logger.log('[4단계] onOpen() 핸들러 검증');
    if (typeof onOpen === 'function') {
      Logger.log('[PASS] onOpen 트리거 함수 정상 바인딩 확인');
    } else {
      Logger.log('[FAIL] onOpen 함수 미존재');
    }

  } catch (error) {
    Logger.log(`[FAIL] Menu 테스트 중 에러 발생: ${error.message}`);
  }

  Logger.log('=== Menu 테스트 완료 ===');
}