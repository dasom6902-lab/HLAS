/**
 * @fileoverview 한살림 부산 PMS 상단 커스텀 메뉴 구성 및 이벤트 처리 모듈
 * @version 1.0.1
 */

/**
 * 스프레드시트가 열릴 때 자동 실행
 *
 * @param {Object} [e] 이벤트 객체
 */
function onOpen(e) {
  createMainMenu();
}

/**
 * PMS 메뉴 생성
 */
function createMainMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('한살림 부산 PMS')
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
      .addItem('정보 (About)', 'menuAbout')
      .addToUi();

  } catch (error) {
    Logger.log(`[Menu.createMainMenu] ${error.message}`);
  }
}

/**
 * 프로젝트 초기화
 */
function menuSetup() {
  try {
    setupProject();
    SpreadsheetApp.getUi().alert('프로젝트 초기 설정이 완료되었습니다.');
  } catch (error) {
    SpreadsheetApp.getUi().alert(`초기 설정 실패\n\n${error.message}`);
  }
}

/**
 * 설정관리
 */
function menuSettings() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * 대시보드
 */
function menuDashboard() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * 집품관리
 */
function menuPicking() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * 재고관리
 */
function menuInventory() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * 로그보기
 */
function menuViewLog() {
  SpreadsheetApp.getUi().alert('준비중 기능입니다.');
}

/**
 * 설정 캐시 초기화
 *
 * @param {boolean} [showAlert=true]
 * 테스트에서는 false
 * 실제 메뉴에서는 true
 */
function menuClearCache(showAlert = true) {

  const MODULE_NAME = 'Menu';

  try {

    if (typeof clearSettingsCache === 'function') {
      clearSettingsCache();
    }

    if (typeof writeInfo === 'function') {
      writeInfo(
        MODULE_NAME,
        '사용자 요청으로 Settings Cache를 초기화했습니다.'
      );
    }

    if (showAlert) {
      SpreadsheetApp.getUi().alert(
        '설정 캐시가 성공적으로 초기화되었습니다.'
      );
    }

  } catch (error) {

    if (showAlert) {
      SpreadsheetApp.getUi().alert(
        `캐시 초기화 실패\n\n${error.message}`
      );
    } else {
      throw error;
    }

  }

}

/**
 * 시스템 정보
 */
function menuAbout() {

  const projectName =
    CONFIG?.PROJECT?.NAME || '한살림 부산 PMS';

  const version =
    CONFIG?.PROJECT?.VERSION || '1.0.0';

  const owner =
    CONFIG?.PROJECT?.OWNER || '한살림 부산 물류팀';

  const message =
    `${projectName}\n\n` +
    `Version : ${version}\n` +
    `Owner : ${owner}`;

  SpreadsheetApp
    .getUi()
    .alert(
      '시스템 정보',
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

}