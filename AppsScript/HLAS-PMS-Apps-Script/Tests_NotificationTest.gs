/**
 * Notification, Scheduler, Trigger 구조, Audit와 회귀 테스트를 실행한다.
 *
 * @return {Object[]} 항목별 PASS/FAIL 결과
 */
function runNotificationTests() {
  const C = HLAS_CONSTANTS;
  const results = [];
  const properties = PropertiesService.getScriptProperties();
  const previousRole = properties.getProperty('HLAS_TEST_ROLE');
  const marker = 'TASK-0014-' + new Date().getTime();
  const taskIds = [marker + '-DUE', marker + '-OVERDUE', marker + '-DONE'];

  try {
    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    const created = createNotification({
      type: C.NOTIFICATION_TYPE.INFO,
      user: 'notification-test',
      entity: C.ENTITY.TASK,
      entityId: marker,
      title: marker + ' 관리자 공지',
      message: 'Notification 생성 테스트',
    });
    assertNotificationTest_(created.ok, 'Notification 생성 실패');
    const notificationId = created.data.notificationId;
    recordNotificationTest_(results, 'Notification 생성', true);

    const unread = getNotificationList({
      status: C.NOTIFICATION_STATUS.UNREAD,
      type: C.NOTIFICATION_TYPE.INFO,
      user: 'notification-test',
      sortOrder: C.SEARCH.DESC,
    });
    assertNotificationTest_(
      unread.ok && unread.data.some(function (item) {
        return item.notificationId === notificationId;
      }),
      'Notification 검색/필터 실패'
    );
    recordNotificationTest_(results, '검색·필터·정렬', true);

    const read = markAsRead(notificationId);
    assertNotificationTest_(
      read.ok && read.data.status === C.NOTIFICATION_STATUS.READ &&
        !!read.data.readAt,
      '읽음 처리 실패'
    );
    recordNotificationTest_(results, '읽음 처리', true);

    assertNotificationTest_(
      deleteNotification(notificationId).ok,
      'Notification 삭제 실패'
    );
    recordNotificationTest_(results, '삭제', true);

    const failedNotification = createNotification({
      type: 'INVALID',
      entity: C.ENTITY.TASK,
      entityId: marker + '-FAIL',
      title: marker + ' 실패 감사',
      message: '의도된 Validation 실패',
    });
    assertNotificationTest_(
      !failedNotification.ok,
      'Notification 실패 테스트가 차단되지 않음'
    );
    const failureAudit = getAuditList({
      action: C.AUDIT_ACTION.ERROR,
      entity: C.ENTITY.NOTIFICATION,
      result: C.AUDIT_RESULT.FAIL,
      sortOrder: C.SEARCH.DESC,
    });
    assertNotificationTest_(
      failureAudit.ok && failureAudit.data.some(function (item) {
        return item.entityId === marker + '-FAIL';
      }),
      'Notification 생성 실패 Audit 누락'
    );
    recordNotificationTest_(results, 'Notification 실패 Audit', true);

    createNotificationTaskFixtures_(taskIds);
    const due = checkDueTasks();
    const overdue = checkOverdueTasks();
    assertNotificationTest_(
      due.ok && due.data.createdCount >= 1,
      '마감 임박 Scheduler 실패'
    );
    assertNotificationTest_(
      overdue.ok && overdue.data.createdCount >= 1,
      '기한 초과 Scheduler 실패'
    );
    recordNotificationTest_(results, 'Scheduler TASK 점검', true);

    const doneRecord = SheetRepository.findById(C.SHEETS.TASK, taskIds[2]);
    const doneResponse = notifyTaskCompletion_(
      Object.assign({}, doneRecord, {
        상태: C.STATUS.COMPLETED,
      }),
      C.STATUS.IN_PROGRESS
    );
    assertNotificationTest_(doneResponse && doneResponse.ok, 'TASK 완료 알림 실패');
    recordNotificationTest_(results, 'TASK 완료 알림', true);

    assertNotificationTest_(runDailyJobs().ok, 'Daily Job 실패');
    assertNotificationTest_(runHourlyJobs().ok, 'Hourly Job 실패');
    recordNotificationTest_(results, 'Daily/Hourly Job', true);

    assertNotificationTest_(
      typeof registerSchedulerTriggers === 'function' &&
      typeof removeSchedulerTriggers === 'function',
      'Trigger 등록/해제 함수 누락'
    );
    const handlerNames = ScriptApp.getProjectTriggers().map(function (trigger) {
      return trigger.getHandlerFunction();
    });
    assertNotificationTest_(Array.isArray(handlerNames), 'Trigger 조회 실패');
    recordNotificationTest_(results, 'Trigger 함수', true);

    const audit = getAuditList({
      action: C.AUDIT_ACTION.SCHEDULER,
      entity: C.ENTITY.NOTIFICATION,
      result: C.AUDIT_RESULT.SUCCESS,
      sortOrder: C.SEARCH.DESC,
    });
    assertNotificationTest_(audit.ok && audit.data.length >= 2, 'Audit 연계 실패');
    recordNotificationTest_(results, 'Audit 연계', true);

    assertNotificationTest_(getProjectList({}).ok, 'PROJECT 회귀 실패');
    assertNotificationTest_(Array.isArray(getEpicList({})), 'EPIC 회귀 실패');
    assertNotificationTest_(getFeatureList({}).ok, 'FEATURE 회귀 실패');
    assertNotificationTest_(getFunctionList({}).ok, 'FUNCTION 회귀 실패');
    assertNotificationTest_(getTaskList({}).ok, 'TASK 회귀 실패');
    assertNotificationTest_(getDashboard().ok, 'Dashboard 회귀 실패');
    assertNotificationTest_(getAuditList({}).ok, 'Audit 회귀 실패');
    recordNotificationTest_(results, '전체 회귀 테스트', true);

    Logger.log('[TASK-0014] 전체 테스트 PASS');
    return results;
  } finally {
    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    cleanupNotificationFixtures_(marker, taskIds);
    if (previousRole) {
      properties.setProperty('HLAS_TEST_ROLE', previousRole);
    } else {
      properties.deleteProperty('HLAS_TEST_ROLE');
    }
  }
}

function createNotificationTaskFixtures_(taskIds) {
  const C = HLAS_CONSTANTS;
  const fields = C.FIELD.TASK;
  const now = new Date();
  const dates = [
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  ];
  taskIds.forEach(function (id, index) {
    const record = {};
    record[fields.TASK_ID] = id;
    record[fields.FUNCTION_ID] = 'TEST-FUNCTION';
    record[fields.EPIC_ID] = 'TEST-EPIC';
    record[fields.TASK_NAME] = id;
    record[fields.DESCRIPTION] = 'TASK-0014 fixture';
    record[fields.STATUS] = C.STATUS.IN_PROGRESS;
    record[fields.PRIORITY] = C.PRIORITY.NORMAL;
    record[fields.OWNER] = 'notification-test';
    record[fields.START_DATE] = now;
    record[fields.PLANNED_END_DATE] = dates[index];
    record[fields.COMPLETED_DATE] = '';
    record[fields.PROGRESS] = 0;
    record[fields.CREATED_AT] = now;
    record[fields.UPDATED_AT] = now;
    SheetRepository.insert(C.SHEETS.TASK, record);
  });
}

function cleanupNotificationFixtures_(marker, taskIds) {
  const C = HLAS_CONSTANTS;
  SheetRepository.findAll(C.SHEETS.NOTIFICATION).forEach(function (record) {
    const id = String(record[C.FIELD.NOTIFICATION.NOTIFICATION_ID] || '');
    const entityId = String(record[C.FIELD.NOTIFICATION.ENTITY_ID] || '');
    const title = String(record[C.FIELD.NOTIFICATION.TITLE] || '');
    if (
      entityId.indexOf(marker) !== -1 ||
      title.indexOf(marker) !== -1
    ) {
      SheetRepository.delete(C.SHEETS.NOTIFICATION, id);
    }
  });
  taskIds.forEach(function (id) {
    if (SheetRepository.findById(C.SHEETS.TASK, id)) {
      SheetRepository.delete(C.SHEETS.TASK, id);
    }
  });
}

function assertNotificationTest_(condition, message) {
  if (!condition) throw new Error(message);
}

function recordNotificationTest_(results, name, passed) {
  results.push({ name: name, result: passed ? 'PASS' : 'FAIL' });
  Logger.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + name);
}
