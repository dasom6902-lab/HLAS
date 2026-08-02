/**
 * @fileoverview 한살림 부산 PMS 공통 Google Apps Script Utility Library
 * @version 1.1.0
 */

/**
 * 지정한 이름의 시트 객체를 반환합니다.
 * 시트가 존재하지 않으면 예외(Error)를 발생시킵니다.
 *
 * @param {string} sheetName - 가져올 시트의 이름
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 대상 시트 객체
 * @throws {Error} 시트가 존재하지 않거나 시트 이름이 유효하지 않을 경우
 *
 * @example
 * try {
 *   const sheet = getSheet("수량집계");
 *   Logger.log(sheet.getName());
 * } catch (e) {
 *   Logger.log(e.message);
 * }
 */
function getSheet(sheetName) {
  if (!sheetName || typeof sheetName !== 'string') {
    throw new Error('[SheetUtils] 유효한 시트 이름을 문자열로 입력해야 합니다.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`[SheetUtils] 시트를 찾을 수 없습니다: "${sheetName}"`);
  }

  return sheet;
}

/**
 * 지정한 이름의 시트가 존재하는지 여부를 확인합니다.
 *
 * @param {string} sheetName - 검사할 시트 이름
 * @returns {boolean} 존재 여부 (존재하면 true, 없으면 false)
 *
 * @example
 * if (hasSheet("LOG")) {
 *   Logger.log("LOG 시트가 존재합니다.");
 * }
 */
function hasSheet(sheetName) {
  if (!sheetName || typeof sheetName !== 'string') {
    return false;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    return sheet !== null;
  } catch (error) {
    Logger.log(`[SheetUtils.hasSheet 에러] ${error.message}`);
    return false;
  }
}

/**
 * 지정한 이름의 시트가 없으면 생성하고, 이미 존재하면 기존 시트를 반환합니다.
 *
 * @param {string} sheetName - 생성하거나 가져올 시트 이름
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 생성되거나 조회된 시트 객체
 * @throws {Error} 시트 이름이 유효하지 않거나 생성 중 오류가 발생할 경우
 *
 * @example
 * const logSheet = createSheet("LOG");
 */
function createSheet(sheetName) {
  if (!sheetName || typeof sheetName !== 'string') {
    throw new Error('[SheetUtils.createSheet] 유효한 시트 이름을 문자열로 입력해야 합니다.');
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    return sheet;
  } catch (error) {
    throw new Error(`[SheetUtils.createSheet 실패] "${sheetName}" 시트 생성 중 오류 발생: ${error.message}`);
  }
}

/**
 * 지정한 이름의 시트가 있으면 가져오고, 없으면 새로 생성하여 반환합니다.
 * (createSheet의 가독성 및 명시적 래퍼 함수)
 *
 * @param {string} sheetName - 가져오거나 생성할 시트 이름
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 시트 객체
 * @throws {Error} 시트 이름이 유효하지 않거나 처리 중 오류가 발생할 경우
 *
 * @example
 * const sheet = getOrCreateSheet("DASHBOARD");
 */
function getOrCreateSheet(sheetName) {
  return createSheet(sheetName);
}

/**
 * 시트에서 실제로 데이터가 존재하는 마지막 행 번호를 반환합니다.
 * (수식이나 공백 셀로 인한 오작동을 방지)
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 검사할 시트 객체
 * @returns {number} 실제 데이터가 있는 마지막 행 번호 (데이터가 전혀 없으면 0)
 * @throws {Error} 시트 객체가 유효하지 않을 경우
 *
 * @example
 * const sheet = getSheet("데이터");
 * const lastRow = findLastRow(sheet);
 * Logger.log(`실제 데이터 마지막 행: ${lastRow}`);
 */
function findLastRow(sheet) {
  if (!sheet || typeof sheet.getLastRow !== 'function') {
    throw new Error('[SheetUtils] 유효한 Sheet 객체를 전달해야 합니다.');
  }

  const maxRows = sheet.getLastRow();
  if (maxRows === 0) return 0;

  const maxCols = Math.max(sheet.getLastColumn(), 1);
  const values = sheet.getRange(1, 1, maxRows, maxCols).getValues();

  for (let row = values.length - 1; row >= 0; row--) {
    const isNotEmpty = values[row].some(cell => cell !== '' && cell !== null && cell !== undefined);
    if (isNotEmpty) {
      return row + 1;
    }
  }

  return 0;
}

/**
 * 범위를 안전하게 초기화(지우기)합니다.
 * 유효한 영역(numRows > 0, numCols > 0)일 때만 실행하여 오류 발생을 방지합니다.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 지울 시트 객체
 * @param {number} startRow - 시작 행 (1부터 시작)
 * @param {number} startCol - 시작 열 (1부터 시작)
 * @param {number} numRows - 지울 행 개수
 * @param {number} numCols - 지울 열 개수
 * @returns {boolean} 범위 삭제 실행 여부 (성공: true, 비실행: false)
 * @throws {Error} 파라미터가 유효하지 않은 경우
 *
 * @example
 * const sheet = getSheet("LOG");
 * clearRangeSafe(sheet, 2, 1, sheet.getLastRow() - 1, 4);
 */
function clearRangeSafe(sheet, startRow, startCol, numRows, numCols) {
  if (!sheet || typeof sheet.getRange !== 'function') {
    throw new Error('[SheetUtils] 유효한 Sheet 객체를 전달해야 합니다.');
  }

  if (!numRows || numRows < 1 || !numCols || numCols < 1) {
    return false;
  }

  if (startRow < 1 || startCol < 1) {
    throw new Error('[SheetUtils] 시작 행과 열은 1 이상이어야 합니다.');
  }

  const range = sheet.getRange(startRow, startCol, numRows, numCols);
  range.clearContent();
  return true;
}

/**
 * LOG 시트에 날짜, 시간, 메시지를 기록합니다.
 * LOG 시트가 없을 경우 자동으로 생성합니다.
 *
 * @param {string} message - 기록할 로그 메시지
 * @returns {void}
 *
 * @example
 * writeLog("배송 데이터 집계 작업 완료");
 */
function writeLog(message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('LOG');

    if (!logSheet) {
      logSheet = ss.insertSheet('LOG');
      logSheet.appendRow(['날짜', '시간', '메시지']);
      logSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#F3F3F3');
    }

    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');

    logSheet.appendRow([dateStr, timeStr, String(message)]);
  } catch (error) {
    Logger.log(`[writeLog 오류] ${error.message}`);
  }
}

/**
 * 스프레드시트 우측 하단에 Toast 메세지를 출력합니다.
 *
 * @param {string} message - 표시할 메시지
 * @param {string} [title="알림"] - Toast 제목
 * @param {number} [timeoutSeconds=3] - 노출 시간(초)
 * @returns {void}
 *
 * @example
 * showToast("집품 처리가 완료되었습니다.", "성공", 5);
 */
function showToast(message, title = '알림', timeoutSeconds = 3) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast(String(message), String(title), timeoutSeconds);
  } catch (error) {
    Logger.log(`[showToast 오류] ${error.message}`);
  }
}

/**
 * 동시 실행을 방지하기 위해 프로세스 잠금(Lock)을 설정합니다.
 *
 * @param {number} [timeoutMs=10000] - 대기 시간(밀리초, 기본값 10초)
 * @returns {GoogleAppsScript.Lock.Lock} 획득한 Lock 객체
 * @throws {Error} 시간 내 잠금을 획득하지 못했을 경우
 *
 * @example
 * const lock = lockProcess(5000);
 * try {
 *   // 핵심 로직 실행
 * } finally {
 *   unlockProcess(lock);
 * }
 */
function lockProcess(timeoutMs = 10000) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(timeoutMs);

  if (!hasLock) {
    throw new Error('[SheetUtils] 다른 프로세스가 처리 중입니다. 잠시 후 다시 시도해 주세요.');
  }

  return lock;
}

/**
 * 획득했던 프로세스 잠금(Lock)을 해제합니다.
 *
 * @param {GoogleAppsScript.Lock.Lock} [lockObj] - lockProcess()에서 반환받은 Lock 객체
 * @returns {void}
 *
 * @example
 * unlockProcess(lock);
 */
function unlockProcess(lockObj) {
  try {
    const lock = lockObj || LockService.getScriptLock();
    lock.releaseLock();
  } catch (error) {
    Logger.log(`[unlockProcess 경고] 잠금 해제 중 오류 발생: ${error.message}`);
  }
}

/**
 * Date 객체를 한국 표준 시간(Asia/Seoul) 기준 "yyyy-MM-dd HH:mm:ss" 포맷의 문자열로 변환합니다.
 *
 * @param {Date|string|number} [date=new Date()] - 변환할 Date 객체 또는 날짜 값
 * @returns {string} yyyy-MM-dd HH:mm:ss 형식의 문자열
 * @throws {Error} 날짜 변환이 불가능한 파라미터가 들어온 경우
 *
 * @example
 * const formattedNow = formatDateKR();
 * Logger.log(formattedNow); // "2026-07-31 17:53:43"
 */
function formatDateKR(date = new Date()) {
  const targetDate = (date instanceof Date) ? date : new Date(date);

  if (isNaN(targetDate.getTime())) {
    throw new Error('[SheetUtils] 유효하지 않은 날짜 형식입니다.');
  }

  return Utilities.formatDate(targetDate, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}