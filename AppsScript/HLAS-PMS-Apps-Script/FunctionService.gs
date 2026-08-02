/**
 * @fileoverview HLAS FUNCTION 업무 서비스.
 *
 * FUNCTION 규칙, 검증, Repository 조합 및 변경 로그를 담당한다.
 */

/**
 * FUNCTION 목록을 조회한다.
 *
 * @param {string|Object=} featureId 부모 ID 또는 검색 옵션
 * @return {Object} Core API 표준 응답
 */
function functionServiceGetFunctionList_(featureId) {
  return CommonAPI.execute(function () {
    const options = typeof featureId === 'object'
      ? featureId
      : { parentId: String(featureId || '').trim() };
    const response = search(HLAS_CONSTANTS.ENTITY.FUNCTION, options);
    if (!response.ok) throw coreErrorFromResponse_(response.error);
    return response.data.map(toFunctionModel_);
  }, { operation: 'getFunctionList' });
}

/**
 * FUNCTION_ID로 FUNCTION 한 건을 조회한다.
 *
 * @param {string} id 조회할 FUNCTION_ID
 * @return {Object} Core API 표준 응답
 */
function functionServiceGetFunction_(id) {
  return CommonAPI.execute(function () {
    Validation.required(id, HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID);

    const record = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.FUNCTION,
      String(id).trim()
    );
    if (!record) {
      throw new NotFoundError(
        'FUNCTION을 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID,
        { id: id }
      );
    }
    return toFunctionModel_(record);
  }, { operation: 'getFunction' });
}

/**
 * 새로운 FUNCTION을 생성한다.
 *
 * @param {Object} data FUNCTION 입력값
 * @return {Object} Core API 표준 응답
 */
function functionServiceCreateFunction_(data) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.CREATE,
      HLAS_CONSTANTS.ENTITY.FUNCTION,
      ''
    );
    const input = normalizeFunctionInput_(data);
    const lock = LockService.getDocumentLock();
    lock.waitLock(30000);

    try {
      const now = new Date();
      const functionId = generateId(HLAS_CONSTANTS.ENTITY.FUNCTION);
      const fields = HLAS_CONSTANTS.FIELD.FUNCTION;
      const record = {};

      record[fields.FUNCTION_ID] = functionId;
      record[fields.FEATURE_ID] = input.featureId;
      record[fields.FUNCTION_NAME] = input.functionName;
      record[fields.DESCRIPTION] = input.description;
      record[fields.INPUT_DEFINITION] = input.inputDefinition;
      record[fields.OUTPUT_DEFINITION] = input.outputDefinition;
      record[fields.RELATED_SHEETS] = input.relatedSheets;
      record[fields.STATUS] =
        input.status || HLAS_CONSTANTS.STATUS.IN_PROGRESS;
      record[fields.OWNER] = input.owner;
      record[fields.CREATED_AT] = now;
      record[fields.UPDATED_AT] = now;

      validateFunctionRecord_(record);
      Validation.uniqueId(HLAS_CONSTANTS.SHEETS.FUNCTION, functionId);

      const saved = SheetRepository.insert(
        HLAS_CONSTANTS.SHEETS.FUNCTION,
        record
      );

      CommonAPI.writeLog({
        changeType: HLAS_CONSTANTS.LOG_TYPE.FUNCTION_CREATE,
        message: 'FUNCTION 생성: ' + input.functionName,
        relatedId: functionId,
        result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
      });
      writeEntityAudit_(
        HLAS_CONSTANTS.AUDIT_ACTION.CREATE,
        HLAS_CONSTANTS.ENTITY.FUNCTION,
        functionId,
        HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
        'FUNCTION 생성: ' + input.functionName
      );

      return toFunctionModel_(saved);
    } finally {
      lock.releaseLock();
    }
  }, { operation: 'createFunction' });
}

/**
 * 기존 FUNCTION을 수정한다.
 *
 * @param {string} id 수정할 FUNCTION_ID
 * @param {Object} data 변경할 입력값
 * @return {Object} Core API 표준 응답
 */
function functionServiceUpdateFunction_(id, data) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.UPDATE,
      HLAS_CONSTANTS.ENTITY.FUNCTION,
      id
    );
    Validation.required(id, HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID);

    const current = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.FUNCTION,
      String(id).trim()
    );
    if (!current) {
      throw new NotFoundError(
        '수정할 FUNCTION을 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID,
        { id: id }
      );
    }

    const input = normalizeFunctionInput_(data);
    const fields = HLAS_CONSTANTS.FIELD.FUNCTION;
    const next = Object.assign({}, current);

    next[fields.FEATURE_ID] = input.featureId;
    next[fields.FUNCTION_NAME] = input.functionName;
    next[fields.DESCRIPTION] = input.description;
    next[fields.INPUT_DEFINITION] = input.inputDefinition;
    next[fields.OUTPUT_DEFINITION] = input.outputDefinition;
    next[fields.RELATED_SHEETS] = input.relatedSheets;
    next[fields.STATUS] = input.status;
    next[fields.OWNER] = input.owner;
    next[fields.UPDATED_AT] = new Date();

    validateFunctionRecord_(next);

    const saved = SheetRepository.update(
      HLAS_CONSTANTS.SHEETS.FUNCTION,
      String(id).trim(),
      next
    );

    CommonAPI.writeLog({
      changeType: HLAS_CONSTANTS.LOG_TYPE.FUNCTION_UPDATE,
      message: 'FUNCTION 수정: ' + input.functionName,
      relatedId: String(id).trim(),
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    writeEntityAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.UPDATE,
      HLAS_CONSTANTS.ENTITY.FUNCTION,
      String(id).trim(),
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'FUNCTION 수정: ' + input.functionName
    );

    return toFunctionModel_(saved);
  }, { operation: 'updateFunction' });
}

/**
 * FUNCTION_ID에 해당하는 FUNCTION을 삭제한다.
 *
 * @param {string} id 삭제할 FUNCTION_ID
 * @return {Object} Core API 표준 응답
 */
function functionServiceDeleteFunction_(id) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.DELETE,
      HLAS_CONSTANTS.ENTITY.FUNCTION,
      id
    );
    Validation.required(id, HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID);

    const current = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.FUNCTION,
      String(id).trim()
    );
    if (!current) {
      throw new NotFoundError(
        '삭제할 FUNCTION을 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID,
        { id: id }
      );
    }

    assertDeleteAllowed_(
      canDeleteFunction(String(id).trim()),
      HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_ID,
      String(id).trim()
    );

    SheetRepository.delete(HLAS_CONSTANTS.SHEETS.FUNCTION, String(id).trim());

    CommonAPI.writeLog({
      changeType: HLAS_CONSTANTS.LOG_TYPE.FUNCTION_DELETE,
      message:
        'FUNCTION 삭제: ' +
        current[HLAS_CONSTANTS.FIELD.FUNCTION.FUNCTION_NAME],
      relatedId: String(id).trim(),
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    writeEntityAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.DELETE,
      HLAS_CONSTANTS.ENTITY.FUNCTION,
      String(id).trim(),
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'FUNCTION 삭제'
    );

    return {
      functionId: String(id).trim(),
      deleted: true,
    };
  }, { operation: 'deleteFunction' });
}

/**
 * FUNCTION Dialog에 필요한 FEATURE 목록, 코드값, 수정 데이터를 반환한다.
 *
 * @param {string=} functionId 수정할 FUNCTION_ID. 신규 등록이면 빈 값
 * @return {Object} Core API 표준 응답
 */
function functionServiceGetFunctionFormData_(functionId) {
  return CommonAPI.execute(function () {
    const featureOptions = SheetRepository
      .findAll(HLAS_CONSTANTS.SHEETS.FEATURE)
      .map(function (record) {
        return {
          featureId: String(
            record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID] || ''
          ),
          featureName: String(
            record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME] || ''
          ),
          epicId: String(record[HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID] || ''),
        };
      });

    let functionData = null;
    if (String(functionId || '').trim()) {
      const response = functionServiceGetFunction_(String(functionId).trim());
      if (!response.ok) {
        throw functionCoreErrorFromResponse_(response.error);
      }
      functionData = response.data;
    }

    return {
      functionData: functionData,
      featureOptions: featureOptions,
      statuses: HLAS_CONSTANTS.STATUS.VALUES.slice(),
      defaultStatus: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
    };
  }, { operation: 'getFunctionFormData' });
}

function normalizeFunctionInput_(data) {
  const input = data || {};
  return {
    featureId: String(input.featureId || '').trim(),
    functionName: String(input.functionName || '').trim(),
    description: String(input.description || '').trim(),
    inputDefinition: String(input.inputDefinition || '').trim(),
    outputDefinition: String(input.outputDefinition || '').trim(),
    relatedSheets: String(input.relatedSheets || '').trim(),
    status: String(
      input.status || HLAS_CONSTANTS.STATUS.IN_PROGRESS
    ).trim(),
    owner: String(input.owner || '').trim(),
  };
}

function validateFunctionRecord_(record) {
  const fields = HLAS_CONSTANTS.FIELD.FUNCTION;

  CommonAPI.validate(function () {
    Validation.required(record[fields.FUNCTION_ID], fields.FUNCTION_ID);
    Validation.required(record[fields.FUNCTION_NAME], fields.FUNCTION_NAME);
    Validation.maxLength(
      record[fields.FUNCTION_NAME],
      200,
      fields.FUNCTION_NAME
    );
    Validation.required(record[fields.FEATURE_ID], fields.FEATURE_ID);
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

    validateParent(
      HLAS_CONSTANTS.ENTITY.FEATURE,
      record[fields.FEATURE_ID]
    );
  });
}

function toFunctionModel_(record) {
  const fields = HLAS_CONSTANTS.FIELD.FUNCTION;
  return {
    functionId: String(record[fields.FUNCTION_ID] || ''),
    featureId: String(record[fields.FEATURE_ID] || ''),
    functionName: String(record[fields.FUNCTION_NAME] || ''),
    description: String(record[fields.DESCRIPTION] || ''),
    inputDefinition: String(record[fields.INPUT_DEFINITION] || ''),
    outputDefinition: String(record[fields.OUTPUT_DEFINITION] || ''),
    relatedSheets: String(record[fields.RELATED_SHEETS] || ''),
    status: String(record[fields.STATUS] || ''),
    owner: String(record[fields.OWNER] || ''),
    createdAt: formatFunctionDateTime_(record[fields.CREATED_AT]),
    updatedAt: formatFunctionDateTime_(record[fields.UPDATED_AT]),
  };
}

function formatFunctionDateTime_(value) {
  if (!value) {
    return '';
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd HH:mm:ss'
    );
  }
  return String(value);
}

function functionCoreErrorFromResponse_(error) {
  const value = error || {};
  return new CoreError(
    value.code || 'INTERNAL_ERROR',
    value.message || '시스템 오류가 발생했습니다.',
    value.field || null,
    value.details || null
  );
}
