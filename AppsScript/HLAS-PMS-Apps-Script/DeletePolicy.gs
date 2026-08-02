/**
 * PROJECT 삭제 가능 여부를 확인한다.
 *
 * @param {string} projectId 검사할 PROJECT_ID
 * @return {Object} `{ok:true}` 또는 삭제 불가 사유
 */
function canDeleteProject(projectId) {
  Validation.required(projectId, HLAS_CONSTANTS.FIELD.PROJECT.PROJECT_ID);
  return evaluateChildPolicy_(
    HLAS_CONSTANTS.SHEETS.EPIC,
    HLAS_CONSTANTS.FIELD.EPIC.PROJECT_ID,
    projectId,
    '하위 EPIC이 존재합니다.'
  );
}

/**
 * EPIC 삭제 가능 여부를 확인한다.
 *
 * @param {string} epicId 검사할 EPIC_ID
 * @return {Object} `{ok:true}` 또는 삭제 불가 사유
 */
function canDeleteEpic(epicId) {
  Validation.required(epicId, HLAS_CONSTANTS.FIELD.EPIC.EPIC_ID);
  return evaluateChildPolicy_(
    HLAS_CONSTANTS.SHEETS.FEATURE,
    HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID,
    epicId,
    '하위 FEATURE가 존재합니다.'
  );
}

/**
 * FEATURE 삭제 가능 여부를 확인한다.
 *
 * @param {string} featureId 검사할 FEATURE_ID
 * @return {Object} `{ok:true}` 또는 삭제 불가 사유
 */
function canDeleteFeature(featureId) {
  Validation.required(featureId, HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID);
  return evaluateChildPolicy_(
    HLAS_CONSTANTS.SHEETS.FUNCTION,
    HLAS_CONSTANTS.FIELD.FUNCTION.FEATURE_ID,
    featureId,
    '하위 FUNCTION이 존재합니다.'
  );
}

/**
 * FUNCTION 삭제 가능 여부를 확인한다.
 *
 * @param {string} functionId 검사할 FUNCTION_ID
 * @return {Object} `{ok:true}` 또는 삭제 불가 사유
 */
function canDeleteFunction(functionId) {
  Validation.required(functionId, HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID);
  return evaluateChildPolicy_(
    HLAS_CONSTANTS.SHEETS.TASK,
    HLAS_CONSTANTS.FIELD.TASK.FUNCTION_ID,
    functionId,
    '하위 TASK가 존재합니다.'
  );
}

/**
 * 자식 시트에서 부모 ID를 참조하는 행이 있는지 검사한다.
 *
 * @param {string} childSheetName 자식 시트명
 * @param {string} parentField 자식 시트의 부모 ID 컬럼명
 * @param {string} parentId 검사할 부모 ID
 * @param {string} blockedMessage 삭제 제한 메시지
 * @return {Object} 삭제 정책 결과
 * @private
 */
function evaluateChildPolicy_(
  childSheetName,
  parentField,
  parentId,
  blockedMessage
) {
  const normalizedId = String(parentId).trim();
  const hasChild = SheetRepository
    .findAll(childSheetName)
    .some(function (record) {
      return String(record[parentField] || '').trim() === normalizedId;
    });

  return hasChild
    ? { ok: false, message: blockedMessage }
    : { ok: true };
}

/**
 * 삭제 정책 결과가 실패이면 Core 표준 오류를 발생시킨다.
 *
 * @param {Object} policyResult DeletePolicy 검사 결과
 * @param {string} field 오류 대상 필드
 * @param {string} id 삭제 대상 ID
 * @return {boolean} 삭제 가능하면 true
 * @private
 */
function assertDeleteAllowed_(policyResult, field, id) {
  if (!policyResult || policyResult.ok !== true) {
    throw new ValidationError(
      policyResult && policyResult.message
        ? policyResult.message
        : '하위 데이터가 있어 삭제할 수 없습니다.',
      field,
      { id: id },
      'REFERENTIAL_INTEGRITY'
    );
  }
  return true;
}
