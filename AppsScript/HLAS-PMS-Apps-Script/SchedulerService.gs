/**
 * 24시간 이내 마감 예정인 미완료 TASK를 점검한다.
 *
 * @return {Object} Core API 표준 응답
 */
function checkDueTasks() {
  return checkTaskSchedule_('DUE');
}

/**
 * 완료예정일이 지난 미완료 TASK를 점검한다.
 *
 * @return {Object} Core API 표준 응답
 */
function checkOverdueTasks() {
  return checkTaskSchedule_('OVERDUE');
}

/**
 * 승인 대기 업무 점검을 위한 확장 지점을 제공한다.
 *
 * 현재 승인 상태 컬럼이 없으므로 실제 생성 없이 점검 결과만 반환한다.
 *
 * @return {Object} Core API 표준 응답
 */
function checkPendingApproval() {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    const candidates = evaluateNotificationRule(
      'PENDING_APPROVAL',
      SheetRepository.findAll(C.SHEETS.TASK),
      { now: new Date(), thresholdHours: 24 }
    );
    const existing = SheetRepository.findAll(C.SHEETS.NOTIFICATION);
    let createdCount = 0;
    candidates.forEach(function (candidate) {
      const duplicate = existing.some(function (row) {
        return String(row[C.FIELD.NOTIFICATION.ENTITY_ID] || '') ===
            candidate.entityId &&
          String(row[C.FIELD.NOTIFICATION.TITLE] || '') === candidate.title &&
          String(row[C.FIELD.NOTIFICATION.STATUS] || '') ===
            C.NOTIFICATION_STATUS.UNREAD;
      });
      if (!duplicate) {
        const response = createNotification(candidate);
        if (response && response.ok) createdCount += 1;
      }
    });
    return {
      checked: true,
      candidateCount: candidates.length,
      createdCount: createdCount,
      reason: '승인 상태 모델 도입 전',
    };
  }, { operation: 'checkPendingApproval' });
}

/**
 * 일 단위 스케줄 작업을 실행한다.
 *
 * @return {Object} Core API 표준 응답
 */
function runDailyJobs() {
  return CommonAPI.execute(function () {
    try {
      const due = unwrapSchedulerResponse_(checkDueTasks());
      const overdue = unwrapSchedulerResponse_(checkOverdueTasks());
      const analyticsCache = unwrapSchedulerResponse_(refreshAnalyticsCache());
      const result = { due: due, overdue: overdue, analyticsCache: analyticsCache };
      writeSchedulerAudit_('runDailyJobs', result, null);
      return result;
    } catch (error) {
      writeSchedulerAudit_('runDailyJobs', null, error);
      throw error;
    }
  }, { operation: 'runDailyJobs' });
}

/**
 * 시간 단위 스케줄 작업을 실행한다.
 *
 * @return {Object} Core API 표준 응답
 */
function runHourlyJobs() {
  return CommonAPI.execute(function () {
    try {
      const pending = unwrapSchedulerResponse_(checkPendingApproval());
      const result = { pendingApproval: pending };
      writeSchedulerAudit_('runHourlyJobs', result, null);
      return result;
    } catch (error) {
      writeSchedulerAudit_('runHourlyJobs', null, error);
      throw error;
    }
  }, { operation: 'runHourlyJobs' });
}

/**
 * 시간·일 단위 Apps Script 트리거를 중복 없이 등록한다.
 *
 * 실제 운영 적용 시 사용자가 이 함수를 별도로 실행한다.
 *
 * @return {Object} Core API 표준 응답
 */
function registerSchedulerTriggers() {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.CREATE,
      HLAS_CONSTANTS.ENTITY.NOTIFICATION,
      'SCHEDULER'
    );
    try {
      removeSchedulerTriggers_();
      ScriptApp.newTrigger('runHourlyJobs').timeBased().everyHours(1).create();
      ScriptApp.newTrigger('runDailyJobs')
        .timeBased().everyDays(1).atHour(8).create();

      const status = collectSchedulerStatus_();
      const handlers = status.handlers.map(function (item) {
        return item.handlerName;
      });
      const expected = ['runHourlyJobs', 'runDailyJobs'];
      const valid =
        status.total === expected.length &&
        expected.every(function (name) {
          return handlers.indexOf(name) !== -1;
        });
      if (!valid) {
        throw new CoreError(
          'SCHEDULER_TRIGGER_VERIFY_FAILED',
          'Scheduler Trigger 생성 결과 검증에 실패했습니다.',
          null,
          status
        );
      }
      const result = {
        registered: true,
        total: status.total,
        handlers: expected,
      };
      writeSchedulerManagementAudit_(
        'TRIGGER_REGISTER',
        'Scheduler Trigger 등록',
        result,
        null
      );
      return result;
    } catch (error) {
      writeSchedulerManagementAudit_(
        'TRIGGER_REGISTER',
        'Scheduler Trigger 등록 실패',
        null,
        error
      );
      throw error;
    }
  }, { operation: 'registerSchedulerTriggers' });
}

/**
 * HLAS 스케줄러 트리거를 제거한다.
 *
 * @return {Object} Core API 표준 응답
 */
function removeSchedulerTriggers() {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.DELETE,
      HLAS_CONSTANTS.ENTITY.NOTIFICATION,
      'SCHEDULER'
    );
    try {
      const removedCount = removeSchedulerTriggers_();
      const status = collectSchedulerStatus_();
      if (status.total !== 0) {
        throw new CoreError(
          'SCHEDULER_TRIGGER_REMOVE_FAILED',
          'Scheduler Trigger가 모두 제거되지 않았습니다.',
          null,
          status
        );
      }
      const result = { removedCount: removedCount, total: status.total };
      writeSchedulerManagementAudit_(
        'TRIGGER_REMOVE',
        'Scheduler Trigger 제거',
        result,
        null
      );
      return result;
    } catch (error) {
      writeSchedulerManagementAudit_(
        'TRIGGER_REMOVE',
        'Scheduler Trigger 제거 실패',
        null,
        error
      );
      throw error;
    }
  }, { operation: 'removeSchedulerTriggers' });
}

/**
 * 현재 등록된 HLAS Scheduler Trigger 상태를 반환한다.
 *
 * @return {Object} Core API 표준 응답
 */
function getSchedulerStatus() {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.READ,
      HLAS_CONSTANTS.ENTITY.NOTIFICATION,
      'SCHEDULER'
    );
    try {
      const status = collectSchedulerStatus_();
      writeSchedulerManagementAudit_(
        'TRIGGER_STATUS',
        'Scheduler Trigger 상태 조회',
        status,
        null
      );
      return status;
    } catch (error) {
      writeSchedulerManagementAudit_(
        'TRIGGER_STATUS',
        'Scheduler Trigger 상태 조회 실패',
        null,
        error
      );
      throw error;
    }
  }, { operation: 'getSchedulerStatus' });
}

function checkTaskSchedule_(mode) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    const today = startOfNotificationDay_(new Date());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    let createdCount = 0;
    const tasks = SheetRepository.findAll(C.SHEETS.TASK);
    const candidates = evaluateNotificationRule(
      mode === 'DUE' ? 'DUE_SOON' : 'OVERDUE',
      tasks,
      { today: today, tomorrow: tomorrow }
    );
    const existingNotifications =
      SheetRepository.findAll(C.SHEETS.NOTIFICATION);
    const notificationKeys = {};
    existingNotifications.forEach(function (notification) {
      const key =
        String(notification[C.FIELD.NOTIFICATION.ENTITY_ID] || '') +
        '|' +
        String(notification[C.FIELD.NOTIFICATION.TITLE] || '');
      notificationKeys[key] = true;
    });

    candidates.forEach(function (candidate) {
      const notificationKey =
        candidate.entityId + '|' + candidate.title;
      if (notificationKeys[notificationKey]) return;
      const response = createNotification(candidate);
      if (!response.ok) {
        throw new CoreError(
          response.error.code,
          response.error.message,
          response.error.field,
          response.error.details
        );
      }
      notificationKeys[notificationKey] = true;
      createdCount += 1;
    });
    return { checked: true, createdCount: createdCount };
  }, { operation: mode === 'DUE' ? 'checkDueTasks' : 'checkOverdueTasks' });
}

function notifyTaskCompletion_(taskRecord, previousStatus) {
  const candidates = evaluateNotificationRule(
    'COMPLETED',
    [taskRecord],
    { previousStatus: previousStatus }
  );
  if (!candidates.length) return null;
  const candidate = candidates[0];
  if (notificationExists_(candidate.entityId, candidate.title)) return null;
  return createNotification(candidate);
}

function writeSchedulerAudit_(jobName, detail, error) {
  const C = HLAS_CONSTANTS;
  return writeEntityAudit_(
    C.AUDIT_ACTION.SCHEDULER,
    C.ENTITY.NOTIFICATION,
    jobName,
    error ? C.AUDIT_RESULT.FAIL : C.AUDIT_RESULT.SUCCESS,
    error ? 'Scheduler 실행 실패' : 'Scheduler 실행 완료',
    error ? { error: error.message } : detail
  );
}

function unwrapSchedulerResponse_(response) {
  if (response && response.ok) return response.data;
  const error = response && response.error ? response.error : {};
  throw new CoreError(
    error.code || 'SCHEDULER_ERROR',
    error.message || 'Scheduler 실행 중 오류가 발생했습니다.',
    error.field || null,
    error.details || null
  );
}

function removeSchedulerTriggers_() {
  const handlers = ['runHourlyJobs', 'runDailyJobs'];
  let count = 0;
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
      count += 1;
    }
  });
  return count;
}

function collectSchedulerStatus_() {
  const handlers = ['runHourlyJobs', 'runDailyJobs'];
  const triggerInfo = ScriptApp.getProjectTriggers()
    .filter(function (trigger) {
      return handlers.indexOf(trigger.getHandlerFunction()) !== -1;
    })
    .map(function (trigger) {
      return {
        handlerName: trigger.getHandlerFunction(),
        eventType: String(trigger.getEventType()),
        triggerId: String(trigger.getUniqueId() || ''),
        triggerSource: String(trigger.getTriggerSource()),
      };
    });
  return {
    total: triggerInfo.length,
    handlers: triggerInfo,
  };
}

function writeSchedulerManagementAudit_(
  entityId, message, detail, error
) {
  const C = HLAS_CONSTANTS;
  return writeEntityAudit_(
    C.AUDIT_ACTION.SCHEDULER,
    C.ENTITY.NOTIFICATION,
    entityId,
    error ? C.AUDIT_RESULT.FAIL : C.AUDIT_RESULT.SUCCESS,
    message,
    error ? { error: error.message } : detail
  );
}
