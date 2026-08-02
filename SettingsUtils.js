const MODULE_NAME = "SettingsUtils";

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();

let settingsCache = null;


/**
 * 값 변환
 *
 * @param {*} value
 * @return {*}
 */
function _parseValue(value) {

  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}


/**
 * 저장 문자열 변환
 *
 * @param {*} value
 * @return {string}
 */
function _stringifyValue(value) {

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}


/**
 * 기본 입력 검증
 *
 * @param {string} key
 */
function _validateKey(key) {

  if (!key || typeof key !== "string") {
    throw new Error(
      `[${MODULE_NAME}] 유효한 KEY가 필요합니다.`
    );
  }
}


/**
 * Lock 실행
 *
 * @param {Function} callback
 * @return {*}
 */
function _executeWithLock(callback) {

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    throw new Error(
      `[${MODULE_NAME}] Lock 획득 실패`
    );
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}


/**
 * Cache 초기화
 */
function clearSettingsCache() {

  settingsCache = null;

}


/**
 * 설정 조회
 *
 * @param {string} key
 * @return {*}
 */
function get(key) {

  _validateKey(key);

  return _parseValue(
    SCRIPT_PROPERTIES.getProperty(key)
  );
}


/**
 * 설정 저장
 *
 * @param {string} key
 * @param {*} value
 */
function set(key, value) {

  _validateKey(key);

  if (value === undefined) {
    throw new Error(
      `[${MODULE_NAME}] VALUE가 필요합니다.`
    );
  }


  SCRIPT_PROPERTIES.setProperty(
    key,
    _stringifyValue(value)
  );


  clearSettingsCache();

}


/**
 * 설정 존재 여부
 *
 * @param {string} key
 * @return {boolean}
 */
function exists(key) {

  _validateKey(key);

  return SCRIPT_PROPERTIES.getProperty(key) !== null;

}


/**
 * 설정 삭제
 *
 * @param {string} key
 */
function remove(key) {

  _validateKey(key);

  SCRIPT_PROPERTIES.deleteProperty(key);

  clearSettingsCache();

}


/**
 * 값 증가
 *
 * @param {string} key
 * @return {number}
 */
function increment(key) {

  _validateKey(key);


  return _executeWithLock(() => {

    let value = Number(get(key) || 0);

    value++;

    set(key, value);

    return value;

  });

}


/**
 * 값 감소
 *
 * @param {string} key
 * @return {number}
 */
function decrement(key) {

  _validateKey(key);


  return _executeWithLock(() => {

    let value = Number(get(key) || 0);

    if (value <= 0) {
      return 0;
    }

    value--;

    set(key, value);

    return value;

  });

}


/**
 * 전체 설정 조회
 *
 * @return {Object}
 */
function getAll() {

  if (settingsCache !== null) {
    return settingsCache;
  }


  const properties =
    SCRIPT_PROPERTIES.getProperties();


  const result = {};


  Object.keys(properties)
    .forEach(key => {

      result[key] =
        _parseValue(properties[key]);

    });


  settingsCache = result;


  return result;

}


/**
 * 기존 API 호환
 *
 * @param {string} key
 * @param {*} defaultValue
 * @return {*}
 */
function getSetting(key, defaultValue = null) {

  const value = get(key);

  return value === null
    ? defaultValue
    : value;

}


/**
 * 기존 API 호환
 *
 * @param {string} key
 * @param {*} value
 */
function setSetting(key, value) {

  set(key, value);

}


/**
 * 기존 API 호환
 *
 * @param {string} key
 * @return {boolean}
 */
function deleteSetting(key) {

  if (!exists(key)) {
    return false;
  }


  remove(key);

  return true;

}


/**
 * 기존 API 호환
 *
 * @return {Object}
 */
function getAllSettings() {

  return getAll();

}