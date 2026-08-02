/**
 * @fileoverview TASK-0021 Master Data 공개 API.
 */

/**
 * Master Data 전체 점검을 실행한다.
 *
 * @return {Object} CommonAPI 표준 응답
 */
function reviewMasterData() {
  return MasterDataService.review();
}

/**
 * Master Data 구조를 조회한다.
 *
 * @return {Object} CommonAPI 표준 응답
 */
function getMasterDataStructure() {
  return MasterDataService.getStructure();
}

/**
 * Master Data Validation을 실행한다.
 *
 * @return {Object} CommonAPI 표준 응답
 */
function validateMasterData() {
  return MasterDataService.validate();
}

/**
 * Master Data 의존 관계를 조회한다.
 *
 * @return {Object} CommonAPI 표준 응답
 */
function getMasterDataDependencies() {
  return MasterDataService.getDependencies();
}

