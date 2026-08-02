/**
 * @fileoverview 한살림 부산 PMS 프로젝트 전용 로그 모듈
 * @version 1.0.1
 */

/**
 * LOG 시트에 로그를 기록하는 핵심 로깅 함수입니다.
 * SheetUtils의 getSheet()를 사용하여 LOG 시트를 가져오며, 시트가 존재하지 않을 경우 예외가 발생합니다.
 *
 * @param {'INFO'|'WARN'|'ERROR'} level - 로그 레벨
 * @param {string} module - 로그를 호출한 모듈 또는 기능명
 * @param {string} message - 기록할 로그 메시지
 * @returns {void}
 * @throws {Error} LOG 시트가 존재하지 않거나 입력 파라미터가 유효하지 않을 경우
 *
 * @example
 * writeLog('INFO', '배송집계', '배송 데이터 수집 완료');
 */
function writeLog(level, module, message) {
  try {
    const sheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.LOG) 
      ? CONFIG.SHEETS.LOG 
      : 'LOG';

    const prefix = (typeof CONFIG !== 'undefined' && CONFIG.LOG && CONFIG.LOG.PREFIX) 
      ? CONFIG.LOG.PREFIX 
      : '[한살림 부산 PMS]';

    // 1. SheetUtils의 getSheet()만 사용하여 시트 객체 획득 (시트 없으면 Error 발생)
    const logSheet = getSheet(sheetName);

    // 2. 타임스탬프 및 메시지 포맷팅
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    const formattedMessage = `${prefix} ${message}`;

    // 3. 로그 데이터 기록
    logSheet.appendRow([
      timestamp,
      String(level || 'INFO').toUpperCase(),
      String(module || 'SYSTEM'),
      formattedMessage
    ]);
  } catch (error) {
    Logger.log(`[LogUtils.writeLog 에러] ${error.message}`);
    throw error; // 상위 호출자로 예외 전파
  }
}

/**
 * INFO 레벨의 로그를 기록합니다.
 *
 * @param {string} module - 모듈/기능명
 * @param {string} message - 로그 메시지
 * @returns {void}
 *
 * @example
 * writeInfo('집품관리', '집품 목록 생성 완료');
 */
function writeInfo(module, message) {
  writeLog('INFO', module, message);
}

/**
 * WARN 레벨의 로그를 기록합니다.
 *
 * @param {string} module - 모듈/기능명
 * @param {string} message - 경고 메시지
 * @returns {void}
 *
 * @example
 * writeWarn('인력관리', '배정 인원 미달 경고');
 */
function writeWarn(module, message) {
  writeLog('WARN', module, message);
}

/**
 * ERROR 레벨의 로그를 기록합니다.
 *
 * @param {string} module - 모듈/기능명
 * @param {string} message - 에러 메시지
 * @returns {void}
 *
 * @example
 * writeError('API연동', '서버 응답 없음 (Status 500)');
 */
function writeError(module, message) {
  writeLog('ERROR', module, message);
}