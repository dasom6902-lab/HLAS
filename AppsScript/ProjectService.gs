/**
 * @fileoverview HLAS PROJECT 서비스.
 *
 * 외부 HTML에서 사용하는 createProjectRecord(), getProjectList(),
 * deleteProject() 함수명은 유지한다. 데이터 접근은 SheetRepository,
 * 검증은 Validation, ID는 generateId(), 로그는 CommonAPI를 사용한다.
 */

/**
 * PROJECT를 생성한다.
 *
 * @param {Object} formData 프로젝트 입력값
 * @return {Object} CommonAPI 표준 응답
 */
function projectServiceCreate_(formData) {
  return CommonAPI.execute(function () {
    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.CREATE,
      HLAS_CONSTANTS.ENTITY.PROJECT,
      ''
    );

    const data = formData || {};
    const fields = HLAS_CONSTANTS.FIELD.PROJECT;
    const projectName = String(data.projectName || '').trim();
    const startDate = normalizeProjectDate_(data.startDate);
    const plannedEndDate = normalizeProjectDate_(data.plannedEndDate);

    Validation.required(projectName, fields.PROJECT_NAME);
    Validation.validDate(startDate, fields.START_DATE);
    Validation.validDate(plannedEndDate, fields.PLANNED_END_DATE);
    Validation.dateRange(startDate, plannedEndDate);

    const lock = LockService.getDocumentLock();
    lock.waitLock(30000);
    try {
      const projectId = generateId(HLAS_CONSTANTS.ENTITY.PROJECT);
      Validation.uniqueId(HLAS_CONSTANTS.SHEETS.PROJECT, projectId);

      const now = new Date();
      const record = {};
      record[fields.PROJECT_ID] = projectId;
      record[fields.PROJECT_NAME] = projectName;
      record[fields.DESCRIPTION] = String(data.description || '').trim();
      record[fields.STATUS] = HLAS_CONSTANTS.STATUS.IN_PROGRESS;
      record[fields.CURRENT_VERSION] = '';
      record[fields.OWNER] = String(data.owner || '').trim();
      record[fields.START_DATE] = startDate;
      record[fields.PLANNED_END_DATE] = plannedEndDate;
      record[fields.CREATED_AT] = now;
      record[fields.UPDATED_AT] = now;

      const saved = SheetRepository.insert(
        HLAS_CONSTANTS.SHEETS.PROJECT,
        record
      );

      CommonAPI.writeLog({
        changeType: HLAS_CONSTANTS.LOG_TYPE.PROJECT_CREATE,
        message: 'PROJECT 생성: ' + projectName,
        relatedId: projectId,
        result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
      });
      writeEntityAudit_(
        HLAS_CONSTANTS.AUDIT_ACTION.CREATE,
        HLAS_CONSTANTS.ENTITY.PROJECT,
        projectId,
        HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
        'PROJECT 생성: ' + projectName
      );

      return {
        projectId: projectId,
        record: saved,
      };
    } finally {
      lock.releaseLock();
    }
  }, { operation: 'createProject' });
}

/**
 * PROJECT 목록을 공통 검색 엔진으로 조회한다.
 *
 * @param {Object=} options 검색·필터·정렬 옵션
 * @return {Object} CommonAPI 표준 응답
 */
function projectServiceGetList_(options) {
  return CommonAPI.execute(function () {
    const response = search(HLAS_CONSTANTS.ENTITY.PROJECT, options);
    if (!response.ok) {
      throw coreErrorFromResponse_(response.error);
    }

    const fields = HLAS_CONSTANTS.FIELD.PROJECT;
    return response.data.map(function (record) {
      return {
        projectId: String(record[fields.PROJECT_ID] || ''),
        projectName: String(record[fields.PROJECT_NAME] || ''),
        description: String(record[fields.DESCRIPTION] || ''),
        status: String(record[fields.STATUS] || ''),
        owner: String(record[fields.OWNER] || ''),
        createdAt: String(record[fields.CREATED_AT] || ''),
        updatedAt: String(record[fields.UPDATED_AT] || ''),
      };
    });
  }, { operation: 'getProjectList' });
}

/**
 * PROJECT를 삭제한다. 하위 EPIC이 있으면 삭제하지 않는다.
 *
 * @param {string} id PROJECT_ID
 * @return {Object} CommonAPI 표준 응답
 */
function projectServiceDelete_(id) {
  return CommonAPI.execute(function () {
    const fields = HLAS_CONSTANTS.FIELD.PROJECT;
    Validation.required(id, fields.PROJECT_ID);
    const projectId = String(id).trim();

    assertPermission_(
      HLAS_CONSTANTS.PERMISSION.DELETE,
      HLAS_CONSTANTS.ENTITY.PROJECT,
      projectId
    );

    const current = SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.PROJECT,
      projectId
    );
    if (!current) {
      throw new NotFoundError(
        '삭제할 PROJECT를 찾을 수 없습니다: ' + projectId,
        fields.PROJECT_ID,
        { id: projectId }
      );
    }

    assertDeleteAllowed_(
      canDeleteProject(projectId),
      fields.PROJECT_ID,
      projectId
    );
    SheetRepository.delete(HLAS_CONSTANTS.SHEETS.PROJECT, projectId);

    CommonAPI.writeLog({
      changeType: HLAS_CONSTANTS.LOG_TYPE.PROJECT_DELETE,
      message: 'PROJECT 삭제: ' + current[fields.PROJECT_NAME],
      relatedId: projectId,
      result: HLAS_CONSTANTS.LOG_RESULT.SUCCESS,
    });
    writeEntityAudit_(
      HLAS_CONSTANTS.AUDIT_ACTION.DELETE,
      HLAS_CONSTANTS.ENTITY.PROJECT,
      projectId,
      HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      'PROJECT 삭제'
    );

    return { projectId: projectId, deleted: true };
  }, { operation: 'deleteProject' });
}

/**
 * HTML 날짜 입력을 Date 또는 빈 문자열로 정규화한다.
 *
 * @param {Date|string|undefined|null} value 날짜 입력
 * @return {Date|string} 정규화된 날짜
 */
function normalizeProjectDate_(value) {
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
