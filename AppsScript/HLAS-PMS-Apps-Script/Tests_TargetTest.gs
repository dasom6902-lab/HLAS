/**
 * @fileoverview TASK-0023 Planning Module 자동 테스트.
 */

/**
 * Repository, Service, API, Validator 및 기존 TASK 회귀 테스트를 실행한다.
 *
 * initializePMS() 실행 후 사용해야 하며 테스트 데이터는 종료 시 제거한다.
 *
 * @return {{passed:boolean,results:Array<Object>}} 테스트 결과
 */
function runTargetTests() {
  const results = [];
  const field = HLAS_CONSTANTS.FIELD.TARGET;
  const type = HLAS_CONSTANTS.TARGET_TYPE;
  const category = HLAS_CONSTANTS.TARGET_CATEGORY;
  const testYear = new Date().getFullYear() +
    HLAS_CONSTANTS.TARGET.RATE_MULTIPLIER;
  const created = [];

  try {
    assertTargetTest_(
      PlanningRegistry.isRegistered(type.ANNUAL) &&
        PlanningRegistry.isRegistered(type.STORE),
      'Registry Test'
    );
    results.push(passTargetTest_('Registry Test'));

    const annual = {};
    annual[field.YEAR] = testYear;
    annual[field.CATEGORY] = category.SUPPLY;
    annual[field.TARGET_AMOUNT] = 1000;
    const annualResponse = saveTarget(type.ANNUAL, annual);
    assertTargetTest_(annualResponse.ok, 'Repository Test');
    created.push({ type: type.ANNUAL, id: annualResponse.data[field.TARGET_ID] });
    results.push(passTargetTest_('Repository Test'));

    const achievement = getAchievement(1000, 750);
    assertTargetTest_(
      achievement.ok &&
        achievement.data.achievementRate === 75 &&
        achievement.data.variance === -250,
      'Service Test'
    );
    results.push(passTargetTest_('Service Test'));

    const query = {};
    query[field.YEAR] = testYear;
    query[field.CATEGORY] = category.SUPPLY;
    const apiResult = getTarget(type.ANNUAL, query);
    assertTargetTest_(
      apiResult.ok && apiResult.data.length === 1,
      'API Test'
    );
    results.push(passTargetTest_('API Test'));

    const invalid = {};
    invalid[field.YEAR] = testYear;
    invalid[field.CATEGORY] = category.STORE;
    invalid[field.TARGET_AMOUNT] = -1;
    const invalidResponse = saveTarget(type.ANNUAL, invalid);
    assertTargetTest_(
      !invalidResponse.ok &&
        invalidResponse.error.code === 'TARGET_AMOUNT_INVALID',
      'Validator Test'
    );
    results.push(passTargetTest_('Validator Test'));

    const duplicateResponse = saveTarget(type.ANNUAL, annual);
    assertTargetTest_(
      !duplicateResponse.ok &&
        duplicateResponse.error.code === 'TARGET_DUPLICATE',
      'Duplicate Test'
    );
    results.push(passTargetTest_('Duplicate Test'));

    assertTargetTest_(
      runMasterDataTests().passed && runArchitectureTests().passed,
      'Regression Test'
    );
    results.push(passTargetTest_('Regression Test'));

    return { passed: true, results: results };
  } finally {
    created.reverse().forEach(function (entry) {
      const tableName = PlanningRegistry.get(entry.type).tableName;
      if (SheetRepository.findById(tableName, entry.id)) {
        SheetRepository.delete(tableName, entry.id);
      }
    });
    cleanupTargetTestHistory_(testYear);
  }
}

function cleanupTargetTestHistory_(testYear) {
  const field = HLAS_CONSTANTS.FIELD.TARGET;
  const tableName = PMS_CONFIG.PLANNING_TABLES.TARGET_HISTORY;
  SheetRepository.findAll(tableName).forEach(function (history) {
    let afterValue = {};
    try {
      afterValue = JSON.parse(history[field.AFTER_VALUE] || '{}');
    } catch (ignore) {
      return;
    }
    if (Number(afterValue[field.YEAR]) !== Number(testYear)) {
      return;
    }
    const historyId = history[field.HISTORY_ID];
    if (historyId && SheetRepository.findById(tableName, historyId)) {
      SheetRepository.delete(tableName, historyId);
    }
  });
}

function passTargetTest_(name) {
  return { name: name, result: 'PASS' };
}

function assertTargetTest_(condition, message) {
  if (!condition) {
    throw new SystemError(
      '[TASK-0023] ' + message + ' 실패',
      { test: message },
      'TARGET_TEST_FAILED'
    );
  }
}
