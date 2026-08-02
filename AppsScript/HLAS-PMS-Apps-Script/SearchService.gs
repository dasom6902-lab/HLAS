/**
 * 엔티티 데이터를 검색·필터·정렬한다.
 *
 * Repository는 엔티티별로 한 번만 읽으며 이후 처리는 메모리에서 수행한다.
 *
 * @param {string} entityType HLAS 엔티티 유형
 * @param {Object=} options 검색 옵션
 * @return {Object} Core API 표준 응답
 */
function search(entityType, options) {
  return CommonAPI.execute(function () {
    const type = String(entityType || '').trim().toUpperCase();
    const config = getSearchConfig_(type);
    const query = normalizeSearchOptions_(options);
    let rows = SheetRepository.findAll(config.sheetName);

    if (query.keyword) {
      rows = rows.filter(function (row) {
        return config.keywordFields.some(function (field) {
          return normalizeSearchText_(row[field]).indexOf(query.keyword) !== -1;
        });
      });
    }
    if (query.status && config.statusField) {
      rows = filterSearchRows_(rows, config.statusField, query.status);
    }
    if (query.priority && config.priorityField) {
      rows = filterSearchRows_(rows, config.priorityField, query.priority);
    }
    if (query.owner && config.ownerField) {
      rows = rows.filter(function (row) {
        return normalizeSearchText_(row[config.ownerField])
          .indexOf(normalizeSearchText_(query.owner)) !== -1;
      });
    }
    if (query.parentId && config.parentField) {
      rows = filterSearchRows_(rows, config.parentField, query.parentId);
    }

    const sortField = config.sortFields[query.sortBy] || config.sortFields.name;
    if (sortField) {
      rows.sort(function (left, right) {
        return compareSearchValues_(left[sortField], right[sortField], query.sortOrder);
      });
    }
    return rows;
  }, { operation: 'search', entityType: entityType });
}

function getSearchConfig_(entityType) {
  const C = HLAS_CONSTANTS;
  const configs = {};
  const project = C.FIELD.PROJECT;
  const epic = C.FIELD.EPIC;
  configs[C.ENTITY.PROJECT] = buildSearchConfig_(
    C.SHEETS.PROJECT,
    [project.PROJECT_ID, project.PROJECT_NAME, project.DESCRIPTION, project.OWNER],
    project.STATUS, '', project.OWNER, '', project.PROJECT_NAME
  );
  configs[C.ENTITY.EPIC] = buildSearchConfig_(
    C.SHEETS.EPIC,
    [epic.EPIC_ID, epic.EPIC_NAME, epic.DESCRIPTION, epic.OWNER],
    epic.STATUS, epic.PRIORITY, epic.OWNER, epic.PROJECT_ID, epic.EPIC_NAME
  );
  configs[C.ENTITY.FEATURE] = buildSearchConfig_(
    C.SHEETS.FEATURE,
    [C.FIELD.FEATURE.FEATURE_ID, C.FIELD.FEATURE.FEATURE_NAME, C.FIELD.FEATURE.DESCRIPTION, C.FIELD.FEATURE.OWNER],
    C.FIELD.FEATURE.STATUS, C.FIELD.FEATURE.PRIORITY, C.FIELD.FEATURE.OWNER, C.FIELD.FEATURE.EPIC_ID,
    C.FIELD.FEATURE.FEATURE_NAME
  );
  configs[C.ENTITY.FUNCTION] = buildSearchConfig_(
    C.SHEETS.FUNCTION,
    [C.FIELD.FUNCTION.FUNCTION_ID, C.FIELD.FUNCTION.FUNCTION_NAME,
      C.FIELD.FUNCTION.DESCRIPTION, C.FIELD.FUNCTION.OWNER],
    C.FIELD.FUNCTION.STATUS, '', C.FIELD.FUNCTION.OWNER,
    C.FIELD.FUNCTION.FEATURE_ID, C.FIELD.FUNCTION.FUNCTION_NAME
  );
  configs[C.ENTITY.TASK] = buildSearchConfig_(
    C.SHEETS.TASK,
    [C.FIELD.TASK.TASK_ID, C.FIELD.TASK.TASK_NAME,
      C.FIELD.TASK.DESCRIPTION, C.FIELD.TASK.OWNER],
    C.FIELD.TASK.STATUS, C.FIELD.TASK.PRIORITY, C.FIELD.TASK.OWNER,
    C.FIELD.TASK.FUNCTION_ID, C.FIELD.TASK.TASK_NAME
  );
  if (!configs[entityType]) {
    throw new ValidationError(
      '지원하지 않는 검색 엔티티입니다: ' + entityType,
      'entityType',
      { supportedTypes: Object.keys(configs) },
      'VALIDATION_ENTITY_TYPE'
    );
  }
  return configs[entityType];
}

function buildSearchConfig_(
  sheetName, keywordFields, statusField, priorityField,
  ownerField, parentField, nameField
) {
  return {
    sheetName: sheetName,
    keywordFields: keywordFields,
    statusField: statusField,
    priorityField: priorityField,
    ownerField: ownerField,
    parentField: parentField,
    sortFields: {
      name: nameField,
      createdAt: '생성일시',
      updatedAt: '수정일시',
      status: statusField,
      priority: priorityField,
    },
  };
}

function normalizeSearchOptions_(options) {
  const input = options || {};
  const order = String(input.sortOrder || HLAS_CONSTANTS.SEARCH.ASC).toLowerCase();
  if (HLAS_CONSTANTS.SEARCH.SORT_ORDERS.indexOf(order) === -1) {
    throw new ValidationError('정렬 방향은 asc 또는 desc여야 합니다.', 'sortOrder');
  }
  return {
    keyword: normalizeSearchText_(input.keyword),
    status: String(input.status || '').trim(),
    priority: String(input.priority || '').trim(),
    owner: String(input.owner || '').trim(),
    parentId: String(input.parentId || '').trim(),
    sortBy: String(input.sortBy || 'name').trim(),
    sortOrder: order,
  };
}

function filterSearchRows_(rows, field, expected) {
  return rows.filter(function (row) {
    return String(row[field] || '').trim() === String(expected).trim();
  });
}

function normalizeSearchText_(value) {
  return String(value === undefined || value === null ? '' : value)
    .trim().toLowerCase();
}

function compareSearchValues_(left, right, order) {
  const leftTime = left instanceof Date ? left.getTime() : NaN;
  const rightTime = right instanceof Date ? right.getTime() : NaN;
  let result;
  if (!isNaN(leftTime) && !isNaN(rightTime)) {
    result = leftTime - rightTime;
  } else {
    result = String(left === undefined ? '' : left)
      .localeCompare(String(right === undefined ? '' : right), 'ko');
  }
  return order === HLAS_CONSTANTS.SEARCH.DESC ? -result : result;
}
