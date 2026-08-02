/**
 * Workflow, Approval, History, RBAC, Audit, Notification을 통합 테스트한다.
 * @return {Object[]} 항목별 PASS/FAIL
 */
function runWorkflowTests() {
  const C = HLAS_CONSTANTS;
  const S = C.WORKFLOW_STATUS;
  const results = [];
  const properties = PropertiesService.getScriptProperties();
  const previousRole = properties.getProperty('HLAS_TEST_ROLE');
  const projectId = 'PRJ-WF-' + Date.now();
  const row = {};
  row.PROJECT_ID = projectId;
  row[C.PROJECT_FIELD.PROJECT_NAME] = 'TASK-0016 Workflow Test';
  row[C.FIELD.STATUS] = S.DRAFT;
  row[C.FIELD.CREATED_AT] = new Date();
  row[C.FIELD.UPDATED_AT] = new Date();

  properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
  SheetRepository.insert(C.SHEETS.PROJECT, row);
  try {
    assertWorkflowTest_(changeStatus(C.ENTITY.PROJECT, projectId, S.READY).ok, 'DRAFT→READY');
    assertWorkflowTest_(changeStatus(C.ENTITY.PROJECT, projectId, S.IN_PROGRESS).ok, 'READY→IN_PROGRESS');
    recordWorkflowTest_(results, '기본 상태 전이', true);

    const invalid = changeStatus(C.ENTITY.PROJECT, projectId, S.COMPLETED);
    assertWorkflowTest_(!invalid.ok && invalid.error.code === 'WORKFLOW_TRANSITION_DENIED', '허용되지 않은 전이');
    recordWorkflowTest_(results, '허용되지 않은 전이 차단', true);

    assertWorkflowTest_(requestApproval(C.ENTITY.PROJECT, projectId, '검토 요청').ok, '승인 요청');
    assertWorkflowTest_(reject(C.ENTITY.PROJECT, projectId, '보완 필요').ok, '반려');
    assertWorkflowTest_(changeStatus(C.ENTITY.PROJECT, projectId, S.IN_PROGRESS).ok, '반려 후 재진행');
    assertWorkflowTest_(requestApproval(C.ENTITY.PROJECT, projectId, '재요청').ok, '승인 재요청');
    recordWorkflowTest_(results, '승인 요청·반려', true);

    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.USER);
    const denied = approve(C.ENTITY.PROJECT, projectId, '권한 테스트');
    assertWorkflowTest_(!denied.ok && denied.error.code === 'PERMISSION_DENIED', '승인 권한');
    recordWorkflowTest_(results, '승인 권한 차단', true);

    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.MANAGER);
    assertWorkflowTest_(approve(C.ENTITY.PROJECT, projectId, '승인').ok, '승인');
    assertWorkflowTest_(changeStatus(C.ENTITY.PROJECT, projectId, S.COMPLETED).ok, '승인 후 완료');
    const terminal = changeStatus(C.ENTITY.PROJECT, projectId, S.READY);
    assertWorkflowTest_(!terminal.ok, '완료 후 수정 차단');
    recordWorkflowTest_(results, '승인·완료·종료 상태', true);

    const history = getWorkflowHistory(projectId);
    assertWorkflowTest_(history.ok && history.data.length >= 8, 'Workflow History');
    recordWorkflowTest_(results, 'Workflow History', true);

    const audits = getAuditList({ entity: C.ENTITY.PROJECT });
    assertWorkflowTest_(audits.ok && audits.data.some(function (x) {
      return x.entityId === projectId;
    }), 'Audit');
    recordWorkflowTest_(results, 'Audit', true);

    const notices = getNotificationList({ entity: C.ENTITY.PROJECT });
    assertWorkflowTest_(notices.ok && notices.data.some(function (x) {
      return x.entityId === projectId;
    }), 'Notification');
    recordWorkflowTest_(results, 'Notification', true);

    const oldTask = {};
    oldTask[C.TASK_FIELD.TASK_ID] = 'TASK-WF-RULE';
    oldTask[C.TASK_FIELD.TASK_NAME] = '승인 대기 테스트';
    oldTask[C.TASK_FIELD.STATUS] = S.WAITING_APPROVAL;
    oldTask[C.TASK_FIELD.OWNER] = 'test';
    oldTask[C.TASK_FIELD.UPDATED_AT] = new Date(Date.now() - 48 * 60 * 60 * 1000);
    assertWorkflowTest_(
      evaluateNotificationRule('PENDING_APPROVAL', [oldTask], {
        now: new Date(), thresholdHours: 24,
      }).length === 1,
      'Scheduler 승인 대기 Rule'
    );
    recordWorkflowTest_(results, 'Scheduler 승인 대기 Rule', true);

    Logger.log('[TASK-0016] Workflow 테스트 PASS');
    return results;
  } finally {
    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    cleanupWorkflowTest_(projectId);
    if (previousRole) properties.setProperty('HLAS_TEST_ROLE', previousRole);
    else properties.deleteProperty('HLAS_TEST_ROLE');
  }
}

function cleanupWorkflowTest_(entityId) {
  const C = HLAS_CONSTANTS;
  if (SheetRepository.findById(C.SHEETS.PROJECT, entityId)) {
    SheetRepository.delete(C.SHEETS.PROJECT, entityId);
  }
  const WF = C.WORKFLOW_FIELD;
  SheetRepository.findAll(C.SHEETS.WORKFLOW_HISTORY)
    .filter(function (row) { return String(row[WF.ENTITY_ID] || '') === entityId; })
    .forEach(function (row) {
      SheetRepository.delete(C.SHEETS.WORKFLOW_HISTORY, row[WF.WORKFLOW_ID]);
    });
  const NF = C.NOTIFICATION_FIELD;
  SheetRepository.findAll(C.SHEETS.NOTIFICATION)
    .filter(function (row) { return String(row[NF.ENTITY_ID] || '') === entityId; })
    .forEach(function (row) {
      SheetRepository.delete(C.SHEETS.NOTIFICATION, row[NF.NOTIFICATION_ID]);
    });
}

function assertWorkflowTest_(condition, message) {
  if (!condition) throw new Error(message);
}

function recordWorkflowTest_(results, name, passed) {
  results.push({ name: name, result: passed ? 'PASS' : 'FAIL' });
  Logger.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + name);
}
