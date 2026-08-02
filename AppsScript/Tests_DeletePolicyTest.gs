/**
 * 참조 무결성 삭제 정책과 전체 엔티티 회귀 테스트를 실행한다.
 *
 * 테스트 계층은 PROJECT→EPIC→FEATURE→FUNCTION→TASK 순으로 생성하며,
 * 상위 삭제 차단을 확인한 뒤 하위부터 정상 삭제한다.
 *
 * @return {Object[]} 항목별 PASS/FAIL 결과
 */
function runDeletePolicyTests() {
  const results = [];
  const ids = {
    project: '',
    epic: '',
    feature: '',
    function: '',
    task: '',
  };

  try {
    createDeletePolicyFixture_(ids);

    const logCountBeforeBlocked = SheetRepository
      .findAll(HLAS_CONSTANTS.SHEETS.CHANGELOG).length;

    assertDeletePolicyBlocked_(
      deleteProject(ids.project),
      '하위 EPIC이 존재합니다.',
      'PROJECT 삭제 제한'
    );
    recordDeletePolicyTest_(results, 'PROJECT 삭제 제한', true);

    assertDeletePolicyBlocked_(
      deleteEpic(ids.epic),
      '하위 FEATURE가 존재합니다.',
      'EPIC 삭제 제한'
    );
    recordDeletePolicyTest_(results, 'EPIC 삭제 제한', true);

    assertDeletePolicyBlocked_(
      deleteFeature(ids.feature),
      '하위 FUNCTION이 존재합니다.',
      'FEATURE 삭제 제한'
    );
    recordDeletePolicyTest_(results, 'FEATURE 삭제 제한', true);

    assertDeletePolicyBlocked_(
      deleteFunction(ids.function),
      '하위 TASK가 존재합니다.',
      'FUNCTION 삭제 제한'
    );
    recordDeletePolicyTest_(results, 'FUNCTION 삭제 제한', true);

    const logCountAfterBlocked = SheetRepository
      .findAll(HLAS_CONSTANTS.SHEETS.CHANGELOG).length;
    assertDeletePolicyTest_(
      logCountAfterBlocked === logCountBeforeBlocked,
      '삭제 실패 시 CHANGELOG가 기록되었습니다.'
    );
    recordDeletePolicyTest_(results, '삭제 실패 CHANGELOG 미기록', true);

    assertDeletePolicySuccess_(deleteTask(ids.task), 'TASK 삭제 가능');
    ids.task = '';
    recordDeletePolicyTest_(results, 'TASK 삭제 가능', true);

    assertDeletePolicySuccess_(
      deleteFunction(ids.function),
      'FUNCTION 하위 삭제 후 삭제'
    );
    ids.function = '';
    recordDeletePolicyTest_(results, 'FUNCTION 삭제', true);

    assertDeletePolicySuccess_(
      deleteFeature(ids.feature),
      'FEATURE 하위 삭제 후 삭제'
    );
    ids.feature = '';
    recordDeletePolicyTest_(results, 'FEATURE 삭제', true);

    assertDeletePolicySuccess_(
      deleteEpic(ids.epic),
      'EPIC 하위 삭제 후 삭제'
    );
    ids.epic = '';
    recordDeletePolicyTest_(results, 'EPIC 삭제', true);

    assertDeletePolicySuccess_(
      deleteProject(ids.project),
      'PROJECT 하위 삭제 후 삭제'
    );
    ids.project = '';
    recordDeletePolicyTest_(results, 'PROJECT 삭제', true);

    assertDeletePolicyTest_(
      Array.isArray(getProjectOptions()),
      'PROJECT 회귀 테스트 실패'
    );
    recordDeletePolicyTest_(results, '기존 PROJECT', true);
    assertDeletePolicyTest_(Array.isArray(getEpicList()), 'EPIC 회귀 테스트 실패');
    recordDeletePolicyTest_(results, '기존 EPIC', true);
    assertDeletePolicySuccess_(getFeatureList(), 'FEATURE 회귀 테스트');
    recordDeletePolicyTest_(results, '기존 FEATURE', true);
    assertDeletePolicySuccess_(getFunctionList(''), 'FUNCTION 회귀 테스트');
    recordDeletePolicyTest_(results, '기존 FUNCTION', true);
    assertDeletePolicySuccess_(getTaskList(''), 'TASK 회귀 테스트');
    recordDeletePolicyTest_(results, '기존 TASK', true);

    Logger.log('[TASK-0009] 전체 테스트 PASS');
    return results;
  } catch (error) {
    recordDeletePolicyTest_(results, '테스트 실행', false, error.message);
    Logger.log('[TASK-0009] 테스트 FAIL: ' + error.message);
    throw error;
  } finally {
    cleanupDeletePolicyFixture_(ids);
  }
}

function createDeletePolicyFixture_(ids) {
  const now = new Date();
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    ids.project = generateId(HLAS_CONSTANTS.ENTITY.PROJECT);
    SheetRepository.insert(HLAS_CONSTANTS.SHEETS.PROJECT, {
      PROJECT_ID: ids.project,
      프로젝트명: 'TASK-0009 테스트 PROJECT',
      설명: '참조 무결성 테스트',
      상태: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      현재버전: '',
      담당자: 'Work',
      시작일: '',
      종료예정일: '',
      생성일시: now,
      수정일시: now,
    });

    ids.epic = generateId(HLAS_CONSTANTS.ENTITY.EPIC);
    SheetRepository.insert(HLAS_CONSTANTS.SHEETS.EPIC, {
      EPIC_ID: ids.epic,
      PROJECT_ID: ids.project,
      EPIC명: 'TASK-0009 테스트 EPIC',
      설명: '참조 무결성 테스트',
      상태: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      우선순위: HLAS_CONSTANTS.PRIORITY.NORMAL,
      담당자: 'Work',
      시작일: '',
      종료예정일: '',
      생성일시: now,
      수정일시: now,
    });
  } finally {
    lock.releaseLock();
  }

  const featureResponse = createFeature({
    epicId: ids.epic,
    featureName: 'TASK-0009 테스트 FEATURE',
    description: '참조 무결성 테스트',
    status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
    priority: HLAS_CONSTANTS.PRIORITY.NORMAL,
    owner: 'Work',
  });
  assertDeletePolicySuccess_(featureResponse, '테스트 FEATURE 생성');
  ids.feature = featureResponse.data.featureId;

  const functionResponse = createFunction({
    featureId: ids.feature,
    functionName: 'TASK-0009 테스트 FUNCTION',
    description: '참조 무결성 테스트',
    inputDefinition: '',
    outputDefinition: '',
    relatedSheets: HLAS_CONSTANTS.SHEETS.TASK,
    status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
    owner: 'Work',
  });
  assertDeletePolicySuccess_(functionResponse, '테스트 FUNCTION 생성');
  ids.function = functionResponse.data.functionId;

  const taskResponse = createTask({
    functionId: ids.function,
    taskName: 'TASK-0009 테스트 TASK',
    description: '참조 무결성 테스트',
    status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
    priority: HLAS_CONSTANTS.PRIORITY.NORMAL,
    owner: 'Work',
    progress: 0,
  });
  assertDeletePolicySuccess_(taskResponse, '테스트 TASK 생성');
  ids.task = taskResponse.data.taskId;
}

function cleanupDeletePolicyFixture_(ids) {
  const targets = [
    [HLAS_CONSTANTS.SHEETS.TASK, ids.task],
    [HLAS_CONSTANTS.SHEETS.FUNCTION, ids.function],
    [HLAS_CONSTANTS.SHEETS.FEATURE, ids.feature],
    [HLAS_CONSTANTS.SHEETS.EPIC, ids.epic],
    [HLAS_CONSTANTS.SHEETS.PROJECT, ids.project],
  ];

  targets.forEach(function (target) {
    if (target[1] && SheetRepository.findById(target[0], target[1])) {
      SheetRepository.delete(target[0], target[1]);
    }
  });
}

function assertDeletePolicyBlocked_(response, expectedMessage, testName) {
  assertDeletePolicyTest_(
    response &&
      response.ok === false &&
      response.error &&
      response.error.code === 'REFERENTIAL_INTEGRITY' &&
      response.error.message === expectedMessage,
    testName + ' 실패'
  );
}

function assertDeletePolicySuccess_(response, testName) {
  assertDeletePolicyTest_(
    response && response.ok === true,
    testName +
      ' 실패: ' +
      (response && response.error ? response.error.message : '응답 없음')
  );
}

function assertDeletePolicyTest_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function recordDeletePolicyTest_(results, name, passed, message) {
  const result = {
    name: name,
    result: passed ? 'PASS' : 'FAIL',
    message: message || '',
  };
  results.push(result);
  Logger.log('[' + result.result + '] ' + name + (message ? ': ' + message : ''));
}
