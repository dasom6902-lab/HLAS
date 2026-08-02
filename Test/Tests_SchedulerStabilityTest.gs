/**
 * Scheduler Status, Trigger 수명주기, Rule, Channel 안정화 테스트를 실행한다.
 *
 * 테스트 종료 시 운영 Trigger 두 개가 등록된 상태를 보장한다.
 *
 * @return {Object[]} 항목별 PASS/FAIL 결과
 */
function runSchedulerStabilityTests() {
  const C = HLAS_CONSTANTS;
  const results = [];
  const properties = PropertiesService.getScriptProperties();
  const previousRole = properties.getProperty('HLAS_TEST_ROLE');

  try {
    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);

    const initialStatus = getSchedulerStatus();
    assertSchedulerStability_(
      initialStatus.ok && Array.isArray(initialStatus.data.handlers),
      'Scheduler Status 조회 실패'
    );
    recordSchedulerStability_(results, 'Scheduler Status', true);

    const removed = removeSchedulerTriggers();
    assertSchedulerStability_(
      removed.ok && removed.data.total === 0,
      'Trigger 제거 실패'
    );
    assertSchedulerStability_(
      getSchedulerStatus().data.total === 0,
      'Trigger 제거 결과 검증 실패'
    );
    recordSchedulerStability_(results, 'Trigger 제거', true);

    const registered = registerSchedulerTriggers();
    assertSchedulerStability_(
      registered.ok &&
      registered.data.registered &&
      registered.data.total === 2,
      'Trigger 등록 실패'
    );
    recordSchedulerStability_(results, 'Trigger 등록', true);

    const registeredAgain = registerSchedulerTriggers();
    assertSchedulerStability_(
      registeredAgain.ok && registeredAgain.data.total === 2,
      'Trigger 재등록 안정성 실패'
    );
    const status = getSchedulerStatus();
    const handlerNames = status.data.handlers.map(function (item) {
      return item.handlerName;
    });
    assertSchedulerStability_(
      status.ok &&
      status.data.total === 2 &&
      handlerNames.indexOf('runHourlyJobs') !== -1 &&
      handlerNames.indexOf('runDailyJobs') !== -1 &&
      status.data.handlers.every(function (item) {
        return item.eventType && item.triggerId && item.triggerSource;
      }),
      'Trigger 생성 결과 검증 실패'
    );
    recordSchedulerStability_(results, 'Trigger 재등록·상세 검증', true);

    const now = new Date();
    const today = startOfNotificationDay_(now);
    const sampleTasks = createRuleSamples_(today);
    assertSchedulerStability_(
      evaluateNotificationRule(
        'DUE_SOON', sampleTasks, {
          today: today,
          tomorrow: new Date(today.getTime() + 86400000),
        }
      ).length === 1,
      'DueSoonRule 실패'
    );
    assertSchedulerStability_(
      evaluateNotificationRule(
        'OVERDUE', sampleTasks, { today: today }
      ).length === 1,
      'OverdueRule 실패'
    );
    assertSchedulerStability_(
      evaluateNotificationRule(
        'COMPLETED', sampleTasks, {
          previousStatus: C.STATUS.IN_PROGRESS,
        }
      ).length === 1,
      'CompletedRule 실패'
    );
    assertSchedulerStability_(
      evaluateNotificationRule(
        'PENDING_APPROVAL', sampleTasks, {}
      ).length === 0,
      'PendingApprovalRule 실패'
    );
    recordSchedulerStability_(results, 'Notification Rule', true);

    const channel = getNotificationChannel(
      C.NOTIFICATION_CHANNEL.IN_APP
    );
    assertSchedulerStability_(
      channel.name === C.NOTIFICATION_CHANNEL.IN_APP &&
      typeof channel.send === 'function' &&
      typeof channel.sendBatch === 'function',
      'IN_APP Channel 인터페이스 실패'
    );
    const batch = createNotifications([]);
    assertSchedulerStability_(
      !batch.ok && batch.error.code === 'NOT_IMPLEMENTED',
      'Batch Notification 예약 인터페이스 실패'
    );
    recordSchedulerStability_(results, 'Notification Channel·Batch', true);

    const audit = getAuditList({
      action: C.AUDIT_ACTION.SCHEDULER,
      entity: C.ENTITY.NOTIFICATION,
      result: C.AUDIT_RESULT.SUCCESS,
      sortOrder: C.SEARCH.DESC,
    });
    assertSchedulerStability_(
      audit.ok &&
      ['TRIGGER_REGISTER', 'TRIGGER_REMOVE', 'TRIGGER_STATUS'].every(
        function (id) {
          return audit.data.some(function (item) {
            return item.entityId === id;
          });
        }
      ),
      'Trigger 관리 Audit 누락'
    );
    recordSchedulerStability_(results, 'Trigger 관리 Audit', true);

    Logger.log('[TASK-0014A] 안정화 테스트 PASS');
    return results;
  } finally {
    properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
    const finalStatus = collectSchedulerStatus_();
    const finalHandlers = finalStatus.handlers.map(function (item) {
      return item.handlerName;
    });
    if (
      finalStatus.total !== 2 ||
      finalHandlers.indexOf('runHourlyJobs') === -1 ||
      finalHandlers.indexOf('runDailyJobs') === -1
    ) {
      removeSchedulerTriggers_();
      ScriptApp.newTrigger('runHourlyJobs').timeBased().everyHours(1).create();
      ScriptApp.newTrigger('runDailyJobs')
        .timeBased().everyDays(1).atHour(8).create();
    }
    if (previousRole) {
      properties.setProperty('HLAS_TEST_ROLE', previousRole);
    } else {
      properties.deleteProperty('HLAS_TEST_ROLE');
    }
  }
}

function createRuleSamples_(today) {
  const C = HLAS_CONSTANTS;
  const F = C.TASK_FIELD;
  const definitions = [
    ['RULE-DUE', C.STATUS.IN_PROGRESS, new Date(today.getTime() + 86400000)],
    ['RULE-OVERDUE', C.STATUS.IN_PROGRESS, new Date(today.getTime() - 86400000)],
    ['RULE-DONE', C.STATUS.COMPLETED, today],
  ];
  return definitions.map(function (item) {
    const task = {};
    task[F.TASK_ID] = item[0];
    task[F.TASK_NAME] = item[0];
    task[F.STATUS] = item[1];
    task[F.PLANNED_END_DATE] = item[2];
    task[F.OWNER] = 'test';
    return task;
  });
}

function assertSchedulerStability_(condition, message) {
  if (!condition) throw new Error(message);
}

function recordSchedulerStability_(results, name, passed) {
  results.push({ name: name, result: passed ? 'PASS' : 'FAIL' });
  Logger.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + name);
}
