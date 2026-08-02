/**
 * @fileoverview 한살림 부산 PMS 프로젝트 전용 로그 모듈
 * @version 1.1.0
 */

const LOG_MODULE_NAME = 'LogUtils';


/**
 * 허용 로그 Level 검증
 *
 * @param {string} level
 * @returns {string}
 */
function _normalizeLogLevel(level) {

  const allowedLevels = [
    'INFO',
    'WARN',
    'ERROR'
  ];

  const normalized =
    String(level || 'INFO').toUpperCase();


  return allowedLevels.includes(normalized)
    ? normalized
    : 'INFO';
}


/**
 * 로그 Prefix 반환
 *
 * @returns {string}
 */
function _getLogPrefix() {

  if (
    typeof CONFIG !== 'undefined' &&
    CONFIG.LOG &&
    CONFIG.LOG.PREFIX
  ) {
    return CONFIG.LOG.PREFIX;
  }


  return '[한살림 부산 PMS]';
}


/**
 * 로그 시트명 반환
 *
 * @returns {string}
 */
function _getLogSheetName() {

  if (
    typeof CONFIG !== 'undefined' &&
    CONFIG.SHEETS &&
    CONFIG.SHEETS.LOG
  ) {
    return CONFIG.SHEETS.LOG;
  }


  return 'LOG';
}


/**
 * 로그 메시지 생성
 *
 * @param {string} message
 * @returns {string}
 */
function _formatLogMessage(message) {

  return `${_getLogPrefix()} ${String(message || '')}`;
}


/**
 * LOG 시트에 로그 기록
 *
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} module
 * @param {string} message
 * @returns {void}
 */
function writeLog(level, module, message) {

  try {

    const logSheet =
      getSheet(_getLogSheetName());


    const timestamp =
      Utilities.formatDate(
        new Date(),
        'Asia/Seoul',
        'yyyy-MM-dd HH:mm:ss'
      );


    logSheet.appendRow([
      timestamp,
      _normalizeLogLevel(level),
      String(module || 'SYSTEM'),
      _formatLogMessage(message)
    ]);


  } catch (error) {

    Logger.log(
      `[${LOG_MODULE_NAME}.writeLog 오류] ${error.message}`
    );

    throw error;
  }
}


/**
 * INFO 로그 기록
 *
 * @param {string} module
 * @param {string} message
 */
function writeInfo(module, message) {

  writeLog(
    'INFO',
    module,
    message
  );

}


/**
 * WARN 로그 기록
 *
 * @param {string} module
 * @param {string} message
 */
function writeWarn(module, message) {

  writeLog(
    'WARN',
    module,
    message
  );

}


/**
 * ERROR 로그 기록
 *
 * @param {string} module
 * @param {string} message
 */
function writeError(module, message) {

  writeLog(
    'ERROR',
    module,
    message
  );

}