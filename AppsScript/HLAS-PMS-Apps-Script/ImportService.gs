/**
 * Import 데이터를 미리 분석한다.
 *
 * @param {Object} data {entity, records}
 * @return {Object} Core API 표준 응답
 */
function previewImport(data) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.IMPORT, '');
    const context = buildImportContext_(data);
    const validation = validateImportRecords_(context, false);
    return {
      entity: context.entity,
      newCount: validation.newCount,
      updateCount: validation.updateCount,
      errorCount: validation.errors.length,
      errors: validation.errors,
    };
  }, { operation: 'previewImport' });
}

/**
 * Import 전체 행과 부모 관계를 검증한다.
 *
 * @param {Object} data {entity, records}
 * @return {Object} Core API 표준 응답
 */
function validateImport(data) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.IMPORT, '');
    const context = buildImportContext_(data);
    const result = validateImportRecords_(context, true);
    return {
      valid: result.errors.length === 0,
      entity: context.entity,
      newCount: result.newCount,
      updateCount: result.updateCount,
      errorCount: result.errors.length,
      errors: result.errors,
    };
  }, { operation: 'validateImport' });
}

/**
 * 검증된 데이터를 신규 등록 또는 수정한다.
 *
 * @param {Object} data {entity, records}
 * @return {Object} Core API 표준 응답
 */
function executeImport(data) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.IMPORT, '');
    const context = buildImportContext_(data);
    const checked = validateImportRecords_(context, true);
    if (checked.errors.length) {
      throw new ValidationError(
        'Import 검증 오류가 있습니다.',
        'records',
        checked.errors,
        'IMPORT_VALIDATION_FAILED'
      );
    }

    let created = 0;
    let updated = 0;
    context.records.forEach(function (record) {
      const id = String(record[context.config.idField] || '').trim();
      if (context.existingById[id]) {
        assertPermission_(HLAS_CONSTANTS.PERMISSION.UPDATE, context.entity, id);
        SheetRepository.update(context.config.sheetName, id, record);
        updated += 1;
      } else {
        SheetRepository.insert(context.config.sheetName, record);
        created += 1;
      }
    });

    writeImportExportAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.IMPORT,
      context.entity,
      'SUCCESS',
      'Import 완료',
      { created: created, updated: updated }
    );
    notifyDataOperation_('Import 완료', context.entity + ': 신규 ' + created + ', 수정 ' + updated);
    return { entity: context.entity, created: created, updated: updated };
  }, { operation: 'executeImport' });
}

function buildImportContext_(data) {
  const input = data || {};
  const entity = String(input.entity || '').trim().toUpperCase();
  const config = getDataEntityConfig_(entity);
  if (!Array.isArray(input.records)) {
    throw new ValidationError('records 배열이 필요합니다.', 'records');
  }
  const existing = SheetRepository.findAll(config.sheetName);
  const existingById = {};
  existing.forEach(function (row) {
    existingById[String(row[config.idField] || '').trim()] = row;
  });
  return {
    entity: entity,
    config: config,
    records: input.records,
    existingById: existingById,
  };
}

function validateImportRecords_(context, validateParents) {
  const errors = [];
  const seen = {};
  let newCount = 0;
  let updateCount = 0;
  context.records.forEach(function (record, index) {
    try {
      if (!record || typeof record !== 'object') {
        throw new ValidationError('행 데이터가 객체가 아닙니다.', 'records');
      }
      const id = String(record[context.config.idField] || '').trim();
      Validation.required(id, context.config.idField);
      if (seen[id]) {
        throw new DuplicateError('Import 파일 안에 중복 ID가 있습니다.', context.config.idField, { id: id });
      }
      seen[id] = true;
      context.config.required.forEach(function (field) {
        Validation.required(record[field], field);
      });
      if (validateParents && context.config.parentField) {
        validateImportParent_(
          context.config.parentEntity,
          record[context.config.parentField]
        );
      }
      if (context.existingById[id]) updateCount += 1;
      else newCount += 1;
    } catch (error) {
      errors.push({
        row: index + 1,
        id: String((record || {})[context.config.idField] || ''),
        code: error.code || 'VALIDATION_ERROR',
        message: error.message,
      });
    }
  });
  return { newCount: newCount, updateCount: updateCount, errors: errors };
}

function validateImportParent_(parentEntity, parentId) {
  Validation.required(parentId, 'parentId');
  const parentConfig = getDataEntityConfig_(parentEntity);
  if (!SheetRepository.findById(parentConfig.sheetName, String(parentId).trim())) {
    throw new NotFoundError(
      '연결된 부모 Entity를 찾을 수 없습니다.',
      parentConfig.idField,
      { parentEntity: parentEntity, parentId: parentId },
      'PARENT_NOT_FOUND'
    );
  }
}

function getDataEntityConfig_(entity) {
  const C = HLAS_CONSTANTS;
  const configs = {};
  configs[C.ENTITY.PROJECT] = {
    sheetName: C.SHEETS.PROJECT,
    idField: C.FIELD.PROJECT.PROJECT_ID,
    required: [
      C.FIELD.PROJECT.PROJECT_ID,
      C.FIELD.PROJECT.PROJECT_NAME,
    ],
  };
  configs[C.ENTITY.EPIC] = {
    sheetName: C.SHEETS.EPIC,
    idField: C.FIELD.EPIC.EPIC_ID,
    required: [
      C.FIELD.EPIC.EPIC_ID,
      C.FIELD.EPIC.PROJECT_ID,
      C.FIELD.EPIC.EPIC_NAME,
    ],
    parentField: C.FIELD.EPIC.PROJECT_ID,
    parentEntity: C.ENTITY.PROJECT,
  };
  configs[C.ENTITY.FEATURE] = {
    sheetName: C.SHEETS.FEATURE, idField: C.FIELD.FEATURE.FEATURE_ID,
    required: [C.FIELD.FEATURE.FEATURE_ID, C.FIELD.FEATURE.EPIC_ID, C.FIELD.FEATURE.FEATURE_NAME],
    parentField: C.FIELD.FEATURE.EPIC_ID, parentEntity: C.ENTITY.EPIC,
  };
  configs[C.ENTITY.FUNCTION] = {
    sheetName: C.SHEETS.FUNCTION, idField: C.FIELD.FUNCTION.FUNCTION_ID,
    required: [
      C.FIELD.FUNCTION.FUNCTION_ID,
      C.FIELD.FUNCTION.FEATURE_ID,
      C.FIELD.FUNCTION.FUNCTION_NAME,
    ],
    parentField: C.FIELD.FUNCTION.FEATURE_ID, parentEntity: C.ENTITY.FEATURE,
  };
  configs[C.ENTITY.TASK] = {
    sheetName: C.SHEETS.TASK, idField: C.FIELD.TASK.TASK_ID,
    required: [
      C.FIELD.TASK.TASK_ID,
      C.FIELD.TASK.FUNCTION_ID,
      C.FIELD.TASK.TASK_NAME,
    ],
    parentField: C.FIELD.TASK.FUNCTION_ID, parentEntity: C.ENTITY.FUNCTION,
  };
  const config = configs[entity];
  if (!config) {
    throw new ValidationError('지원하지 않는 Entity입니다: ' + entity, 'entity');
  }
  return config;
}

function writeImportExportAudit_(action, entity, result, message, detail) {
  return writeEntityAudit_(action, entity, '', result, message, detail);
}

function notifyDataOperation_(title, message) {
  const C = HLAS_CONSTANTS;
  const response = createNotification({
    type: C.NOTIFICATION_TYPE.SUCCESS,
    user: getCurrentUser().email || 'ADMIN',
    entity: C.ENTITY.BACKUP,
    entityId: '',
    title: title,
    message: message,
  });
  return response;
}
