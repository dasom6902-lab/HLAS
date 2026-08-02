/**
 * FEATURE API 생성·조회·수정·삭제 및 기존 기능 회귀 테스트를 실행한다.
 *
 * 테스트 FEATURE는 종료 전에 삭제하며, CREATE/UPDATE/DELETE 이력은
 * 실제 실행 증적으로 CHANGELOG에 남긴다.
 *
 * @return {Object[]} 테스트 항목별 PASS/FAIL 결과
 */
function runFeatureTests() {
  const results = [];
  let createdFeatureId = '';

  try {
    const epicRecords = SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.EPIC);
    assertFeatureTest_(epicRecords.length > 0, '테스트에 사용할 EPIC이 없습니다.');
    const epicId = String(epicRecords[0].EPIC_ID || '').trim();

    const createResponse = createFeature({
      epicId: epicId,
      featureName: 'TASK-0006 실행 테스트',
      description: 'FEATURE API 실제 실행 테스트 데이터',
      status: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      priority: HLAS_CONSTANTS.PRIORITY.NORMAL,
      owner: 'Work',
    });
    assertFeatureApiSuccess_(createResponse, 'Feature 생성');
    createdFeatureId = createResponse.data.featureId;
    recordFeatureTest_(results, 'Feature 생성', true);

    const getResponse = getFeature(createdFeatureId);
    assertFeatureApiSuccess_(getResponse, 'Feature 조회');
    assertFeatureTest_(
      getResponse.data.epicId === epicId,
      'EPIC 연결값이 일치하지 않습니다.'
    );
    recordFeatureTest_(results, 'Feature 조회', true);
    recordFeatureTest_(results, 'Epic 연결 확인', true);

    const updateResponse = updateFeature(createdFeatureId, {
      epicId: epicId,
      featureName: 'TASK-0006 실행 테스트 수정',
      description: '수정 검증 완료',
      status: HLAS_CONSTANTS.STATUS.COMPLETED,
      priority: HLAS_CONSTANTS.PRIORITY.HIGH,
      owner: 'Work',
    });
    assertFeatureApiSuccess_(updateResponse, 'Feature 수정');
    assertFeatureTest_(
      updateResponse.data.status === HLAS_CONSTANTS.STATUS.COMPLETED,
      '수정된 상태값이 일치하지 않습니다.'
    );
    recordFeatureTest_(results, 'Feature 수정', true);

    const listResponse = getFeatureList();
    assertFeatureApiSuccess_(listResponse, 'Feature 목록 조회');
    assertFeatureTest_(
      listResponse.data.some(function (item) {
        return item.featureId === createdFeatureId;
      }),
      '목록에서 생성한 FEATURE를 찾을 수 없습니다.'
    );
    recordFeatureTest_(results, 'Feature 목록 조회', true);

    const projectOptions = getProjectOptions();
    assertFeatureTest_(Array.isArray(projectOptions), 'PROJECT 조회 실패');
    recordFeatureTest_(results, '기존 PROJECT 기능', true);

    const existingEpicList = getEpicList();
    assertFeatureTest_(Array.isArray(existingEpicList), 'EPIC 조회 실패');
    recordFeatureTest_(results, '기존 EPIC 기능', true);

    const deleteResponse = deleteFeature(createdFeatureId);
    assertFeatureApiSuccess_(deleteResponse, 'Feature 삭제');
    createdFeatureId = '';
    recordFeatureTest_(results, 'Feature 삭제', true);

    Logger.log('[TASK-0006] 전체 테스트 PASS');
    return results;
  } catch (error) {
    recordFeatureTest_(results, '테스트 실행', false, error.message);
    Logger.log('[TASK-0006] 테스트 FAIL: ' + error.message);
    throw error;
  } finally {
    if (createdFeatureId) {
      const existing = SheetRepository.findById(
        HLAS_CONSTANTS.SHEETS.FEATURE,
        createdFeatureId
      );
      if (existing) {
        SheetRepository.delete(HLAS_CONSTANTS.SHEETS.FEATURE, createdFeatureId);
      }
    }
  }
}

function assertFeatureApiSuccess_(response, testName) {
  assertFeatureTest_(
    response && response.ok === true,
    testName +
      ' 실패: ' +
      (response && response.error ? response.error.message : '응답 없음')
  );
}

function assertFeatureTest_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function recordFeatureTest_(results, name, passed, message) {
  const result = {
    name: name,
    result: passed ? 'PASS' : 'FAIL',
    message: message || '',
  };
  results.push(result);
  Logger.log('[' + result.result + '] ' + name + (message ? ': ' + message : ''));
}
