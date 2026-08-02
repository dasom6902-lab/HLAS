/**
 * @fileoverview 한살림 부산 PMS SETTINGS 시트 KEY-VALUE 환경설정 관리 모듈
 * @version 1.0.0
 */

/**
 * SETTINGS 시트 데이터 메모리 캐시 객체
 * @type {Object<string, *>|null}
 */
let settingsCache = null;

/**
 * 캐시를 초기화합니다.
 *
 * @returns {void}
 *
 * @example
 * clearSettingsCache();
 */
function clearSettingsCache() {
  settingsCache = null;
}

/**
 * SETTINGS 시트의 모든 KEY-VALUE 설정값을 읽어 자바스크립트 객체로 반환하고 캐시에 저장합니다.
 *
 * @returns {Object<string, *>} KEY-VALUE 구조의 환경설정 객체
 * @throws {Error} SETTINGS 시트 접근 실패 시
 *
 * @example
 * const settings = getAllSettings();
 * Logger.log(settings['MAX_LOG_DAYS']);
 */
function getAllSettings() {
  if (settingsCache !== null) {
    return settingsCache;
  }

  const MODULE_NAME = 'SettingsUtils';
  const sheetName = CONFIG.SHEETS.SETTINGS;
  const sheet = getSheet(sheetName);

  const lastRow = sheet.getLastRow();
  const settings = {};

  // 헤더만 있거나 데이터가 없는 경우 빈 객체 반환 및 캐싱
  if (lastRow <= 1) {
    settingsCache = settings;
    return settings;
  }

  // A2:B 범위의 전체 데이터 읽기 (KEY, VALUE)
  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();

  for (let i = 0; i < values.length; i++) {
    const key = String(values[i][0]).trim();
    const value = values[i][1];

    if (key !== '') {
      settings[key] = value;
    }
  }

  settingsCache = settings;
  return settings;
}

/**
 * 특정 KEY에 해당하는 환경설정 VALUE를 조회합니다.
 * (캐시가 없을 경우 getAllSettings()를 호출하여 캐시를 먼저 생성합니다.)
 *
 * @param {string} key - 조회할 설정 KEY
 * @param {*} [defaultValue=null] - KEY가 존재하지 않을 때 반환할 기본값
 * @returns {*} KEY에 해당하는 VALUE 또는 defaultValue
 *
 * @example
 * const maxRetry = getSetting('MAX_RETRY_COUNT', 3);
 */
function getSetting(key, defaultValue = null) {
  if (!key || typeof key !== 'string') {
    return defaultValue;
  }

  const targetKey = key.trim();
  const settings = getAllSettings();

  if (Object.prototype.hasOwnProperty.call(settings, targetKey)) {
    return settings[targetKey];
  }

  return defaultValue;
}

/**
 * SETTINGS 시트에 KEY-VALUE 설정값을 등록하거나 수정(Upsert)하고 캐시를 갱신합니다.
 *
 * @param {string} key - 설정 KEY
 * @param {*} value - 설정 VALUE
 * @returns {void}
 * @throws {Error} KEY가 유효하지 않거나 처리 중 에러 발생 시
 *
 * @example
 * setSetting('MAX_RETRY_COUNT', 5);
 */
function setSetting(key, value) {
  const MODULE_NAME = 'SettingsUtils';

  if (!key || typeof key !== 'string') {
    const errorMsg = '유효한 KEY(문자열)를 입력해야 합니다.';
    writeError(MODULE_NAME, `setSetting 실패: ${errorMsg}`);
    throw new Error(`[SettingsUtils.setSetting] ${errorMsg}`);
  }

  const targetKey = key.trim();
  const sheetName = CONFIG.SHEETS.SETTINGS;
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();

  let targetRow = -1;

  if (lastRow > 1) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0]).trim() === targetKey) {
        targetRow = i + 2; // 1-indexed 및 헤더 행(1행) 반영
        break;
      }
    }
  }

  if (targetRow !== -1) {
    // 기존 KEY 존재 -> VALUE 수정
    sheet.getRange(targetRow, 2).setValue(value);
    writeInfo(MODULE_NAME, `설정 수정 완료: KEY="${targetKey}", VALUE="${value}"`);
  } else {
    // 신규 KEY -> 새로운 행 추가 (KEY 중복 방지)
    sheet.appendRow([targetKey, value]);
    writeInfo(MODULE_NAME, `신규 설정 등록 완료: KEY="${targetKey}", VALUE="${value}"`);
  }

  // 시트 수정 후 캐시 갱신
  clearSettingsCache();
  getAllSettings();
}

/**
 * SETTINGS 시트에서 특정 KEY의 환경설정 항목 행을 삭제하고 캐시를 갱신합니다.
 *
 * @param {string} key - 삭제할 설정 KEY
 * @returns {boolean} 삭제 성공 여부 (삭제 성공 시 true, KEY 미존재 시 false)
 *
 * @example
 * const isDeleted = deleteSetting('TEMP_CONFIG');
 */
function deleteSetting(key) {
  const MODULE_NAME = 'SettingsUtils';

  if (!key || typeof key !== 'string') {
    return false;
  }

  const targetKey = key.trim();
  const sheetName = CONFIG.SHEETS.SETTINGS;
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return false;
  }

  const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRow = -1;

  for (let i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === targetKey) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow !== -1) {
    sheet.deleteRow(targetRow);
    writeInfo(MODULE_NAME, `설정 삭제 완료: KEY="${targetKey}"`);

    // 시트 수정 후 캐시 갱신
    clearSettingsCache();
    getAllSettings();
    return true;
  }

  return false;
}