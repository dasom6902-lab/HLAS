/**
 * @fileoverview HLAS FUNCTION 공개 API.
 *
 * 외부 호출 함수명을 유지하고 모든 업무 처리를 FunctionService에 위임한다.
 */

/** @param {string=} featureId FEATURE_ID @return {Object} 표준 응답 */
function getFunctionList(featureId) {
  return functionServiceGetFunctionList_(featureId);
}

/** @param {string} id FUNCTION_ID @return {Object} 표준 응답 */
function getFunction(id) {
  return functionServiceGetFunction_(id);
}

/** @param {Object} data 생성 데이터 @return {Object} 표준 응답 */
function createFunction(data) {
  return functionServiceCreateFunction_(data);
}

/** @param {string} id FUNCTION_ID @param {Object} data 수정 데이터 @return {Object} 표준 응답 */
function updateFunction(id, data) {
  return functionServiceUpdateFunction_(id, data);
}

/** @param {string} id FUNCTION_ID @return {Object} 표준 응답 */
function deleteFunction(id) {
  return functionServiceDeleteFunction_(id);
}

/**
 * FUNCTION Dialog 초기 데이터를 반환한다.
 *
 * @param {string=} functionId FUNCTION_ID
 * @return {Object} 표준 응답
 */
function getFunctionFormData(functionId) {
  return functionServiceGetFunctionFormData_(functionId);
}
