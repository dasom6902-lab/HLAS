/**
 * 공통 검색·필터·정렬 엔진과 5개 엔티티 회귀 테스트를 실행한다.
 *
 * @return {Object[]} 항목별 PASS/FAIL 결과
 */
function runSearchServiceTests() {
  const results = [];
  const created = [];
  try {
    const fixture = createSearchFixture_(created);

    assertSearchCount_(
      search(HLAS_CONSTANTS.ENTITY.TASK, { keyword: 'alpha' }),
      1, 'Keyword 검색'
    );
    recordSearchTest_(results, 'Keyword 검색', true);

    assertSearchCount_(
      search(HLAS_CONSTANTS.ENTITY.TASK, { status: HLAS_CONSTANTS.STATUS.COMPLETED }),
      1, 'Status Filter'
    );
    recordSearchTest_(results, 'Status Filter', true);

    assertSearchCount_(
      search(HLAS_CONSTANTS.ENTITY.TASK, { priority: HLAS_CONSTANTS.PRIORITY.HIGH }),
      1, 'Priority Filter'
    );
    recordSearchTest_(results, 'Priority Filter', true);

    assertSearchCount_(
      search(HLAS_CONSTANTS.ENTITY.FEATURE, { parentId: fixture.epicId }),
      1, 'FEATURE Parent Filter'
    );
    assertSearchCount_(
      search(HLAS_CONSTANTS.ENTITY.FUNCTION, { parentId: fixture.featureId }),
      1, 'FUNCTION Parent Filter'
    );
    assertSearchCount_(
      search(HLAS_CONSTANTS.ENTITY.TASK, { parentId: fixture.functionId }),
      2, 'TASK Parent Filter'
    );
    recordSearchTest_(results, 'Parent Filter', true);

    const asc = assertSearchSuccess_(
      search(HLAS_CONSTANTS.ENTITY.TASK, {
        parentId: fixture.functionId, sortBy: 'name', sortOrder: 'asc'
      }),
      'Sort ASC'
    );
    assertSearchTest_(
      asc[0][HLAS_CONSTANTS.FIELD.TASK.TASK_NAME].indexOf('Alpha') >= 0,
      '오름차순 정렬 실패'
    );
    recordSearchTest_(results, 'Sort ASC', true);

    const desc = assertSearchSuccess_(
      search(HLAS_CONSTANTS.ENTITY.TASK, {
        parentId: fixture.functionId, sortBy: 'name', sortOrder: 'desc'
      }),
      'Sort DESC'
    );
    assertSearchTest_(
      desc[0][HLAS_CONSTANTS.FIELD.TASK.TASK_NAME].indexOf('Zulu') >= 0,
      '내림차순 정렬 실패'
    );
    recordSearchTest_(results, 'Sort DESC', true);

    assertSearchCount_(
      search(HLAS_CONSTANTS.ENTITY.TASK, {
        keyword: 'zulu',
        status: HLAS_CONSTANTS.STATUS.COMPLETED,
        priority: HLAS_CONSTANTS.PRIORITY.HIGH,
        owner: 'tester',
        parentId: fixture.functionId,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
      1, '조합 검색'
    );
    recordSearchTest_(results, '조합 검색', true);

    assertSearchSuccess_(getProjectList({ keyword: 'search' }), 'PROJECT 회귀');
    recordSearchTest_(results, '기존 PROJECT', true);
    assertSearchTest_(Array.isArray(getEpicList({ keyword: 'search' })), 'EPIC 회귀');
    recordSearchTest_(results, '기존 EPIC', true);
    assertSearchSuccess_(getFeatureList({ keyword: 'search' }), 'FEATURE 회귀');
    recordSearchTest_(results, '기존 FEATURE', true);
    assertSearchSuccess_(getFunctionList({ keyword: 'search' }), 'FUNCTION 회귀');
    recordSearchTest_(results, '기존 FUNCTION', true);
    assertSearchSuccess_(getTaskList({ keyword: 'search' }), 'TASK 회귀');
    recordSearchTest_(results, '기존 TASK', true);

    Logger.log('[TASK-0010] 전체 테스트 PASS');
    return results;
  } finally {
    cleanupSearchFixture_(created);
  }
}

function createSearchFixture_(created) {
  const now = new Date();
  const ids = {
    projectId: generateId(HLAS_CONSTANTS.ENTITY.PROJECT),
    epicId: generateId(HLAS_CONSTANTS.ENTITY.EPIC),
    featureId: generateId(HLAS_CONSTANTS.ENTITY.FEATURE),
    functionId: generateId(HLAS_CONSTANTS.ENTITY.FUNCTION),
    taskIds: [],
  };
  const rows = [
    [HLAS_CONSTANTS.SHEETS.PROJECT, {
      PROJECT_ID: ids.projectId, 프로젝트명: 'Search Project', 설명: 'search',
      상태: '진행중', 담당자: 'tester', 생성일시: now, 수정일시: now
    }],
    [HLAS_CONSTANTS.SHEETS.EPIC, {
      EPIC_ID: ids.epicId, PROJECT_ID: ids.projectId, EPIC명: 'Search Epic',
      설명: 'search', 상태: '진행중', 우선순위: '보통', 담당자: 'tester',
      생성일시: now, 수정일시: now
    }],
    [HLAS_CONSTANTS.SHEETS.FEATURE, {
      FEATURE_ID: ids.featureId, EPIC_ID: ids.epicId, FEATURE명: 'Search Feature',
      설명: 'search', 상태: '진행중', 우선순위: '보통', 담당자: 'tester',
      생성일시: now, 수정일시: now
    }],
    [HLAS_CONSTANTS.SHEETS.FUNCTION, {
      FUNCTION_ID: ids.functionId, FEATURE_ID: ids.featureId, 기능명: 'Search Function',
      설명: 'search', 상태: '진행중', 담당자: 'tester', 생성일시: now, 수정일시: now
    }],
  ];
  rows.forEach(function (entry) {
    SheetRepository.insert(entry[0], entry[1]);
    created.push([entry[0], entry[1][Object.keys(entry[1])[0]]]);
  });

  [
    ['Alpha Search Task', HLAS_CONSTANTS.STATUS.IN_PROGRESS, HLAS_CONSTANTS.PRIORITY.NORMAL],
    ['Zulu Search Task', HLAS_CONSTANTS.STATUS.COMPLETED, HLAS_CONSTANTS.PRIORITY.HIGH],
  ].forEach(function (spec) {
    const id = generateId(HLAS_CONSTANTS.ENTITY.TASK);
    SheetRepository.insert(HLAS_CONSTANTS.SHEETS.TASK, {
      TASK_ID: id, FUNCTION_ID: ids.functionId, EPIC_ID: ids.epicId,
      작업명: spec[0], 설명: 'search', 상태: spec[1], 우선순위: spec[2],
      담당자: 'tester', 진행률: 0, 생성일시: now, 수정일시: now
    });
    ids.taskIds.push(id);
    created.push([HLAS_CONSTANTS.SHEETS.TASK, id]);
  });
  return ids;
}

function cleanupSearchFixture_(created) {
  created.reverse().forEach(function (entry) {
    if (SheetRepository.findById(entry[0], entry[1])) {
      SheetRepository.delete(entry[0], entry[1]);
    }
  });
}

function assertSearchCount_(response, expected, name) {
  const rows = assertSearchSuccess_(response, name);
  assertSearchTest_(rows.length === expected, name + ' 결과 수 오류: ' + rows.length);
}

function assertSearchSuccess_(response, name) {
  assertSearchTest_(
    response && response.ok === true,
    name + ' 실패: ' + (response && response.error ? response.error.message : '응답 없음')
  );
  return response.data || [];
}

function assertSearchTest_(condition, message) {
  if (!condition) throw new Error(message);
}

function recordSearchTest_(results, name, passed) {
  results.push({ name: name, result: passed ? 'PASS' : 'FAIL' });
  Logger.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + name);
}
