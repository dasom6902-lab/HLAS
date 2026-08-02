/**
 * FUNCTION API, IdGenerator, 기존 엔티티 회귀 테스트를 실행한다.
 *
 * 테스트용 FEATURE와 FUNCTION은 종료 전에 삭제하며, 실행 이력은
 * CHANGELOG에 남긴다.
 *
 * @return {Object[]} 테스트 항목별 PASS/FAIL 결과
 */
function runFunctionTests() {
  const results = [];
  let testFeatureId = '';
  let testFunctionId = '';

  try {
    const epicRecords = SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.EPIC);
    assertFunctionTest_(epicRecords.length > 0, '테스트에 사용할 EPIC이 없습니다.');
    const epicId = String(epicRecords[0].EPIC_ID || '').trim();

    const nextFeatureId = generateId(HLAS_CONSTANTS.ENTITY.FEATURE);
    assertFunctionTest_(
      /^FEAT-\d{4,}$/.test(nextFeatureId),
      'FEATURE ID 생성 형식이 올바르지 않습니다.'
    );
    const nextFunctionId = generateId(HLAS_CONSTANTS.ENTITY.FUNCTION);
    assertFunctionTest_(
      /^FUNC-\d{4,}$/.test(nextFunctionId),
      'FUNCTION ID 생성 형식이 올바르지 않습니다.'
    );
    recordFunctionTest_(results, 'IdGenerator 정상 동작', true);

    const featureResponse = createFeature({
      epicId: epicId,
      featureName: 'TASK-0007 테스트 FEATURE',
      description: 'FUNCTION 연결 테스트용',
      status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      priority: HLAS_CONSTANTS.PRIORITY.NORMAL,
      owner: 'Work',
    });
    assertFunctionApiSuccess_(featureResponse, '기존 FEATURE 생성');
    testFeatureId = featureResponse.data.featureId;
    assertFunctionTest_(
      testFeatureId === nextFeatureId,
      'FEATURE가 IdGenerator 결과를 사용하지 않았습니다.'
    );
    recordFunctionTest_(results, '기존 FEATURE 및 IdGenerator 리팩터링', true);

    const createResponse = createFunction({
      featureId: testFeatureId,
      functionName: 'TASK-0007 실행 테스트',
      description: 'FUNCTION API 실제 실행 테스트',
      inputDefinition: '테스트 입력',
      outputDefinition: '테스트 출력',
      relatedSheets: '04_FUNCTION',
      status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      owner: 'Work',
    });
    assertFunctionApiSuccess_(createResponse, 'FUNCTION 생성');
    testFunctionId = createResponse.data.functionId;
    recordFunctionTest_(results, 'FUNCTION 생성', true);

    const getResponse = getFunction(testFunctionId);
    assertFunctionApiSuccess_(getResponse, 'FUNCTION 조회');
    assertFunctionTest_(
      getResponse.data.featureId === testFeatureId,
      'FEATURE 연결값이 일치하지 않습니다.'
    );
    recordFunctionTest_(results, 'FUNCTION 조회', true);
    recordFunctionTest_(results, 'FEATURE 연결 확인', true);

    const updateResponse = updateFunction(testFunctionId, {
      featureId: testFeatureId,
      functionName: 'TASK-0007 실행 테스트 수정',
      description: '수정 완료',
      inputDefinition: '수정 입력',
      outputDefinition: '수정 출력',
      relatedSheets: '03_FEATURE, 04_FUNCTION',
      status: HLAS_CONSTANTS.STATUS.COMPLETED,
      owner: 'Work',
    });
    assertFunctionApiSuccess_(updateResponse, 'FUNCTION 수정');
    assertFunctionTest_(
      updateResponse.data.status === HLAS_CONSTANTS.STATUS.COMPLETED,
      '수정 상태가 일치하지 않습니다.'
    );
    recordFunctionTest_(results, 'FUNCTION 수정', true);

    const listResponse = getFunctionList(testFeatureId);
    assertFunctionApiSuccess_(listResponse, 'FUNCTION 목록 조회');
    assertFunctionTest_(
      listResponse.data.some(function (item) {
        return item.functionId === testFunctionId;
      }),
      '목록에서 생성한 FUNCTION을 찾을 수 없습니다.'
    );
    recordFunctionTest_(results, 'FUNCTION 목록 조회', true);

    assertFunctionTest_(Array.isArray(getProjectOptions()), 'PROJECT 조회 실패');
    recordFunctionTest_(results, '기존 PROJECT 기능', true);
    assertFunctionTest_(Array.isArray(getEpicList()), 'EPIC 조회 실패');
    recordFunctionTest_(results, '기존 EPIC 기능', true);
    const featureListResponse = getFeatureList();
    assertFunctionApiSuccess_(featureListResponse, '기존 FEATURE 조회');
    recordFunctionTest_(results, '기존 FEATURE 기능', true);

    const deleteResponse = deleteFunction(testFunctionId);
    assertFunctionApiSuccess_(deleteResponse, 'FUNCTION 삭제');
    testFunctionId = '';
    recordFunctionTest_(results, 'FUNCTION 삭제', true);

    const featureDeleteResponse = deleteFeature(testFeatureId);
    assertFunctionApiSuccess_(featureDeleteResponse, '테스트 FEATURE 삭제');
    testFeatureId = '';

    Logger.log('[TASK-0007] 전체 테스트 PASS');
    return results;
  } catch (error) {
    recordFunctionTest_(results, '테스트 실행', false, error.message);
    Logger.log('[TASK-0007] 테스트 FAIL: ' + error.message);
    throw error;
  } finally {
    if (testFunctionId) {
      const functionRecord = SheetRepository.findById(
        HLAS_CONSTANTS.SHEETS.FUNCTION,
        testFunctionId
      );
      if (functionRecord) {
        SheetRepository.delete(
          HLAS_CONSTANTS.SHEETS.FUNCTION,
          testFunctionId
        );
      }
    }
    if (testFeatureId) {
      const featureRecord = SheetRepository.findById(
        HLAS_CONSTANTS.SHEETS.FEATURE,
        testFeatureId
      );
      if (featureRecord) {
        SheetRepository.delete(
          HLAS_CONSTANTS.SHEETS.FEATURE,
          testFeatureId
        );
      }
    }
  }
}

function assertFunctionApiSuccess_(response, testName) {
  assertFunctionTest_(
    response && response.ok === true,
    testName +
      ' 실패: ' +
      (response && response.error ? response.error.message : '응답 없음')
  );
}

function assertFunctionTest_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function recordFunctionTest_(results, name, passed, message) {
  const result = {
    name: name,
    result: passed ? 'PASS' : 'FAIL',
    message: message || '',
  };
  results.push(result);
  Logger.log('[' + result.result + '] ' + name + (message ? ': ' + message : ''));
}
