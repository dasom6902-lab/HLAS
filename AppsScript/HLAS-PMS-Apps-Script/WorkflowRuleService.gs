/**
 * 상태 전이가 허용되는지 검증한다.
 * @param {string} fromStatus 현재 상태
 * @param {string} toStatus 변경 상태
 * @return {boolean} 허용 시 true
 */
function validateTransition(fromStatus, toStatus) {
  const C = HLAS_CONSTANTS;
  const from = String(fromStatus || '').trim().toUpperCase();
  const to = String(toStatus || '').trim().toUpperCase();
  Validation.required(from, 'fromStatus');
  Validation.required(to, 'toStatus');
  if (C.WORKFLOW_STATUS.VALUES.indexOf(from) === -1) {
    throw new ValidationError('정의되지 않은 현재 상태입니다: ' + from, 'fromStatus');
  }
  if (C.WORKFLOW_STATUS.VALUES.indexOf(to) === -1) {
    throw new ValidationError('정의되지 않은 변경 상태입니다: ' + to, 'toStatus');
  }
  const allowed = getWorkflowTransitions_()[from] || [];
  if (allowed.indexOf(to) === -1) {
    throw new ValidationError(
      '허용되지 않은 상태 전이입니다: ' + from + ' → ' + to,
      'toStatus',
      { fromStatus: from, toStatus: to, allowed: allowed },
      'WORKFLOW_TRANSITION_DENIED'
    );
  }
  return true;
}

/**
 * 현재 상태에서 이동 가능한 다음 상태를 반환한다.
 * @param {string} currentStatus 현재 상태
 * @return {string[]} 다음 상태
 */
function getAvailableTransitions(currentStatus) {
  return (getWorkflowTransitions_()[
    String(currentStatus || '').trim().toUpperCase()
  ] || []).slice();
}

function getWorkflowTransitions_() {
  const S = HLAS_CONSTANTS.WORKFLOW_STATUS;
  const rules = {};
  rules[S.DRAFT] = [S.READY, S.CANCELLED];
  rules[S.READY] = [S.IN_PROGRESS, S.CANCELLED];
  rules[S.IN_PROGRESS] = [S.WAITING_APPROVAL, S.CANCELLED];
  rules[S.WAITING_APPROVAL] = [S.APPROVED, S.REJECTED, S.IN_PROGRESS];
  rules[S.APPROVED] = [S.COMPLETED];
  rules[S.REJECTED] = [S.IN_PROGRESS, S.CANCELLED];
  rules[S.COMPLETED] = [];
  rules[S.CANCELLED] = [];
  return rules;
}
