/**
 * 부모 엔티티가 실제로 존재하는지 검증하고 해당 원본 레코드를 반환한다.
 *
 * 지원 대상은 EPIC, FEATURE, FUNCTION이다. 존재하지 않으면
 * 표준 NotFoundError를 발생시킨다.
 *
 * @param {string} entityType HLAS_CONSTANTS.ENTITY의 부모 엔티티 유형
 * @param {string} parentId 검증할 부모 ID
 * @return {Object} SheetRepository에서 조회한 부모 레코드
 */
function validateParent(entityType, parentId) {
  const normalizedType = String(entityType || '').trim().toUpperCase();
  const normalizedId = String(parentId || '').trim();

  Validation.required(normalizedType, 'entityType');
  Validation.required(normalizedId, 'parentId');

  const config = getParentValidatorConfig_(normalizedType);
  const record = SheetRepository.findById(config.sheetName, normalizedId);

  if (!record) {
    throw new NotFoundError(
      '연결할 ' + normalizedType + '을(를) 찾을 수 없습니다.',
      config.idField,
      {
        entityType: normalizedType,
        parentId: normalizedId,
      },
      'PARENT_NOT_FOUND'
    );
  }
  return record;
}

function getParentValidatorConfig_(entityType) {
  const configurations = {};

  configurations[HLAS_CONSTANTS.ENTITY.EPIC] = {
    sheetName: HLAS_CONSTANTS.SHEETS.EPIC,
    idField: HLAS_CONSTANTS.FIELD.EPIC.EPIC_ID,
  };
  configurations[HLAS_CONSTANTS.ENTITY.FEATURE] = {
    sheetName: HLAS_CONSTANTS.SHEETS.FEATURE,
    idField: HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID,
  };
  configurations[HLAS_CONSTANTS.ENTITY.FUNCTION] = {
    sheetName: HLAS_CONSTANTS.SHEETS.FUNCTION,
    idField: HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID,
  };

  const config = configurations[entityType];
  if (!config) {
    throw new ValidationError(
      '지원하지 않는 부모 엔티티 유형입니다: ' + entityType,
      'entityType',
      { supportedTypes: Object.keys(configurations) },
      'VALIDATION_PARENT_TYPE'
    );
  }
  return config;
}
