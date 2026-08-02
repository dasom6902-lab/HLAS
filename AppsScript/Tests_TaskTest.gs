/**
 * TASK API, ParentValidator, IdGenerator 및 기존 엔티티 회귀 테스트를 실행한다.
 *
 * 테스트용 FEATURE, FUNCTION, TASK는 종료 전에 삭제한다.
 *
 * @return {Object[]} 테스트 항목별 PASS/FAIL 결과
 */
function runTaskTests() {
  const results = [];
  let featureId = '';
  let functionId = '';
  let taskId = '';

  try {
    const epics = SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.EPIC);
    assertTaskTest_(epics.length > 0, '테스트에 사용할 EPIC이 없습니다.');
    const epicId = String(epics[0].EPIC_ID || '').trim();

    const epicRecord = validateParent(HLAS_CONSTANTS.ENTITY.EPIC, epicId);
    assertTaskTest_(String(epicRecord.EPIC_ID) === epicId, 'EPIC 부모 검증 실패');

    let invalidParentFailed = false;
    try {
      validateParent(HLAS_CONSTANTS.ENTITY.FUNCTION, 'FUNC-NOT-FOUND');
    } catch (error) {
      invalidParentFailed = error instanceof NotFoundError;
    }
    assertTaskTest_(invalidParentFailed, '없는 부모 검증이 실패하지 않았습니다.');
    recordTaskTest_(results, 'ParentValidator', true);

    const featureResponse = createFeature({
      epicId: epicId,
      featureName: 'TASK-0008 테스트 FEATURE',
      description: 'TASK 부모 연결 테스트',
      status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      priority: HLAS_CONSTANTS.PRIORITY.NORMAL,
      owner: 'Work',
    });
    assertTaskApiSuccess_(featureResponse, 'FEATURE 생성');
    featureId = featureResponse.data.featureId;

    const functionResponse = createFunction({
      featureId: featureId,
      functionName: 'TASK-0008 테스트 FUNCTION',
      description: 'TASK 부모 연결 테스트',
      inputDefinition: '',
      outputDefinition: '',
      relatedSheets: '05_TASK',
      status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      owner: 'Work',
    });
    assertTaskApiSuccess_(functionResponse, 'FUNCTION 생성');
    functionId = functionResponse.data.functionId;

    const nextTaskId = generateId(HLAS_CONSTANTS.ENTITY.TASK);
    assertTaskTest_(/^TASK-\d{4,}$/.test(nextTaskId), 'TASK ID 형식 오류');
    recordTaskTest_(results, 'IdGenerator', true);

    const createResponse = createTask({
      functionId: functionId,
      taskName: 'TASK-0008 실행 테스트',
      description: 'TASK API 실제 실행 테스트',
      status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      priority: HLAS_CONSTANTS.PRIORITY.NORMAL,
      owner: 'Work',
      startDate: '2026-07-28',
      plannedEndDate: '2026-07-31',
      completedDate: '',
      progress: 10,
    });
    assertTaskApiSuccess_(createResponse, 'TASK 생성');
    taskId = createResponse.data.taskId;
    assertTaskTest_(taskId === nextTaskId, 'TASK가 IdGenerator 결과를 사용하지 않았습니다.');
    recordTaskTest_(results, 'TASK 생성', true);

    const getResponse = getTask(taskId);
    assertTaskApiSuccess_(getResponse, 'TASK 조회');
    assertTaskTest_(
      getResponse.data.functionId === functionId,
      'FUNCTION 연결값이 일치하지 않습니다.'
    );
    recordTaskTest_(results, 'TASK 조회', true);
    recordTaskTest_(results, 'FUNCTION 연결 확인', true);

    const updateResponse = updateTask(taskId, {
      functionId: functionId,
      taskName: 'TASK-0008 실행 테스트 수정',
      description: '수정 완료',
      status: HLAS_CONSTANTS.STATUS.COMPLETED,
      priority: HLAS_CONSTANTS.PRIORITY.HIGH,
      owner: 'Work',
      startDate: '2026-07-28',
      plannedEndDate: '2026-07-31',
      completedDate: '2026-07-30',
      progress: 100,
    });
    assertTaskApiSuccess_(updateResponse, 'TASK 수정');
    assertTaskTest_(updateResponse.data.progress === 100, '진행률 수정 실패');
    recordTaskTest_(results, 'TASK 수정', true);

    const listResponse = getTaskList(functionId);
    assertTaskApiSuccess_(listResponse, 'TASK 목록 조회');
    assertTaskTest_(
      listResponse.data.some(function (item) {
        return item.taskId === taskId;
      }),
      '목록에서 TASK를 찾을 수 없습니다.'
    );
    recordTaskTest_(results, 'TASK 목록 조회', true);

    assertTaskTest_(Array.isArray(getProjectOptions()), 'PROJECT 조회 실패');
    recordTaskTest_(results, '기존 PROJECT 기능', true);
    assertTaskTest_(Array.isArray(getEpicList()), 'EPIC 조회 실패');
    recordTaskTest_(results, '기존 EPIC 기능', true);
    assertTaskApiSuccess_(getFeatureList(), 'FEATURE 조회');
    recordTaskTest_(results, '기존 FEATURE 기능', true);
    assertTaskApiSuccess_(getFunctionList(''), 'FUNCTION 조회');
    recordTaskTest_(results, '기존 FUNCTION 기능', true);

    assertTaskApiSuccess_(deleteTask(taskId), 'TASK 삭제');
    taskId = '';
    recordTaskTest_(results, 'TASK 삭제', true);
    assertTaskApiSuccess_(deleteFunction(functionId), 'FUNCTION 삭제');
    functionId = '';
    assertTaskApiSuccess_(deleteFeature(featureId), 'FEATURE 삭제');
    featureId = '';

    Logger.log('[TASK-0008] 전체 테스트 PASS');
    return results;
  } catch (error) {
    recordTaskTest_(results, '테스트 실행', false, error.message);
    Logger.log('[TASK-0008] 테스트 FAIL: ' + error.message);
    throw error;
  } finally {
    cleanupTaskTestRecord_(HLAS_CONSTANTS.SHEETS.TASK, taskId);
    cleanupTaskTestRecord_(HLAS_CONSTANTS.SHEETS.FUNCTION, functionId);
    cleanupTaskTestRecord_(HLAS_CONSTANTS.SHEETS.FEATURE, featureId);
  }
}

function cleanupTaskTestRecord_(sheetName, id) {
  if (id && SheetRepository.findById(sheetName, id)) {
    SheetRepository.delete(sheetName, id);
  }
}

function assertTaskApiSuccess_(response, testName) {
  assertTaskTest_(
    response && response.ok === true,
    testName +
      ' 실패: ' +
      (response && response.error ? response.error.message : '응답 없음')
  );
}

function assertTaskTest_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function recordTaskTest_(results, name, passed, message) {
  const result = {
    name: name,
    result: passed ? 'PASS' : 'FAIL',
    message: message || '',
  };
  results.push(result);
  Logger.log('[' + result.result + '] ' + name + (message ? ': ' + message : ''));
}
