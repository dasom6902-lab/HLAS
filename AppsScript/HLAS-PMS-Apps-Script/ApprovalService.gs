/**
 * 승인을 요청한다.
 * @param {string} entity Entity
 * @param {string} entityId Entity ID
 * @param {string=} message 요청 메시지
 * @return {Object} Core API 표준 응답
 */
function requestApproval(entity, entityId, message) {
  return changeWorkflowStatus_(
    entity, entityId,
    HLAS_CONSTANTS.WORKFLOW_STATUS.WAITING_APPROVAL,
    'REQUEST_APPROVAL', message || '승인을 요청했습니다.'
  );
}

/**
 * 승인한다.
 * @param {string} entity Entity
 * @param {string} entityId Entity ID
 * @param {string=} message 승인 메시지
 * @return {Object} Core API 표준 응답
 */
function approve(entity, entityId, message) {
  try {
    assertApprovalRole_();
  } catch (error) {
    return CommonAPI.error(error, { operation: 'approve' });
  }
  return changeWorkflowStatus_(
    entity, entityId, HLAS_CONSTANTS.WORKFLOW_STATUS.APPROVED,
    HLAS_CONSTANTS.AUDIT_ACTION.APPROVAL, message || '승인되었습니다.'
  );
}

/**
 * 반려한다.
 * @param {string} entity Entity
 * @param {string} entityId Entity ID
 * @param {string=} message 반려 사유
 * @return {Object} Core API 표준 응답
 */
function reject(entity, entityId, message) {
  try {
    assertApprovalRole_();
  } catch (error) {
    return CommonAPI.error(error, { operation: 'reject' });
  }
  return changeWorkflowStatus_(
    entity, entityId, HLAS_CONSTANTS.WORKFLOW_STATUS.REJECTED,
    HLAS_CONSTANTS.AUDIT_ACTION.REJECT, message || '반려되었습니다.'
  );
}

/**
 * 승인 요청을 취소한다.
 * @param {string} entity Entity
 * @param {string} entityId Entity ID
 * @param {string=} message 취소 메시지
 * @return {Object} Core API 표준 응답
 */
function cancelApproval(entity, entityId, message) {
  return changeWorkflowStatus_(
    entity, entityId, HLAS_CONSTANTS.WORKFLOW_STATUS.IN_PROGRESS,
    'CANCEL_APPROVAL', message || '승인 요청을 취소했습니다.'
  );
}

/**
 * 승인 대기 목록을 조회한다.
 * @param {string=} entity Entity 필터
 * @return {Object} Core API 표준 응답
 */
function getPendingApprovals(entity) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    assertPermission_(C.PERMISSION.READ, C.ENTITY.APPROVAL, '');
    const entities = entity ? [String(entity).toUpperCase()] : [
      C.ENTITY.PROJECT, C.ENTITY.EPIC, C.ENTITY.FEATURE,
      C.ENTITY.FUNCTION, C.ENTITY.TASK,
    ];
    const rows = [];
    entities.forEach(function (type) {
      const config = getWorkflowEntityConfig_(type);
      SheetRepository.findAll(config.sheetName).forEach(function (record) {
        if (
          String(record[config.statusField] || '') ===
          C.WORKFLOW_STATUS.WAITING_APPROVAL
        ) {
          rows.push({
            entity: type,
            entityId: String(record[Object.keys(record)[0]] || ''),
            record: record,
          });
        }
      });
    });
    return rows;
  }, { operation: 'getPendingApprovals' });
}

function assertApprovalRole_() {
  const C = HLAS_CONSTANTS;
  const role = getCurrentRole();
  if (role !== C.ROLE.ADMIN && role !== C.ROLE.MANAGER) {
    writeEntityAudit_(
      C.AUDIT_ACTION.PERMISSION_DENIED, C.ENTITY.APPROVAL, '',
      C.AUDIT_RESULT.DENIED, '승인 권한이 없습니다.', { role: role }
    );
    throw new CoreError(
      'PERMISSION_DENIED',
      '승인 권한은 ADMIN 또는 MANAGER에게만 있습니다.',
      'role', { role: role }
    );
  }
  return true;
}
