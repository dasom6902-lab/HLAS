/**
 * @fileoverview HLAS TASK 공개 API.
 *
 * 외부 호출 함수명을 유지하고 모든 업무 처리를 TaskService에 위임한다.
 */

/** @param {string=} functionId FUNCTION_ID @return {Object} 표준 응답 */
function getTaskList(functionId) {
  return taskServiceGetTaskList_(functionId);
}

/** @param {string} id TASK_ID @return {Object} 표준 응답 */
function getTask(id) {
  return taskServiceGetTask_(id);
}

/** @param {Object} data 생성 데이터 @return {Object} 표준 응답 */
function createTask(data) {
  return taskServiceCreateTask_(data);
}

/** @param {string} id TASK_ID @param {Object} data 수정 데이터 @return {Object} 표준 응답 */
function updateTask(id, data) {
  return taskServiceUpdateTask_(id, data);
}

/** @param {string} id TASK_ID @return {Object} 표준 응답 */
function deleteTask(id) {
  return taskServiceDeleteTask_(id);
}

/**
 * TASK Dialog 초기 데이터를 반환한다.
 *
 * @param {string=} taskId TASK_ID
 * @return {Object} 표준 응답
 */
function getTaskFormData(taskId) {
  return taskServiceGetTaskFormData_(taskId);
}
