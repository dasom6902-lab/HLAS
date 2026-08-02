/**
 * @fileoverview TASK-0021 Master Data read-only integration test.
 */

/**
 * Master Data 구조·Validation·참조 관계 회귀 테스트를 실행한다.
 *
 * 운영 데이터는 읽기만 하며 생성·수정·삭제하지 않는다.
 *
 * @return {{passed:boolean,results:Array<Object>,review:Object}} 테스트 결과
 */
function runMasterDataTests() {
  const results = [];
  const before = MasterDataRepository.readMasterData();
  const response = reviewMasterData();

  assertMasterDataTest_(response && response.ok, 'Master Data Review 실행');
  results.push(passMasterDataTest_('Master Data Review 실행'));

  const review = response.data;
  assertMasterDataTest_(
    review.structure.sheetName === HLAS_CONSTANTS.MASTER_DATA.MASTER_SHEET,
    '기초시트 구조 조회'
  );
  results.push(passMasterDataTest_('기초시트 구조 조회'));

  assertMasterDataTest_(
    review.structure.physicalHeaders.indexOf(
      HLAS_CONSTANTS.FIELD.MASTER_DATA.ITEM_CODE
    ) !== -1,
    '물품코드 컬럼 확인'
  );
  results.push(passMasterDataTest_('물품코드 컬럼 확인'));

  assertMasterDataTest_(
    typeof review.validation.valid === 'boolean',
    'Validation 결과 형식'
  );
  results.push(passMasterDataTest_('Validation 결과 형식'));

  assertMasterDataTest_(
    Array.isArray(review.dependencies) && review.dependencies.length === 6,
    '업무 의존 관계'
  );
  results.push(passMasterDataTest_('업무 의존 관계'));

  const after = MasterDataRepository.readMasterData();
  assertMasterDataTest_(
    before.records.length === after.records.length &&
      before.lastRow === after.lastRow,
    '운영 Master Data 무변경'
  );
  results.push(passMasterDataTest_('운영 Master Data 무변경'));

  assertMasterDataTest_(
    getProjectList({}).ok &&
      Array.isArray(getEpicList({})) &&
      getFeatureList({}).ok &&
      getFunctionList({}).ok &&
      getTaskList({}).ok,
    'PMS CRUD 회귀'
  );
  results.push(passMasterDataTest_('PMS CRUD 회귀'));

  return {
    passed: true,
    results: results,
    review: review,
  };
}

function passMasterDataTest_(name) {
  return { name: name, result: 'PASS' };
}

function assertMasterDataTest_(condition, message) {
  if (!condition) {
    throw new SystemError(
      '[TASK-0021] ' + message + ' 실패',
      { test: message },
      'MASTER_DATA_TEST_FAILED'
    );
  }
}
