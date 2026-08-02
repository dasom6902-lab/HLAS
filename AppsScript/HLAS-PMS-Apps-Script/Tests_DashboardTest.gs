/**
 * Dashboard KPI, 상태·우선순위 집계와 프로젝트 진행률을 테스트한다.
 *
 * @return {Object[]} 항목별 PASS/FAIL 결과
 */
function runDashboardTests() {
  const results = [];
  const created = [];
  try {
    const before = assertDashboardSuccess_(getDashboard(), '기준 Dashboard');
    const fixture = createDashboardFixture_(created);
    const data = assertDashboardSuccess_(getDashboard(), 'Dashboard 생성');
    recordDashboardTest_(results, 'Dashboard 생성', true);

    assertDashboardTest_(data.summary.projectCount === before.summary.projectCount + 1, 'PROJECT 수 오류');
    assertDashboardTest_(data.summary.epicCount === before.summary.epicCount + 1, 'EPIC 수 오류');
    assertDashboardTest_(data.summary.featureCount === before.summary.featureCount + 1, 'FEATURE 수 오류');
    assertDashboardTest_(data.summary.functionCount === before.summary.functionCount + 1, 'FUNCTION 수 오류');
    assertDashboardTest_(data.summary.taskCount === before.summary.taskCount + 2, 'TASK 수 오류');
    recordDashboardTest_(results, 'KPI 계산', true);

    assertDashboardTest_(data.status.doing === before.status.doing + 1, '진행중 집계 오류');
    assertDashboardTest_(data.status.done === before.status.done + 1, '완료 집계 오류');
    recordDashboardTest_(results, '상태 집계', true);

    assertDashboardTest_(data.priority.urgent === before.priority.urgent + 1, '긴급 집계 오류');
    assertDashboardTest_(data.priority.high === before.priority.high + 1, '높음 집계 오류');
    recordDashboardTest_(results, '우선순위 집계', true);

    const progress = data.progress.project.find(function (item) {
      return item.id === fixture.projectId;
    });
    assertDashboardTest_(progress && progress.progress === 50, '프로젝트 진행률 오류');
    assertDashboardTest_(progress.totalTasks === 2 && progress.completedTasks === 1, 'TASK 진행률 근거 오류');
    recordDashboardTest_(results, 'Progress 계산', true);

    assertDashboardTest_(getProjectList({}).ok, 'PROJECT 회귀 오류');
    assertDashboardTest_(Array.isArray(getEpicList({})), 'EPIC 회귀 오류');
    assertDashboardTest_(getFeatureList({}).ok, 'FEATURE 회귀 오류');
    assertDashboardTest_(getFunctionList({}).ok, 'FUNCTION 회귀 오류');
    assertDashboardTest_(getTaskList({}).ok, 'TASK 회귀 오류');
    recordDashboardTest_(results, '전체 회귀 테스트', true);
    Logger.log('[TASK-0011] 전체 테스트 PASS');
    return results;
  } finally {
    cleanupDashboardFixture_(created);
  }
}

function createDashboardFixture_(created) {
  const C = HLAS_CONSTANTS;
  const now = new Date();
  const ids = {
    projectId: generateId(C.ENTITY.PROJECT),
    epicId: generateId(C.ENTITY.EPIC),
    featureId: generateId(C.ENTITY.FEATURE),
    functionId: generateId(C.ENTITY.FUNCTION),
  };
  const rows = [
    [C.SHEETS.PROJECT, {PROJECT_ID:ids.projectId,프로젝트명:'Dashboard Test',상태:'진행중',담당자:'Work',생성일시:now,수정일시:now}],
    [C.SHEETS.EPIC, {EPIC_ID:ids.epicId,PROJECT_ID:ids.projectId,EPIC명:'Dashboard Epic',상태:'진행중',우선순위:'보통',생성일시:now,수정일시:now}],
    [C.SHEETS.FEATURE, {FEATURE_ID:ids.featureId,EPIC_ID:ids.epicId,FEATURE명:'Dashboard Feature',상태:'진행중',우선순위:'보통',생성일시:now,수정일시:now}],
    [C.SHEETS.FUNCTION, {FUNCTION_ID:ids.functionId,FEATURE_ID:ids.featureId,기능명:'Dashboard Function',상태:'진행중',생성일시:now,수정일시:now}],
  ];
  rows.forEach(function(e){SheetRepository.insert(e[0],e[1]);created.push([e[0],e[1][Object.keys(e[1])[0]]]);});
  [[C.STATUS.IN_PROGRESS,C.PRIORITY.URGENT],[C.STATUS.COMPLETED,C.PRIORITY.HIGH]].forEach(function(spec){
    const id=generateId(C.ENTITY.TASK);
    SheetRepository.insert(C.SHEETS.TASK,{TASK_ID:id,FUNCTION_ID:ids.functionId,EPIC_ID:ids.epicId,작업명:'Dashboard Task',상태:spec[0],우선순위:spec[1],진행률:spec[0]===C.STATUS.COMPLETED?100:0,생성일시:now,수정일시:now});
    created.push([C.SHEETS.TASK,id]);
  });
  return ids;
}

function cleanupDashboardFixture_(created) {
  created.reverse().forEach(function(e){if(SheetRepository.findById(e[0],e[1]))SheetRepository.delete(e[0],e[1]);});
}
function assertDashboardSuccess_(response,name){assertDashboardTest_(response&&response.ok,name+' 실패');return response.data;}
function assertDashboardTest_(condition,message){if(!condition)throw new Error(message);}
function recordDashboardTest_(results,name,passed){results.push({name:name,result:passed?'PASS':'FAIL'});Logger.log('['+(passed?'PASS':'FAIL')+'] '+name);}
