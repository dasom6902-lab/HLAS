/**
 * @fileoverview HLAS FEATURE 업무 서비스.
 *
 * FEATURE 규칙, 검증, Repository 조합 및 변경 로그를 담당한다.
 */

/**
 * 등록된 FEATURE 전체 목록을 조회한다.
 *
 * @param {Object=} options 검색·필터·정렬 옵션
 * @return {Object} Core API 표준 응답
 */
function featureServiceGetFeatureList_(options) {
  return CommonAPI.execute(function () {
    const response = search(HLAS_CONSTANTS.ENTITY.FEATURE, options);
    if (!response.ok) throw coreErrorFromResponse_(response.error);
    return response.data.map(toFeatureModel_);
  }, { operation: 'getFeatureList' });
}

/**
 * FEATURE_ID로 FEATURE 한 건을 조회한다.
 *
 * @param {string} id 조회할 FEATURE_ID
 * @return {Object} Core API 표준 응답
 */
function featureServiceGetFeature_(id) {
  return CommonAPI.execute(function () {
    Validation.required(id, HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID);

    const record = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.FEATURE,
      String(id).trim()
    );

    if (!record) {
      throw new NotFoundError(
        'FEATURE를 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID,
        { id: id }
      );
    }

    return toFeatureModel_(record);
  }, { operation: 'getFeature' });
}

/**
 * 새로운 FEATURE를 생성한다.
 *
 * @param {Object} data FEATURE 입력값
 * @return {Object} Core API 표준 응답
 */
function featureServiceCreateFeature_(data) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.CREATE,
      HLAS_CONSTANTS.ENTITY.FEATURE,
      ''
    );
    const input = normalizeFeatureInput_(data);
    const lock = LockService.getDocumentLock();
    lock.waitLock(30000);

    try {
      const now = new Date();
      const featureId = generateId(HLAS_CONSTANTS.ENTITY.FEATURE);
      const record = {};

      record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID] = featureId;
      record[HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID] = input.epicId;
      record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME] = input.featureName;
      record[HLAS_CONSTANTS.FIELD.FEATURE.DESCRIPTION] = input.description;
      record[HLAS_CONSTANTS.FIELD.FEATURE.STATUS] =
        input.status || HLAS_CONSTANTS.STATUS.IN_PROGRESS;
      record[HLAS_CONSTANTS.FIELD.FEATURE.PRIORITY] =
        input.priority || HLAS_CONSTANTS.PRIORITY.NORMAL;
      record[HLAS_CONSTANTS.FIELD.FEATURE.OWNER] = input.owner;
      record[HLAS_CONSTANTS.FIELD.FEATURE.CREATED_AT] = now;
      record[HLAS_CONSTANTS.FIELD.FEATURE.UPDATED_AT] = now;

      validateFeatureRecord_(record);
      Validation.uniqueId(HLAS_CONSTANTS.SHEETS.FEATURE, featureId);

      const saved = SheetRepository.insert(
        HLAS_CONSTANTS.SHEETS.FEATURE,
        record
      );

      CommonAPI.writeLog({
        changeType: HLAS_CONSTANTS.LOG_TYPE.FEATURE_CREATE,
        message: 'FEATURE 생성: ' + input.featureName,
        relatedId: featureId,
        result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
      });
      writeEntityAudit_(
        HLAS_CONSTANTS.AUDIT_ACTION.CREATE,
        HLAS_CONSTANTS.ENTITY.FEATURE,
        featureId,
        HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
        'FEATURE 생성: ' + input.featureName
      );

      return toFeatureModel_(saved);
    } finally {
      lock.releaseLock();
    }
  }, { operation: 'createFeature' });
}

/**
 * 기존 FEATURE를 수정한다.
 *
 * @param {string} id 수정할 FEATURE_ID
 * @param {Object} data 변경할 입력값
 * @return {Object} Core API 표준 응답
 */
function featureServiceUpdateFeature_(id, data) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.UPDATE,
      HLAS_CONSTANTS.ENTITY.FEATURE,
      id
    );
    Validation.required(id, HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID);

    const current = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.FEATURE,
      String(id).trim()
    );
    if (!current) {
      throw new NotFoundError(
        '수정할 FEATURE를 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID,
        { id: id }
      );
    }

    const input = normalizeFeatureInput_(data);
    const next = Object.assign({}, current);

    next[HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID] = input.epicId;
    next[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME] = input.featureName;
    next[HLAS_CONSTANTS.FIELD.FEATURE.DESCRIPTION] = input.description;
    next[HLAS_CONSTANTS.FIELD.FEATURE.STATUS] = input.status;
    next[HLAS_CONSTANTS.FIELD.FEATURE.PRIORITY] = input.priority;
    next[HLAS_CONSTANTS.FIELD.FEATURE.OWNER] = input.owner;
    next[HLAS_CONSTANTS.FIELD.FEATURE.UPDATED_AT] = new Date();

    validateFeatureRecord_(next);

    const saved = SheetRepository.update(
      HLAS_CONSTANTS.SHEETS.FEATURE,
      String(id).trim(),
      next
    );

    CommonAPI.writeLog({
      changeType: HLAS_CONSTANTS.LOG_TYPE.FEATURE_UPDATE,
      message: 'FEATURE 수정: ' + input.featureName,
      relatedId: String(id).trim(),
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    writeEntityAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.UPDATE,
      HLAS_CONSTANTS.ENTITY.FEATURE,
      String(id).trim(),
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'FEATURE 수정: ' + input.featureName
    );

    return toFeatureModel_(saved);
  }, { operation: 'updateFeature' });
}

/**
 * FEATURE_ID에 해당하는 FEATURE를 삭제한다.
 *
 * @param {string} id 삭제할 FEATURE_ID
 * @return {Object} Core API 표준 응답
 */
function featureServiceDeleteFeature_(id) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.DELETE,
      HLAS_CONSTANTS.ENTITY.FEATURE,
      id
    );
    Validation.required(id, HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID);

    const current = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.FEATURE,
      String(id).trim()
    );
    if (!current) {
      throw new NotFoundError(
        '삭제할 FEATURE를 찾을 수 없습니다: ' + id,
        HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID,
        { id: id }
      );
    }

    assertDeleteAllowed_(
      canDeleteFeature(String(id).trim()),
      HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID,
      String(id).trim()
    );

    SheetRepository.delete(HLAS_CONSTANTS.SHEETS.FEATURE, String(id).trim());

    CommonAPI.writeLog({
      changeType: HLAS_CONSTANTS.LOG_TYPE.FEATURE_DELETE,
      message:
        'FEATURE 삭제: ' +
        current[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME],
      relatedId: String(id).trim(),
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    writeEntityAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.DELETE,
      HLAS_CONSTANTS.ENTITY.FEATURE,
      String(id).trim(),
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'FEATURE 삭제'
    );

    return {
      featureId: String(id).trim(),
      deleted: true,
    };
  }, { operation: 'deleteFeature' });
}

/**
 * FEATURE Dialog에 필요한 EPIC 목록, 코드값, 수정 데이터를 반환한다.
 *
 * @param {string=} featureId 수정할 FEATURE_ID. 신규 등록이면 빈 값
 * @return {Object} Core API 표준 응답
 */
function featureServiceGetFeatureFormData_(featureId) {
  return CommonAPI.execute(function () {
    const epicOptions = SheetRepository
      .findAll(HLAS_CONSTANTS.SHEETS.EPIC)
      .map(function (record) {
        const fields = HLAS_CONSTANTS.FIELD.EPIC;
        return {
          epicId: String(record[fields.EPIC_ID] || ''),
          epicName: String(record[fields.EPIC_NAME] || ''),
          projectId: String(record[fields.PROJECT_ID] || ''),
        };
      });

    let feature = null;
    if (String(featureId || '').trim()) {
      const response = featureServiceGetFeature_(String(featureId).trim());
      if (!response.ok) {
        throw coreErrorFromResponse_(response.error);
      }
      feature = response.data;
    }

    return {
      feature: feature,
      epicOptions: epicOptions,
      statuses: HLAS_CONSTANTS.STATUS.VALUES.slice(),
      priorities: HLAS_CONSTANTS.PRIORITY.VALUES.slice(),
      defaultStatus: HLAS_CONSTANTS.STATUS.IN_PROGRESS,
      defaultPriority: HLAS_CONSTANTS.PRIORITY.NORMAL,
    };
  }, { operation: 'getFeatureFormData' });
}

function normalizeFeatureInput_(data) {
  const input = data || {};
  return {
    epicId: String(input.epicId || '').trim(),
    featureName: String(input.featureName || '').trim(),
    description: String(input.description || '').trim(),
    status: String(
      input.status || HLAS_CONSTANTS.STATUS.IN_PROGRESS
    ).trim(),
    priority: String(
      input.priority || HLAS_CONSTANTS.PRIORITY.NORMAL
    ).trim(),
    owner: String(input.owner || '').trim(),
  };
}

function validateFeatureRecord_(record) {
  CommonAPI.validate(function () {
    Validation.required(
      record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID],
      HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID
    );
    Validation.required(
      record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME],
      HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME
    );
    Validation.maxLength(
      record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME],
      200,
      HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME
    );
    Validation.required(
      record[HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID],
      HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID
    );
    Validation.required(
      record[HLAS_CONSTANTS.FIELD.FEATURE.STATUS],
      HLAS_CONSTANTS.FIELD.FEATURE.STATUS
    );
    Validation.validStatus(
      record[HLAS_CONSTANTS.FIELD.FEATURE.STATUS],
      HLAS_CONSTANTS.STATUS.VALUES,
      HLAS_CONSTANTS.FIELD.FEATURE.STATUS
    );
    Validation.required(
      record[HLAS_CONSTANTS.FIELD.FEATURE.CREATED_AT],
      HLAS_CONSTANTS.FIELD.FEATURE.CREATED_AT
    );
    Validation.validDate(
      record[HLAS_CONSTANTS.FIELD.FEATURE.CREATED_AT],
      HLAS_CONSTANTS.FIELD.FEATURE.CREATED_AT
    );
    Validation.required(
      record[HLAS_CONSTANTS.FIELD.FEATURE.UPDATED_AT],
      HLAS_CONSTANTS.FIELD.FEATURE.UPDATED_AT
    );
    Validation.validDate(
      record[HLAS_CONSTANTS.FIELD.FEATURE.UPDATED_AT],
      HLAS_CONSTANTS.FIELD.FEATURE.UPDATED_AT
    );

    validateParent(
      HLAS_CONSTANTS.ENTITY.EPIC,
      record[HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID]
    );
  });
}

function toFeatureModel_(record) {
  return {
    featureId: String(record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_ID] || ''),
    epicId: String(record[HLAS_CONSTANTS.FIELD.FEATURE.EPIC_ID] || ''),
    featureName: String(record[HLAS_CONSTANTS.FIELD.FEATURE.FEATURE_NAME] || ''),
    description: String(record[HLAS_CONSTANTS.FIELD.FEATURE.DESCRIPTION] || ''),
    status: String(record[HLAS_CONSTANTS.FIELD.FEATURE.STATUS] || ''),
    priority: String(record[HLAS_CONSTANTS.FIELD.FEATURE.PRIORITY] || ''),
    owner: String(record[HLAS_CONSTANTS.FIELD.FEATURE.OWNER] || ''),
    createdAt: formatFeatureDateTime_(
      record[HLAS_CONSTANTS.FIELD.FEATURE.CREATED_AT]
    ),
    updatedAt: formatFeatureDateTime_(
      record[HLAS_CONSTANTS.FIELD.FEATURE.UPDATED_AT]
    ),
  };
}

function formatFeatureDateTime_(value) {
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

function coreErrorFromResponse_(error) {
  const value = error || {};
  return new CoreError(
    value.code || 'INTERNAL_ERROR',
    value.message || '시스템 오류가 발생했습니다.',
    value.field || null,
    value.details || null
  );
}
