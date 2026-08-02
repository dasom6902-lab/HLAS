/**
 * @fileoverview 한살림 부산 PMS 상단 커스텀 메뉴 구성 및 이벤트 처리 모듈
 * @version 1.0.0
 */

/**
 * 스프레드시트가 열릴 때 자동으로 실행되는 Google Apps Script 단순 트리거 함수입니다.
 * PMS 상단 커스텀 메뉴를 생성합니다.
 *
 * @param {Object} [e] - Google Apps Script 이벤트 객체
 * @returns {void}
 */
function onOpen(e) {
  createMainMenu();
}

/**
 * 한살림 부산 PMS 주 메뉴를 생성하여 스프레드시트 UI 상단에 추가합니다.
 *
 * @returns {void}
 */
function createMainMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('한살림 부산 PMS');

    menu
      .addItem('프로젝트 초기 설정', 'menuSetup')
      .addSeparator()
      .addItem('설정 관리', 'menuSettings')
      .addItem('대시보드 보기', 'menuDashboard')
      .addSeparator()
      .addItem('집품 관리', 'menuPicking')
      .addItem('재고 관리', 'menuInventory')
      .addSeparator()
      .addItem('로그 보기', 'menuViewLog')
      .addItem('캐시 초기화', 'menuClearCache')
      .addSeparator()
      .addItem('정보 (About)', 'menuAbout');

    menu.addToUi();
  } catch (error) {
    Logger.log(`[Menu.createMainMenu 에러] ${error.message}`);
  }
}

/**
 * [메뉴] 프로젝트 초기 설정 실행
 * setupProject()를 호출하여 필수 시트 및 환경을 구축합니다.
 *
 * @returns {void}
 */
function menuSetup() {
  try {
    setupProject();
    SpreadsheetApp.getUi().alert('프로젝트 초기 설정이 완료되었습니다.');
  } catch (error) {
    SpreadsheetApp.getUi().alert(`초기 설정 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * [메뉴] 설정 관리
 *
 * @returns {void}
 */
function menuSettings() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * [메뉴] 대시보드 보기
 *
 * @returns {void}
 */
function menuDashboard() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * [메뉴] 집품 관리
 *
 * @returns {void}
 */
function menuPicking() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * [메뉴] 재고 관리
 *
 * @returns {void}
 */
function menuInventory() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * [메뉴] 로그 보기
 *
 * @returns {void}
 */
function menuViewLog() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * [메뉴] 캐시 초기화
 * SettingsUtils의 메모리 캐시를 초기화하고 LogUtils를 통해 작업 로그를 남깁니다.
 *
 * @returns {void}
 */
function menuClearCache() {
  const MODULE_NAME = 'Menu';
  try {
    if (typeof clearSettingsCache === 'function') {
      clearSettingsCache();
    }
    
    if (typeof writeInfo === 'function') {
      writeInfo(MODULE_NAME, '사용자 요청으로 설정 캐시(clearSettingsCache)를 초기화했습니다.');
    }

    SpreadsheetApp.getUi().alert('설정 캐시가 성공적으로 초기화되었습니다.');
  } catch (error) {
    SpreadsheetApp.getUi().alert(`캐시 초기화 중 오류가 발생했습니다: ${error.message}`);
  }
}

/**
 * [메뉴] 정보 (About)
 * 프로젝트 이름, 버전, 담당 조직 정보를 출력합니다.
 *
 * @returns {void}
 */
function menuAbout() {
  const projectName = (typeof CONFIG !== 'undefined' && CONFIG.PROJECT && CONFIG.PROJECT.NAME)
    ? CONFIG.PROJECT.NAME
    : '한살림 부산 PMS';

  const version = (typeof CONFIG !== 'undefined' && CONFIG.PROJECT && CONFIG.PROJECT.VERSION)
    ? CONFIG.PROJECT.VERSION
    : '1.0.0';

  const owner = (typeof CONFIG !== 'undefined' && CONFIG.PROJECT && CONFIG.PROJECT.OWNER)
    ? CONFIG.PROJECT.OWNER
    : '한살림 부산 물류팀';

  const message = `${projectName}\n` +
                  `버전: v${version}\n` +
                  `담당: ${owner}\n\n` +
                  `한살림 부산 물류 시스템 표준 프로젝트 관리 모듈입니다.`;

  SpreadsheetApp.getUi().alert('시스템 정보', message, SpreadsheetApp.getUi().ButtonSet.OK);
}