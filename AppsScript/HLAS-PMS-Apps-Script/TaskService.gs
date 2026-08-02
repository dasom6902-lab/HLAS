/**
 * @fileoverview HLAS TASK 업무 서비스.
 *
 * TASK 규칙, 검증, Repository 조합 및 변경 로그를 담당한다.
 */

/**
 * TASK 목록을 조회한다.
 *
 * @param {string|Object=} functionId 부모 ID 또는 검색 옵션
 * @return {Object} Core API 표준 응답
 */
function taskServiceGetTaskList_(functionId) {
  return CommonAPI.execute(function () {
    const options = typeof functionId === 'object'
      ? functionId
      : { parentId: String(functionId || '').trim() };
    const response = search(HLAS_CONSTANTS.ENTITY.TASK, options);
    if (!response.ok) throw coreErrorFromResponse_(response.error);
    return response.data.map(toTaskModel_);
  }, { operation: 'getTaskList' });
}

/**
 * TASK_ID로 TASK 한 건을 조회한다.
 *
 * @param {string} id 조회할 TASK_ID
 * @return {Object} Core API 표준 응답
 */
function taskServiceGetTask_(id) {
  return CommonAPI.execute(function () {
    Validation.required(id, HLAS_CONSTANTS.FIELD.TASK.TASK_ID);

    const record = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.TASK,
      String(id).trim()
    );
    if (!record) {
      throw new NotFoundError(
        'TASK를 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.TASK.TASK_ID,
        { id: id }
      );
    }
    return toTaskModel_(record);
  }, { operation: 'getTask' });
}

/**
 * 새로운 TASK를 생성한다.
 *
 * @param {Object} data TASK 입력값
 * @return {Object} Core API 표준 응답
 */
function taskServiceCreateTask_(data) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.CREATE,
      HLAS_CONSTANTS.ENTITY.TASK,
      ''
    );
    const input = normalizeTaskInput_(data);
    const lock = LockService.getDocumentLock();
    lock.waitLock(30000);

    try {
      const parentInfo = resolveTaskParentInfo_(input.functionId);
      const now = new Date();
      const taskId = generateId(HLAS_CONSTANTS.ENTITY.TASK);
      const fields = HLAS_CONSTANTS.FIELD.TASK;
      const record = {};

      record[fields.TASK_ID] = taskId;
      record[fields.FUNCTION_ID] = input.functionId;
      record[fields.EPIC_ID] = parentInfo.epicId;
      record[fields.TASK_NAME] = input.taskName;
      record[fields.DESCRIPTION] = input.description;
      record[fields.STATUS] =
        input.status || HLAS_CONSTANTS.STATUS.IN_PROGRESS;
      record[fields.PRIORITY] =
        input.priority || HLAS_CONSTANTS.PRIORITY.NORMAL;
      record[fields.OWNER] = input.owner;
      record[fields.START_DATE] = parseTaskDate_(input.startDate);
      record[fields.PLANNED_END_DATE] = parseTaskDate_(input.plannedEndDate);
      record[fields.COMPLETED_DATE] = parseTaskDate_(input.completedDate);
      record[fields.PROGRESS] = input.progress;
      record[fields.CREATED_AT] = now;
      record[fields.UPDATED_AT] = now;

      validateTaskRecord_(record);
      Validation.uniqueId(HLAS_CONSTANTS.SHEETS.TASK, taskId);

      const saved = SheetRepository.insert(HLAS_CONSTANTS.SHEETS.TASK, record);

      CommonAPI.writeLog({
        changeType: HLAS_CONSTANTS.LOG_TYPE.TASK_CREATE,
        message: 'TASK 생성: ' + input.taskName,
        relatedId: taskId,
        result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
      });
      writeEntityAudit_(
        HLAS_CONSTANTS.AUDIT_ACTION.CREATE,
        HLAS_CONSTANTS.ENTITY.TASK,
        taskId,
        HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
        'TASK 생성: ' + input.taskName
      );

      return toTaskModel_(saved);
    } finally {
      lock.releaseLock();
    }
  }, { operation: 'createTask' });
}

/**
 * 기존 TASK를 수정한다.
 *
 * @param {string} id 수정할 TASK_ID
 * @param {Object} data 변경할 입력값
 * @return {Object} Core API 표준 응답
 */
function taskServiceUpdateTask_(id, data) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.UPDATE,
      HLAS_CONSTANTS.ENTITY.TASK,
      id
    );
    Validation.required(id, HLAS_CONSTANTS.FIELD.TASK.TASK_ID);

    const current = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.TASK,
      String(id).trim()
    );
    if (!current) {
      throw new NotFoundError(
        '수정할 TASK를 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.TASK.TASK_ID,
        { id: id }
      );
    }

    const input = normalizeTaskInput_(data);
    const parentInfo = resolveTaskParentInfo_(input.functionId);
    const fields = HLAS_CONSTANTS.FIELD.TASK;
    const next = Object.assign({}, current);

    next[fields.FUNCTION_ID] = input.functionId;
    next[fields.EPIC_ID] = parentInfo.epicId;
    next[fields.TASK_NAME] = input.taskName;
    next[fields.DESCRIPTION] = input.description;
    next[fields.STATUS] = input.status;
    next[fields.PRIORITY] = input.priority;
    next[fields.OWNER] = input.owner;
    next[fields.START_DATE] = parseTaskDate_(input.startDate);
    next[fields.PLANNED_END_DATE] = parseTaskDate_(input.plannedEndDate);
    next[fields.COMPLETED_DATE] = parseTaskDate_(input.completedDate);
    next[fields.PROGRESS] = input.progress;
    next[fields.UPDATED_AT] = new Date();

    validateTaskRecord_(next);

    const saved = SheetRepository.update(
      HLAS_CONSTANTS.SHEETS.TASK,
      String(id).trim(),
      next
    );

    CommonAPI.writeLog({
      changeType: HLAS_CONSTANTS.LOG_TYPE.TASK_UPDATE,
      message: 'TASK 수정: ' + input.taskName,
      relatedId: String(id).trim(),
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    writeEntityAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.UPDATE,
      HLAS_CONSTANTS.ENTITY.TASK,
      String(id).trim(),
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'TASK 수정: ' + input.taskName
    );
    notifyTaskCompletion_(
      saved,
      String(current[HLAS_CONSTANTS.FIELD.TASK.STATUS] || '')
    );

    return toTaskModel_(saved);
  }, { operation: 'updateTask' });
}

/**
 * TASK_ID에 해당하는 TASK를 삭제한다.
 *
 * @param {string} id 삭제할 TASK_ID
 * @return {Object} Core API 표준 응답
 */
function taskServiceDeleteTask_(id) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.DELETE,
      HLAS_CONSTANTS.ENTITY.TASK,
      id
    );
    Validation.required(id, HLAS_CONSTANTS.FIELD.TASK.TASK_ID);

    const current = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.TASK,
      String(id).trim()
    );
    if (!current) {
      throw new NotFoundError(
        '삭제할 TASK를 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.TASK.TASK_ID,
        { id: id }
      );
    }

    SheetRepository.delete(HLAS_CONSTANTS.SHEETS.TASK, String(id).trim());

    CommonAPI.writeLog({
      changeType: HLAS_CONSTANTS.LOG_TYPE.TASK_DELETE,
      message:
        'TASK 삭제: ' + current[HLAS_CONSTANTS.FIELD.TASK.TASK_NAME],
      relatedId: String(id).trim(),
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    writeEntityAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.DELETE,
      HLAS_CONSTANTS.ENTITY.TASK,
      String(id).trim(),
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'TASK 삭제'
    );

    return {
      taskId: String(id).trim(),
      deleted: true,
    };
  }, { operation: 'deleteTask' });
}

/**
 * TASK Dialog에 필요한 FUNCTION 목록, 코드값, 수정 데이터를 반환한다.
 *
 * @param {string=} taskId 수정할 TASK_ID. 신규 등록이면 빈 값
 * @return {Object} Core API 표준 응답
 */
function taskServiceGetTaskFormData_(taskId) {
  return CommonAPI.execute(function () {
    const functionOptions = SheetRepository
      .findAll(HLAS_CONSTANTS.SHEETS.FUNCTION)
      .map(function (record) {
        return {
          functionId: String(
            record[HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID] || ''
          ),
          functionName: String(
            record[HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_NAME] || ''
          ),
          featureId: String(
            record[HLAS_CONSTANTS.FIELD.FUNCTION.FEATURE_ID] || ''
          ),
        };
      });

    let task = null;
    if (String(taskId || '').trim()) {
      const response = taskServiceGetTask_(String(taskId).trim());
      if (!response.ok) {
        throw taskCoreErrorFromResponse_(response.error);
      }
      task = response.data;
    }

    return {
      task: task,
      functionOptions: functionOptions,
      statuses: HLAS_CONSTANTS.STATUS.VALUES.slice(),
      priorities: HLAS_CONSTANTS.PRIORITY.VALUES.slice(),
      defaultStatus: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      defaultPriority: HLAS_CONSTANTS.PRIORITY.NORMAL,
    };
  }, { operation: 'getTaskFormData' });
}

function normalizeTaskInput_(data) {
  const input = data || {};
  const progress = input.progress === '' || input.progress === undefined
    ? 0
    : Number(input.progress);

  if (!isFinite(progress) || progress < 0 || progress > 100) {
    throw new ValidationError(
      '진행률은 0에서 100 사이의 숫자여야 합니다.',
      HLAS_CONSTANTS.FIELD.TASK.PROGRESS,
      { value: input.progress },
      'VALIDATION_PROGRESS'
    );
  }

  return {
    functionId: String(input.functionId || '').trim(),
    taskName: String(input.taskName || '').trim(),
    description: String(input.description || '').trim(),
    status: String(
      input.status || HLAS_CONSTANTS.STATUS.IN_PROGRESS
    ).trim(),
    priority: String(
      input.priority || HLAS_CONSTANTS.PRIORITY.NORMAL
    ).trim(),
    owner: String(input.owner || '').trim(),
    startDate: String(input.startDate || '').trim(),
    plannedEndDate: String(input.plannedEndDate || '').trim(),
    completedDate: String(input.completedDate || '').trim(),
    progress: progress,
  };
}

function resolveTaskParentInfo_(functionId) {
  const functionRecord = validateParent(
    HLAS_CONSTANTS.ENTITY.FUNCTION,
    functionId
  );
  const featureId = String(
    functionRecord[HLAS_CONSTANTS.FIELD.FUNCTION.FEATURE_ID] || ''
  ).trim();
  const featureRecord = validateParent(
    HLAS_CONSTANTS.ENTITY.FEATURE,
    featureId
  );

  return {
    functionId: functionId,
    featureId: featureId,
    epicId: String(
      featureRecord[HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID] || ''
    ).trim(),
  };
}

function validateTaskRecord_(record) {
  const fields = HLAS_CONSTANTS.FIELD.TASK;

  CommonAPI.validate(function () {
    Validation.required(record[fields.TASK_ID], fields.TASK_ID);
    Validation.required(record[fields.TASK_NAME], fields.TASK_NAME);
    Validation.maxLength(record[fields.TASK_NAME], 200, fields.TASK_NAME);
    Validation.required(record[fields.FUNCTION_ID], fields.FUNCTION_ID);
    Validation.required(record[fields.STATUS], fields.STATUS);
    Validation.validStatus(
      record[fields.STATUS],
      HLAS_CONSTANTS.STATUS.VALUES,
      fields.STATUS
    );
    Validation.required(record[fields.CREATED_AT], fields.CREATED_AT);
    Validation.validDate(record[fields.CREATED_AT], fields.CREATED_AT);
    Validation.required(record[fields.UPDATED_AT], fields.UPDATED_AT);
    Validation.validDate(record[fields.UPDATED_AT], fields.UPDATED_AT);
    Validation.validDate(record[fields.START_DATE], fields.START_DATE);
    Validation.validDate(
      record[fields.PLANNED_END_DATE],
      fields.PLANNED_END_DATE
    );
    Validation.validDate(
      record[fields.COMPLETED_DATE],
      fields.COMPLETED_DATE
    );
    Validation.dateRange(
      record[fields.START_DATE],
      record[fields.PLANNED_END_DATE]
    );
    validateParent(
      HLAS_CONSTANTS.ENTITY.FUNCTION,
      record[fields.FUNCTION_ID]
    );
  });
}

function parseTaskDate_(value) {
  if (!value) {
    return '';
  }
  Validation.validDate(value, 'date');
  if (value instanceof Date) {
    return value;
  }
  const parts = String(value).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toTaskModel_(record) {
  const fields = HLAS_CONSTANTS.FIELD.TASK;
  return {
    taskId: String(record[fields.TASK_ID] || ''),
    functionId: String(record[fields.FUNCTION_ID] || ''),
    epicId: String(record[fields.EPIC_ID] || ''),
    taskName: String(record[fields.TASK_NAME] || ''),
    description: String(record[fields.DESCRIPTION] || ''),
    status: String(record[fields.STATUS] || ''),
    priority: String(record[fields.PRIORITY] || ''),
    owner: String(record[fields.OWNER] || ''),
    startDate: formatTaskDate_(record[fields.START_DATE], false),
    plannedEndDate: formatTaskDate_(record[fields.PLANNED_END_DATE], false),
    completedDate: formatTaskDate_(record[fields.COMPLETED_DATE], false),
    progress: Number(record[fields.PROGRESS] || 0),
    createdAt: formatTaskDate_(record[fields.CREATED_AT], true),
    updatedAt: formatTaskDate_(record[fields.UPDATED_AT], true),
  };
}

function formatTaskDate_(value, includeTime) {
  if (!value) {
    return '';
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      includeTime ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd'
    );
  }
  return String(value);
}

function taskCoreErrorFromResponse_(error) {
  const value = error || {};
  return new CoreError(
    value.code || 'INTERNAL_ERROR',
    value.message || '시스템 오류가 발생했습니다.',
    value.field || null,
    value.details || null
  );
}
