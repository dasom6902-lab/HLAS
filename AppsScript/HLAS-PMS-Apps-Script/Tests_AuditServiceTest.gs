/**
 * Audit 생성·검색·정렬·권한 거부·회귀 테스트를 실행한다.
 *
 * @return {Object[]} 항목별 PASS/FAIL 결과
 */
function runAuditServiceTests() {
  const C = HLAS_CONSTANTS;
  const results = [];
  const properties = PropertiesService.getScriptProperties();
  const previousRole = properties.getProperty('HLAS_TEST_ROLE');
  const marker = 'TASK-0013-' + new Date().getTime();
  const createdIds = [];

  try {
    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    [
      [C.AUDIT_ACTION.CREATE, C.AUDIT_RESULT.SUCCESS],
      [C.AUDIT_ACTION.UPDATE, C.AUDIT_RESULT.SUCCESS],
      [C.AUDIT_ACTION.DELETE, C.AUDIT_RESULT.SUCCESS],
      [C.AUDIT_ACTION.ERROR, C.AUDIT_RESULT.FAIL],
    ].forEach(function (item) {
      const response = writeAudit({
        action: item[0],
        entity: C.ENTITY.TASK,
        entityId: marker,
        result: item[1],
        message: marker + '-' + item[0],
      });
      assertAuditTest_(response.ok, item[0] + ' Audit 생성 실패');
      createdIds.push(response.data.auditId);
    });
    recordAuditTest_(results, 'Create/Update/Delete/Error Audit', true);

    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.VIEWER);
    const denied = createFeature({
      epicId: 'EPIC-NOT-USED',
      featureName: marker,
      status: C.STATUS.IN_PROGRESS,
      priority: C.PRIORITY.NORMAL,
    });
    assertAuditTest_(
      !denied.ok && denied.error.code === 'PERMISSION_DENIED',
      'Permission Denied API 응답 오류'
    );

    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    const deniedSearch = getAuditList({
      action: C.AUDIT_ACTION.PERMISSION_DENIED,
      entity: C.ENTITY.FEATURE,
      result: C.AUDIT_RESULT.DENIED,
      sortOrder: C.SEARCH.DESC,
    });
    assertAuditTest_(
      deniedSearch.ok && deniedSearch.data.length > 0,
      'Permission Denied Audit 누락'
    );
    const deniedRecord = deniedSearch.data[0];
    createdIds.push(deniedRecord.auditId);
    recordAuditTest_(results, 'Permission Denied Audit', true);

    const filtered = getAuditList({
      action: C.AUDIT_ACTION.CREATE,
      entity: C.ENTITY.TASK,
      result: C.AUDIT_RESULT.SUCCESS,
      sortOrder: C.SEARCH.ASC,
    });
    assertAuditTest_(
      filtered.ok && filtered.data.some(function (item) {
        return item.entityId === marker;
      }),
      '검색 Filter 실패'
    );
    recordAuditTest_(results, '검색 Filter', true);

    const newest = getAuditList({ sortOrder: C.SEARCH.DESC });
    const oldest = getAuditList({ sortOrder: C.SEARCH.ASC });
    assertAuditTest_(newest.ok && oldest.ok, '정렬 조회 실패');
    assertAuditTest_(
      isAuditSorted_(newest.data, false) && isAuditSorted_(oldest.data, true),
      '정렬 순서 오류'
    );
    recordAuditTest_(results, '최신순/오래된순 정렬', true);

    assertAuditTest_(getProjectList({}).ok, 'PROJECT 회귀 실패');
    assertAuditTest_(Array.isArray(getEpicList({})), 'EPIC 회귀 실패');
    assertAuditTest_(getFeatureList({}).ok, 'FEATURE 회귀 실패');
    assertAuditTest_(getFunctionList({}).ok, 'FUNCTION 회귀 실패');
    assertAuditTest_(getTaskList({}).ok, 'TASK 회귀 실패');
    assertAuditTest_(getDashboard().ok, 'Dashboard 회귀 실패');
    recordAuditTest_(results, '전체 회귀 테스트', true);

    Logger.log('[TASK-0013] 전체 테스트 PASS');
    return results;
  } finally {
    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    createdIds.forEach(function (id) {
      if (id && SheetRepository.findById(C.SHEETS.AUDIT, id)) {
        SheetRepository.delete(C.SHEETS.AUDIT, id);
      }
    });
    if (previousRole) {
      properties.setProperty('HLAS_TEST_ROLE', previousRole);
    } else {
      properties.deleteProperty('HLAS_TEST_ROLE');
    }
  }
}

function isAuditSorted_(items, ascending) {
  for (let index = 1; index < items.length; index += 1) {
    const previous = new Date(items[index - 1].timestamp).getTime();
    const current = new Date(items[index].timestamp).getTime();
    if (ascending && previous > current) return false;
    if (!ascending && previous < current) return false;
  }
  return true;
}

function assertAuditTest_(condition, message) {
  if (!condition) throw new Error(message);
}

function recordAuditTest_(results, name, passed) {
  results.push({ name: name, result: passed ? 'PASS' : 'FAIL' });
  Logger.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + name);
}
