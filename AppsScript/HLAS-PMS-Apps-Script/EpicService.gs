/**
 * @fileoverview HLAS EPIC 서비스.
 *
 * 기존 Dialog가 호출하는 함수명과 반환 형태는 유지하고, 내부 데이터 처리는
 * Core API, SheetRepository, Validation, generateId()로 통일한다.
 */

/**
 * EPIC 생성 Dialog에서 사용할 PROJECT 선택 목록을 반환한다.
 *
 * @return {Array<{projectId:string, projectName:string}>} 프로젝트 목록
 */
function epicServiceGetProjectOptions_() {
  return CommonAPI.execute(function () {
    const fields = HLAS_CONSTANTS.FIELD.PROJECT;
    return SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.PROJECT).map(
      function (record) {
        return {
          projectId: String(record[fields.PROJECT_ID] || ''),
          projectName: String(record[fields.PROJECT_NAME] || ''),
        };
      }
    );
  }, { operation: 'getProjectOptions' });
}

/**
 * EPIC을 생성한다.
 *
 * @param {Object} formData EPIC 입력값
 * @return {Object} CommonAPI 표준 응답
 */
function epicServiceCreate_(formData) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.CREATE,
      HLAS_CONSTANTS.ENTITY.EPIC,
      ''
    );

    const data = formData || {};
    const fields = HLAS_CONSTANTS.FIELD.EPIC;
    const projectFields = HLAS_CONSTANTS.FIELD.PROJECT;
    const projectId = String(data.projectId || '').trim();
    const epicName = String(data.epicName || '').trim();
    const startDate = normalizeEpicDate_(data.startDate);
    const plannedEndDate = normalizeEpicDate_(data.plannedEndDate);

    Validation.required(projectId, fields.PROJECT_ID);
    Validation.required(epicName, fields.EPIC_NAME);
    Validation.validDate(startDate, fields.START_DATE);
    Validation.validDate(plannedEndDate, fields.PLANNED_END_DATE);
    Validation.dateRange(startDate, plannedEndDate);

    const project = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.PROJECT,
      projectId
    );
    if (!project || !project[projectFields.PROJECT_ID]) {
      throw new NotFoundError(
        '선택한 PROJECT를 찾을 수 없습니다: ' + projectId,
        fields.PROJECT_ID,
        { id: projectId }
      );
    }

    const lock = LockService.getDocumentLock();
    lock.waitLock(30000);
    try {
      const epicId = generateId(HLAS_CONSTANTS.ENTITY.EPIC);
      Validation.uniqueId(HLAS_CONSTANTS.SHEETS.EPIC, epicId);

      const now = new Date();
      const record = {};
      record[fields.EPIC_ID] = epicId;
      record[fields.PROJECT_ID] = projectId;
      record[fields.EPIC_NAME] = epicName;
      record[fields.DESCRIPTION] = String(data.description || '').trim();
      record[fields.STATUS] = HLAS_CONSTANTS.STATUS.IN_PROGRESS;
      record[fields.PRIORITY] =
        String(data.priority || '').trim() || HLAS_CONSTANTS.PRIORITY.NORMAL;
      record[fields.OWNER] = String(data.owner || '').trim();
      record[fields.START_DATE] = startDate;
      record[fields.PLANNED_END_DATE] = plannedEndDate;
      record[fields.CREATED_AT] = now;
      record[fields.UPDATED_AT] = now;

      const saved = SheetRepository.insert(HLAS_CONSTANTS.SHEETS.EPIC, record);

      CommonAPI.writeLog({
        changeType: HLAS_CONSTANTS.LOG_TYPE.EPIC_CREATE,
        message: 'EPIC 생성: ' + epicName,
        relatedId: epicId,
        result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
      });
      writeEntityAudit_(
        HLAS_CONSTANTS.AUDIT_ACTION.CREATE,
        HLAS_CONSTANTS.ENTITY.EPIC,
        epicId,
        HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
        'EPIC 생성: ' + epicName
      );

      return {
        epicId: epicId,
        record: saved,
      };
    } finally {
      lock.releaseLock();
    }
  }, { operation: 'createEpic' });
}

/**
 * 기존 EPIC 목록 Dialog와 호환되는 목록을 반환한다.
 *
 * @param {Object=} options 검색·필터·정렬 옵션
 * @return {Array<Object>} EPIC UI 모델 목록
 */
function epicServiceGetList_(options) {
  const response = epicServiceGetListResponse_(options);
  if (!response.ok) {
    throw coreErrorFromResponse_(response.error);
  }
  return response.data;
}

/**
 * EPIC 목록의 CommonAPI 표준 응답을 생성한다.
 *
 * @param {Object=} options 검색·필터·정렬 옵션
 * @return {Object} CommonAPI 표준 응답
 */
function epicServiceGetListResponse_(options) {
  return CommonAPI.execute(function () {
    const response = search(HLAS_CONSTANTS.ENTITY.EPIC, options);
    if (!response.ok) {
      throw coreErrorFromResponse_(response.error);
    }

    const fields = HLAS_CONSTANTS.FIELD.EPIC;
    const projectNames = {};
    const projects = epicServiceGetProjectOptions_();
    if (!projects.ok) {
      throw coreErrorFromResponse_(projects.error);
    }
    projects.data.forEach(function (project) {
      projectNames[project.projectId] = project.projectName;
    });

    return response.data.map(function (record) {
      const projectId = String(record[fields.PROJECT_ID] || '');
      return {
        epicId: String(record[fields.EPIC_ID] || ''),
        projectId: projectId,
        projectName: projectNames[projectId] || '',
        epicName: String(record[fields.EPIC_NAME] || ''),
        description: String(record[fields.DESCRIPTION] || ''),
        status: String(record[fields.STATUS] || ''),
        priority: String(record[fields.PRIORITY] || ''),
        owner: String(record[fields.OWNER] || ''),
        startDate: String(record[fields.START_DATE] || ''),
        plannedEndDate: String(record[fields.PLANNED_END_DATE] || ''),
        createdAt: String(record[fields.CREATED_AT] || ''),
        updatedAt: String(record[fields.UPDATED_AT] || ''),
      };
    });
  }, { operation: 'getEpicList' });
}

/**
 * EPIC을 삭제한다. 하위 FEATURE가 있으면 삭제하지 않는다.
 *
 * @param {string} id EPIC_ID
 * @return {Object} CommonAPI 표준 응답
 */
function epicServiceDelete_(id) {
  return CommonAPI.execute(function () {
    const fields = HLAS_CONSTANTS.FIELD.EPIC;
    Validation.required(id, fields.EPIC_ID);
    const epicId = String(id).trim();

    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.DELETE,
      HLAS_CONSTANTS.ENTITY.EPIC,
      epicId
    );

    const current = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.EPIC,
      epicId
    );
    if (!current) {
      throw new NotFoundError(
        '삭제할 EPIC을 찾을 수 없습니다: ' + epicId,
        fields.EPIC_ID,
        { id: epicId }
      );
    }

    assertDeleteAllowed_(canDeleteEpic(epicId), fields.EPIC_ID, epicId);
    SheetRepository.delete(HLAS_CONSTANTS.SHEETS.EPIC, epicId);

    CommonAPI.writeLog({
      changeType: HLAS_CONSTANTS.LOG_TYPE.EPIC_DELETE,
      message: 'EPIC 삭제: ' + current[fields.EPIC_NAME],
      relatedId: epicId,
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    writeEntityAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.DELETE,
      HLAS_CONSTANTS.ENTITY.EPIC,
      epicId,
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'EPIC 삭제'
    );

    return { epicId: epicId, deleted: true };
  }, { operation: 'deleteEpic' });
}

/**
 * HTML 날짜 입력을 Date 또는 빈 문자열로 정규화한다.
 *
 * @param {Date|string|undefined|null} value 날짜 입력
 * @return {Date|string} 정규화된 날짜
 */
function normalizeEpicDate_(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  Validation.validDate(value, 'date');
  if (value instanceof Date) {
    return value;
  }
  const parts = String(value).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}
