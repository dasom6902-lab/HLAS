/**
 * 역할별 권한, CRUD 보호, Dashboard 접근과 회귀 테스트를 실행한다.
 *
 * @return {Object[]} 항목별 PASS/FAIL 결과
 */
function runPermissionTests() {
  const C = HLAS_CONSTANTS;
  const results = [];
  const properties = PropertiesService.getScriptProperties();
  const previous = properties.getProperty('HLAS_TEST_ROLE');
  let featureId = '';
  try {
    assertRoleMatrix_(C.ROLE.ADMIN, [true,true,true,true,true]);
    recordPermissionTest_(results, 'ADMIN 권한', true);
    assertRoleMatrix_(C.ROLE.MANAGER, [true,true,true,true,true]);
    recordPermissionTest_(results, 'MANAGER 권한', true);
    assertRoleMatrix_(C.ROLE.USER, [true,true,true,false,true]);
    recordPermissionTest_(results, 'USER 권한', true);
    assertRoleMatrix_(C.ROLE.VIEWER, [true,false,false,false,true]);
    recordPermissionTest_(results, 'VIEWER 권한', true);

    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.VIEWER);
    const viewerContext = getPermissionContext();
    assertPermissionTest_(!viewerContext.create && !viewerContext.delete, 'VIEWER 메뉴 권한 오류');
    recordPermissionTest_(results, '메뉴 표시 권한', true);
    assertPermissionTest_(getDashboard().ok, 'VIEWER Dashboard 접근 실패');
    recordPermissionTest_(results, 'Dashboard 접근', true);

    const epics = SheetRepository.findAll(C.SHEETS.EPIC);
    assertPermissionTest_(epics.length > 0, 'CRUD 테스트용 EPIC이 없습니다.');
    const epicId = String(epics[0].EPIC_ID || '');

    const deniedCreate = createFeature({
      epicId: epicId, featureName: 'RBAC VIEWER 차단',
      status: C.STATUS.IN_PROGRESS, priority: C.PRIORITY.NORMAL
    });
    assertDenied_(deniedCreate, 'VIEWER CREATE');

    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.USER);
    const created = createFeature({
      epicId: epicId, featureName: 'TASK-0012 RBAC 테스트',
      status: C.STATUS.IN_PROGRESS, priority: C.PRIORITY.NORMAL, owner: 'Work'
    });
    assertPermissionTest_(created.ok, 'USER CREATE 실패');
    featureId = created.data.featureId;
    const updated = updateFeature(featureId, {
      epicId: epicId, featureName: 'TASK-0012 RBAC 수정',
      status: C.STATUS.IN_PROGRESS, priority: C.PRIORITY.HIGH, owner: 'Work'
    });
    assertPermissionTest_(updated.ok, 'USER UPDATE 실패');
    assertDenied_(deleteFeature(featureId), 'USER DELETE');
    recordPermissionTest_(results, 'CRUD 권한 검사', true);

    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.MANAGER);
    assertPermissionTest_(deleteFeature(featureId).ok, 'MANAGER DELETE 실패');
    featureId = '';

    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    assertPermissionTest_(getProjectList({}).ok, 'PROJECT 회귀');
    assertPermissionTest_(Array.isArray(getEpicList({})), 'EPIC 회귀');
    assertPermissionTest_(getFeatureList({}).ok, 'FEATURE 회귀');
    assertPermissionTest_(getFunctionList({}).ok, 'FUNCTION 회귀');
    assertPermissionTest_(getTaskList({}).ok, 'TASK 회귀');
    recordPermissionTest_(results, '전체 회귀 테스트', true);
    Logger.log('[TASK-0012] 전체 테스트 PASS');
    return results;
  } finally {
    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    if (featureId && SheetRepository.findById(C.SHEETS.FEATURE, featureId)) {
      SheetRepository.delete(C.SHEETS.FEATURE, featureId);
    }
    if (previous) properties.setProperty('HLAS_TEST_ROLE', previous);
    else properties.deleteProperty('HLAS_TEST_ROLE');
  }
}

function assertRoleMatrix_(role, expected) {
  const P = HLAS_CONSTANTS.PERMISSION;
  const actual = [
    hasPermission(role,P.READ), hasPermission(role,P.CREATE),
    hasPermission(role,P.UPDATE), hasPermission(role,P.DELETE),
    hasPermission(role,P.DASHBOARD)
  ];
  assertPermissionTest_(actual.join(',') === expected.join(','), role + ' 권한 행렬 오류');
}
function assertDenied_(response,name) {
  assertPermissionTest_(response && !response.ok && response.error &&
    response.error.code === 'PERMISSION_DENIED', name + '가 차단되지 않았습니다.');
}
function assertPermissionTest_(condition,message){if(!condition)throw new Error(message);}
function recordPermissionTest_(results,name,passed){results.push({name:name,result:passed?'PASS':'FAIL'});Logger.log('['+(passed?'PASS':'FAIL')+'] '+name);}
