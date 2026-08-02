/**
 * 이름에 해당하는 Notification Rule을 실행한다.
 *
 * Rule은 알림 후보만 반환하며 저장은 NotificationService가 담당한다.
 *
 * @param {string} ruleName DUE_SOON, OVERDUE, COMPLETED, PENDING_APPROVAL
 * @param {Object[]} tasks TASK 레코드 목록
 * @param {Object=} context 평가 기준 정보
 * @return {Object[]} 생성할 알림 입력값 목록
 */
function evaluateNotificationRule(ruleName, tasks, context) {
  const name = String(ruleName || '').trim().toUpperCase();
  const rows = Array.isArray(tasks) ? tasks : [];
  const ruleContext = context || {};
  const rules = {
    DUE_SOON: evaluateDueSoonRule_,
    OVERDUE: evaluateOverdueRule_,
    COMPLETED: evaluateCompletedRule_,
    PENDING_APPROVAL: evaluatePendingApprovalRule_,
  };
  if (!rules[name]) {
    throw new ValidationError(
      '지원하지 않는 Notification Rule입니다: ' + name,
      'ruleName'
    );
  }
  return rules[name](rows, ruleContext);
}

function evaluateDueSoonRule_(tasks, context) {
  const C = HLAS_CONSTANTS;
  const today = context.today || startOfNotificationDay_(new Date());
  const tomorrow =
    context.tomorrow || new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return tasks.filter(function (task) {
    if (isClosedNotificationTask_(task)) return false;
    const due = normalizeNotificationDate_(
      task[C.FIELD.TASK.PLANNED_END_DATE]
    );
    return due && due >= today && due <= tomorrow;
  }).map(function (task) {
    return taskToRuleNotification_(
      task,
      C.NOTIFICATION_TYPE.WARNING,
      'TASK 마감 임박',
      '의 마감일이 임박했습니다.'
    );
  });
}

function evaluateOverdueRule_(tasks, context) {
  const C = HLAS_CONSTANTS;
  const today = context.today || startOfNotificationDay_(new Date());
  return tasks.filter(function (task) {
    if (isClosedNotificationTask_(task)) return false;
    const due = normalizeNotificationDate_(
      task[C.FIELD.TASK.PLANNED_END_DATE]
    );
    return due && due < today;
  }).map(function (task) {
    return taskToRuleNotification_(
      task,
      C.NOTIFICATION_TYPE.ERROR,
      'TASK 기한 초과',
      '의 기한이 초과되었습니다.'
    );
  });
}

function evaluateCompletedRule_(tasks, context) {
  const C = HLAS_CONSTANTS;
  if (context.previousStatus === C.STATUS.COMPLETED) return [];
  return tasks.filter(function (task) {
    return task[C.FIELD.TASK.STATUS] === C.STATUS.COMPLETED;
  }).map(function (task) {
    return taskToRuleNotification_(
      task,
      C.NOTIFICATION_TYPE.SUCCESS,
      'TASK 완료',
      '이 완료되었습니다.'
    );
  });
}

function evaluatePendingApprovalRule_(tasks, context) {
  const C = HLAS_CONSTANTS;
  const now = context.now || new Date();
  const thresholdHours = Number(context.thresholdHours || 24);
  const threshold = now.getTime() - thresholdHours * 60 * 60 * 1000;
  return tasks.filter(function (task) {
    if (
      String(task[C.FIELD.TASK.STATUS] || '') !==
      C.WORKFLOW_STATUS.WAITING_APPROVAL
    ) return false;
    const changedAt = new Date(
      task[C.FIELD.TASK.UPDATED_AT] ||
      task[C.FIELD.TASK.CREATED_AT] || 0
    ).getTime();
    return changedAt > 0 && changedAt <= threshold;
  }).map(function (task) {
    return taskToRuleNotification_(
      task,
      C.NOTIFICATION_TYPE.WARNING,
      '승인 대기 장기 미처리',
      ' 승인 요청이 장기간 처리되지 않았습니다.'
    );
  });
}

function taskToRuleNotification_(task, type, title, suffix) {
  const C = HLAS_CONSTANTS;
  const fields = C.FIELD.TASK;
  return {
    type: type,
    user: String(task[fields.OWNER] || ''),
    entity: C.ENTITY.TASK,
    entityId: String(task[fields.TASK_ID] || ''),
    title: title,
    message: String(task[fields.TASK_NAME] || '') + suffix,
  };
}

function isClosedNotificationTask_(task) {
  const C = HLAS_CONSTANTS;
  const status = String(task[C.FIELD.TASK.STATUS] || '');
  return status === C.STATUS.COMPLETED || status === C.STATUS.CANCELLED;
}

function normalizeNotificationDate_(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return startOfNotificationDay_(date);
}

function startOfNotificationDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
