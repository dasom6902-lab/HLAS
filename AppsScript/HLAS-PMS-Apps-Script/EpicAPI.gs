/**
 * @fileoverview HLAS EPIC 공개 API와 기존 UI 호환 어댑터.
 */

/** @return {Array<Object>} 프로젝트 선택 목록 */
function getProjectOptions() {
  const response = epicServiceGetProjectOptions_();
  if (!response.ok) {
    throw coreErrorFromResponse_(response.error);
  }
  return response.data;
}

/**
 * 기존 EPIC 생성 Dialog 호출을 유지한다.
 *
 * @param {Object} formData EPIC 입력값
 * @return {{success:boolean, epicId:string, message:string}} UI 결과
 */
function createEpicRecord(formData) {
  const response = epicServiceCreate_(formData);
  if (!response.ok) {
    throw coreErrorFromResponse_(response.error);
  }
  return {
    success: true,
    epicId: response.data.epicId,
    message: 'EPIC이 생성되었습니다.',
  };
}

/**
 * 기존 EPIC 목록 Dialog가 사용하는 배열 반환을 유지한다.
 *
 * @param {Object=} options 검색 옵션
 * @return {Array<Object>} EPIC 목록
 */
function getEpicList(options) {
  return epicServiceGetList_(options);
}

/** @param {string} id EPIC_ID @return {Object} 표준 응답 */
function deleteEpic(id) {
  return epicServiceDelete_(id);
}
