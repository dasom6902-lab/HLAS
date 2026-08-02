/**
 * @fileoverview HLAS FEATURE 공개 API.
 *
 * 외부 호출 함수명을 유지하고 모든 업무 처리를 FeatureService에 위임한다.
 */

/** @param {Object=} options 검색 옵션 @return {Object} 표준 응답 */
function getFeatureList(options) {
  return featureServiceGetFeatureList_(options);
}

/** @param {string} id FEATURE_ID @return {Object} 표준 응답 */
function getFeature(id) {
  return featureServiceGetFeature_(id);
}

/** @param {Object} data 생성 데이터 @return {Object} 표준 응답 */
function createFeature(data) {
  return featureServiceCreateFeature_(data);
}

/** @param {string} id FEATURE_ID @param {Object} data 수정 데이터 @return {Object} 표준 응답 */
function updateFeature(id, data) {
  return featureServiceUpdateFeature_(id, data);
}

/** @param {string} id FEATURE_ID @return {Object} 표준 응답 */
function deleteFeature(id) {
  return featureServiceDeleteFeature_(id);
}

/**
 * FEATURE Dialog 초기 데이터를 반환한다.
 *
 * @param {string=} featureId FEATURE_ID
 * @return {Object} 표준 응답
 */
function getFeatureFormData(featureId) {
  return featureServiceGetFeatureFormData_(featureId);
}
