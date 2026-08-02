/**
 * HLAS 엔티티의 다음 ID를 생성한다.
 *
 * ID 생성과 저장의 원자성을 보장하려면 호출 측에서 DocumentLock을
 * 획득한 상태로 이 함수를 호출해야 한다.
 *
 * @param {string} entityType HLAS_CONSTANTS.ENTITY에 정의된 엔티티 유형
 * @return {string} 엔티티별 접두어와 4자리 번호로 구성된 ID
 */
function generateId(entityType) {
  const normalizedType = String(entityType || '').trim().toUpperCase();
  const config = getIdGeneratorConfig_(normalizedType);
  const records = SheetRepository.findAll(config.sheetName);
  let maxNumber = 0;

  records.forEach(function (record) {
    const value = String(record[config.idField] || '').trim();

    config.acceptedPrefixes.forEach(function (prefix) {
      const expression = new RegExp(
        '^' + escapeIdPrefix_(prefix) + '(\\d{' +
          HLAS_CONSTANTS.ID.PAD_LENGTH + ',})$'
      );
      const match = value.match(expression);
      if (match) {
        maxNumber = Math.max(maxNumber, Number(match[1]));
      }
    });
  });

  return (
    config.prefix +
    String(maxNumber + 1).padStart(HLAS_CONSTANTS.ID.PAD_LENGTH, '0')
  );
}

function getIdGeneratorConfig_(entityType) {
  const configurations = {};

  configurations[HLAS_CONSTANTS.ENTITY.PROJECT] = {
    sheetName: HLAS_CONSTANTS.SHEETS.PROJECT,
    idField: HLAS_CONSTANTS.FIELD.PROJECT.PROJECT_ID,
    prefix: HLAS_CONSTANTS.ID.PROJECT_PREFIX,
    acceptedPrefixes: [
      HLAS_CONSTANTS.ID.PROJECT_PREFIX,
      HLAS_CONSTANTS.ID.PROJECT_LEGACY_PREFIX,
    ],
  };
  configurations[HLAS_CONSTANTS.ENTITY.EPIC] = {
    sheetName: HLAS_CONSTANTS.SHEETS.EPIC,
    idField: HLAS_CONSTANTS.FIELD.EPIC.EPIC_ID,
    prefix: HLAS_CONSTANTS.ID.EPIC_PREFIX,
    acceptedPrefixes: [HLAS_CONSTANTS.ID.EPIC_PREFIX],
  };
  configurations[HLAS_CONSTANTS.ENTITY.FEATURE] = {
    sheetName: HLAS_CONSTANTS.SHEETS.FEATURE,
    idField: HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID,
    prefix: HLAS_CONSTANTS.ID.FEATURE_PREFIX,
    acceptedPrefixes: [HLAS_CONSTANTS.ID.FEATURE_PREFIX],
  };
  configurations[HLAS_CONSTANTS.ENTITY.FUNCTION] = {
    sheetName: HLAS_CONSTANTS.SHEETS.FUNCTION,
    idField: HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID,
    prefix: HLAS_CONSTANTS.ID.FUNCTION_PREFIX,
    acceptedPrefixes: [HLAS_CONSTANTS.ID.FUNCTION_PREFIX],
  };
  configurations[HLAS_CONSTANTS.ENTITY.TASK] = {
    sheetName: HLAS_CONSTANTS.SHEETS.TASK,
    idField: HLAS_CONSTANTS.FIELD.TASK.TASK_ID,
    prefix: HLAS_CONSTANTS.ID.TASK_PREFIX,
    acceptedPrefixes: [HLAS_CONSTANTS.ID.TASK_PREFIX],
  };

  const config = configurations[entityType];
  if (!config) {
    throw new ValidationError(
      '지원하지 않는 엔티티 유형입니다: ' + entityType,
      'entityType',
      { supportedTypes: Object.keys(configurations) },
      'VALIDATION_ENTITY_TYPE'
    );
  }
  return config;
}

function escapeIdPrefix_(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
