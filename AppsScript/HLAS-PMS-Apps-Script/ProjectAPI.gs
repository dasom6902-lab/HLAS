/**
 * @fileoverview HLAS PROJECT 공개 API와 기존 UI 호환 어댑터.
 */

/**
 * 기존 프로젝트 생성 Dialog 호출을 유지한다.
 *
 * @param {Object} formData 프로젝트 입력값
 * @return {{success:boolean, projectId:string, message:string}} UI 결과
 */
function createProjectRecord(formData) {
  const response = projectServiceCreate_(formData);
  if (!response.ok) {
    throw coreErrorFromResponse_(response.error);
  }
  return {
    success: true,
    projectId: response.data.projectId,
    message: '프로젝트가 생성되었습니다.',
  };
}

/** @param {Object=} options 검색 옵션 @return {Object} 표준 응답 */
function getProjectList(options) {
  return projectServiceGetList_(options);
}

/** @param {string} id PROJECT_ID @return {Object} 표준 응답 */
function deleteProject(id) {
  return projectServiceDelete_(id);
}
