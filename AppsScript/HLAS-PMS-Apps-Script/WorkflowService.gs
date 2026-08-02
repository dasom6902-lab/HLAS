/**
 * Entity 상태를 Workflow 규칙에 따라 변경한다.
 * @param {string} entity Entity
 * @param {string} entityId Entity ID
 * @param {string} newStatus 변경 상태
 * @return {Object} Core API 표준 응답
 */
function changeStatus(entity, entityId, newStatus) {
  return changeWorkflowStatus_(entity, entityId, newStatus, 'STATUS_CHANGE', '');
}

/**
 * Workflow 이력을 조회한다.
 * @param {string=} entityId Entity ID, 비어 있으면 전체
 * @return {Object} Core API 표준 응답
 */
function getWorkflowHistory(entityId) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    assertPermission_(C.PERMISSION.READ, C.ENTITY.WORKFLOW, entityId || '');
    const id = String(entityId || '').trim();
    const F = C.FIELD.WORKFLOW;
    return SheetRepository.findAll(C.SHEETS.WORKFLOW_HISTORY)
      .filter(function (row) {
        return !id || String(row[F.ENTITY_ID] || '') === id;
      })
      .sort(function (a, b) {
        return new Date(b[F.TIMESTAMP]).getTime() -
          new Date(a[F.TIMESTAMP]).getTime();
      });
  }, { operation: 'getWorkflowHistory' });
}

/**
 * 현재 상태와 가능한 다음 상태를 반환한다.
 * @param {string} entity Entity
 * @param {string} entityId Entity ID
 * @return {Object} Core API 표준 응답
 */
function getWorkflowState(entity, entityId) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    assertPermission_(C.PERMISSION.READ, C.ENTITY.WORKFLOW, entityId);
    const config = getWorkflowEntityConfig_(entity);
    const record = SheetRepository.findById(config.sheetName, entityId);
    if (!record) throw new NotFoundError('Entity를 찾을 수 없습니다.', 'entityId');
    const current = String(record[config.statusField] || '').trim().toUpperCase();
    return {
      entity: String(entity).toUpperCase(),
      entityId: entityId,
      currentStatus: current,
      availableTransitions: getAvailableTransitions(current),
    };
  }, { operation: 'getWorkflowState' });
}

function changeWorkflowStatus_(entity, entityId, newStatus, action, message) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    assertPermission_(C.PERMISSION.UPDATE, C.ENTITY.WORKFLOW, entityId);
    const config = getWorkflowEntityConfig_(entity);
    const current = SheetRepository.findById(config.sheetName, entityId);
    if (!current) throw new NotFoundError('Entity를 찾을 수 없습니다.', 'entityId');
    const from = String(current[config.statusField] || '').trim().toUpperCase();
    const to = String(newStatus || '').trim().toUpperCase();
    try {
      validateTransition(from, to);
      const patch = {};
      patch[config.statusField] = to;
      if (config.updatedField) patch[config.updatedField] = new Date();
      const saved = SheetRepository.update(config.sheetName, entityId, patch);
      writeWorkflowHistory_(entity, entityId, from, to, action, 'SUCCESS', message);
      writeEntityAudit_(
        action === 'STATUS_CHANGE' ? C.AUDIT_ACTION.WORKFLOW_CHANGE : action,
        String(entity).toUpperCase(),
        entityId,
        C.AUDIT_RESULT.SUCCESS,
        message || from + ' → ' + to,
        { fromStatus: from, toStatus: to }
      );
      createWorkflowNotification_(entity, entityId, action, to);
      return { record: saved, fromStatus: from, toStatus: to };
    } catch (error) {
      writeWorkflowHistory_(entity, entityId, from, to, action, 'FAIL', error.message);
      throw error;
    }
  }, { operation: 'changeWorkflowStatus' });
}

function getWorkflowEntityConfig_(entity) {
  const C = HLAS_CONSTANTS;
  const type = String(entity || '').trim().toUpperCase();
  const configs = {};
  configs[C.ENTITY.PROJECT] = {
    sheetName: C.SHEETS.PROJECT,
    statusField: C.FIELD.PROJECT.STATUS,
    updatedField: C.FIELD.PROJECT.UPDATED_AT,
  };
  configs[C.ENTITY.EPIC] = {
    sheetName: C.SHEETS.EPIC,
    statusField: C.FIELD.EPIC.STATUS,
    updatedField: C.FIELD.EPIC.UPDATED_AT,
  };
  configs[C.ENTITY.FEATURE] = {
    sheetName: C.SHEETS.FEATURE,
    statusField: C.FIELD.FEATURE.STATUS, updatedField: C.FIELD.FEATURE.UPDATED_AT,
  };
  configs[C.ENTITY.FUNCTION] = {
    sheetName: C.SHEETS.FUNCTION,
    statusField: C.FIELD.FUNCTION.STATUS,
    updatedField: C.FIELD.FUNCTION.UPDATED_AT,
  };
  configs[C.ENTITY.TASK] = {
    sheetName: C.SHEETS.TASK,
    statusField: C.FIELD.TASK.STATUS, updatedField: C.FIELD.TASK.UPDATED_AT,
  };
  if (!configs[type]) {
    throw new ValidationError('지원하지 않는 Workflow Entity입니다.', 'entity');
  }
  return configs[type];
}

function writeWorkflowHistory_(
  entity, entityId, from, to, action, result, message
) {
  const C = HLAS_CONSTANTS;
  const F = C.FIELD.WORKFLOW;
  const user = getCurrentUser();
  const row = {};
  row[F.WORKFLOW_ID] = 'WF-' + Utilities.getUuid().toUpperCase();
  row[F.TIMESTAMP] = new Date();
  row[F.ENTITY] = String(entity || '').toUpperCase();
  row[F.ENTITY_ID] = entityId;
  row[F.FROM_STATUS] = from;
  row[F.TO_STATUS] = to;
  row[F.USER] = user.email || 'UNKNOWN';
  row[F.ROLE] = user.role;
  row[F.ACTION] = action;
  row[F.RESULT] = result;
  row[F.MESSAGE] = message || '';
  return SheetRepository.insert(C.SHEETS.WORKFLOW_HISTORY, row);
}

function createWorkflowNotification_(entity, entityId, action, status) {
  const C = HLAS_CONSTANTS;
  const titles = {
    REQUEST_APPROVAL: '승인 요청',
    APPROVAL: '승인 완료',
    REJECT: '승인 반려',
    CANCEL_APPROVAL: '승인 요청 취소',
    STATUS_CHANGE: '상태 변경',
  };
  return createNotification({
    type: action === 'REJECT'
      ? C.NOTIFICATION_TYPE.WARNING : C.NOTIFICATION_TYPE.INFO,
    user: getCurrentUser().email || 'ADMIN',
    entity: String(entity).toUpperCase(),
    entityId: entityId,
    title: titles[action] || 'Workflow 변경',
    message: entityId + ' 상태가 ' + status + '(으)로 변경되었습니다.',
  });
}
