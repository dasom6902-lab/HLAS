/**
 * @fileoverview 물류 Master Data 구조·품질·참조 관계 점검 Service.
 *
 * TASK-0021은 진단 전용이며 기초시트나 기존 업무 결과를 변경하지 않는다.
 */

const MasterDataService = Object.freeze({
  /**
   * Master Data 구조와 논리 필드 매핑을 조회한다.
   *
   * @return {Object} CommonAPI 표준 응답
   */
  getStructure: function () {
    return CommonAPI.execute(function () {
      const snapshot = MasterDataRepository.readMasterData();
      return buildMasterStructure_(snapshot);
    }, { operation: 'MasterDataService.getStructure' });
  },

  /**
   * 필수값, 중복 코드, 저장상태, 집품순서, 참조 무결성을 검증한다.
   *
   * @return {Object} CommonAPI 표준 응답
   */
  validate: function () {
    return CommonAPI.execute(function () {
      const masterSnapshot = MasterDataRepository.readMasterData();
      const orderSnapshot = MasterDataRepository.readOrderData();
      return validateMasterSnapshots_(masterSnapshot, orderSnapshot);
    }, { operation: 'MasterDataService.validate' });
  },

  /**
   * 주요 업무 영역의 Master Data 의존 관계를 반환한다.
   *
   * @return {Object} CommonAPI 표준 응답
   */
  getDependencies: function () {
    return CommonAPI.execute(function () {
      const sheetNames = MasterDataRepository.listSheetNames();
      return buildMasterDependencies_(sheetNames);
    }, { operation: 'MasterDataService.getDependencies' });
  },

  /**
   * 구조·검증·의존성 점검을 한 번에 수행한다.
   *
   * @return {Object} CommonAPI 표준 응답
   */
  review: function () {
    return CommonAPI.execute(function () {
      const masterSnapshot = MasterDataRepository.readMasterData();
      const orderSnapshot = MasterDataRepository.readOrderData();
      const sheetNames = MasterDataRepository.listSheetNames();
      const validation = validateMasterSnapshots_(
        masterSnapshot,
        orderSnapshot
      );

      return {
        reviewedAt: new Date().toISOString(),
        readOnly: true,
        structure: buildMasterStructure_(masterSnapshot),
        validation: validation,
        dependencies: buildMasterDependencies_(sheetNames),
      };
    }, { operation: 'MasterDataService.review' });
  },
});

function buildMasterStructure_(snapshot) {
  const fields = HLAS_CONSTANTS.FIELD.MASTER_DATA;
  const physicalHeaders = snapshot.headers.filter(function (header) {
    return Boolean(header);
  });
  const physicalHeaderSet = createMasterSet_(physicalHeaders);

  return {
    sheetName: snapshot.sheetName,
    headerRow: PMS_CONFIG.masterData.masterHeaderRow,
    firstDataRow: PMS_CONFIG.masterData.masterFirstDataRow,
    recordCount: snapshot.records.length,
    physicalHeaders: physicalHeaders,
    canonicalFields: [
      masterFieldDefinition_('ITEM_CODE', fields.ITEM_CODE, true, 'string', true),
      masterFieldDefinition_('ITEM_NAME', fields.ITEM_NAME, true, 'string', true),
      masterFieldDefinition_('PRICE', fields.PRICE, false, 'number', true),
      masterFieldDefinition_(
        'TEMPERATURE_TYPE',
        fields.TEMPERATURE_TYPE,
        true,
        'enum',
        true
      ),
      masterFieldDefinition_(
        'STORAGE_PICK_KEY',
        fields.STORAGE_PICK_KEY,
        true,
        'derived',
        true
      ),
      masterFieldDefinition_(
        'PRODUCER_OR_LOGISTICS_SOURCE',
        fields.PRODUCER_OR_LOGISTICS_SOURCE,
        true,
        'string',
        true
      ),
      masterFieldDefinition_(
        'PICKING_ORDER',
        fields.PICKING_ORDER,
        true,
        'number',
        true
      ),
      masterFieldDefinition_(
        'PRODUCER',
        fields.PRODUCER,
        false,
        'string',
        physicalHeaderSet[fields.PRODUCER] === true
      ),
      masterFieldDefinition_(
        'COURSE',
        fields.COURSE,
        false,
        'string',
        physicalHeaderSet[fields.COURSE] === true
      ),
      masterFieldDefinition_(
        'SUPPLY_TYPE',
        fields.SUPPLY_TYPE,
        false,
        'enum',
        physicalHeaderSet[fields.SUPPLY_TYPE] === true
      ),
      masterFieldDefinition_(
        'ACTIVE_YN',
        fields.ACTIVE_YN,
        false,
        'Y|N',
        physicalHeaderSet[fields.ACTIVE_YN] === true
      ),
    ],
  };
}

function masterFieldDefinition_(logicalName, physicalHeader, required, type, exists) {
  return {
    logicalName: logicalName,
    physicalHeader: physicalHeader,
    required: required,
    type: type,
    exists: exists,
  };
}

function validateMasterSnapshots_(masterSnapshot, orderSnapshot) {
  const fields = HLAS_CONSTANTS.FIELD.MASTER_DATA;
  const requiredHeaders = [
    fields.ITEM_CODE,
    fields.ITEM_NAME,
    fields.TEMPERATURE_TYPE,
    fields.STORAGE_PICK_KEY,
    fields.PRODUCER_OR_LOGISTICS_SOURCE,
    fields.PICKING_ORDER,
  ];
  const issues = [];

  requiredHeaders.forEach(function (header) {
    if (masterSnapshot.headers.indexOf(header) === -1) {
      addMasterIssue_(
        issues,
        'MASTER_HEADER_MISSING',
        HLAS_CONSTANTS.MASTER_DATA.SEVERITY.ERROR,
        null,
        header,
        '필수 Master Data 컬럼이 없습니다.'
      );
    }
  });

  const itemCodeRows = {};
  const storagePickRows = {};
  const masterByCode = {};
  const activeOrderCodes = {};
  const allowedStatuses = HLAS_CONSTANTS.MASTER_DATA.STORAGE_STATUSES;

  masterSnapshot.records.forEach(function (record, index) {
    const rowNumber = masterSnapshot.rowNumbers[index];
    const itemCode = normalizeMasterText_(record[fields.ITEM_CODE]);
    const itemName = normalizeMasterText_(record[fields.ITEM_NAME]);
    const storageStatus = normalizeMasterText_(
      record[fields.TEMPERATURE_TYPE]
    );
    const logisticsSource = normalizeMasterText_(
      record[fields.PRODUCER_OR_LOGISTICS_SOURCE]
    );
    const pickOrder = normalizeMasterNumber_(record[fields.PICKING_ORDER]);
    const storagePickKey = normalizeMasterText_(
      record[fields.STORAGE_PICK_KEY]
    );

    validateRequiredMasterValue_(
      issues,
      rowNumber,
      fields.ITEM_CODE,
      itemCode
    );
    validateRequiredMasterValue_(
      issues,
      rowNumber,
      fields.ITEM_NAME,
      itemName
    );
    validateRequiredMasterValue_(
      issues,
      rowNumber,
      fields.TEMPERATURE_TYPE,
      storageStatus
    );
    validateRequiredMasterValue_(
      issues,
      rowNumber,
      fields.PRODUCER_OR_LOGISTICS_SOURCE,
      logisticsSource
    );

    if (itemCode) {
      itemCodeRows[itemCode] = itemCodeRows[itemCode] || [];
      itemCodeRows[itemCode].push(rowNumber);
      masterByCode[itemCode] = record;
    }
    if (storagePickKey) {
      storagePickRows[storagePickKey] = storagePickRows[storagePickKey] || [];
      storagePickRows[storagePickKey].push(rowNumber);
    }
    if (storageStatus && allowedStatuses.indexOf(storageStatus) === -1) {
      addMasterIssue_(
        issues,
        'INVALID_TEMPERATURE_TYPE',
        HLAS_CONSTANTS.MASTER_DATA.SEVERITY.ERROR,
        rowNumber,
        fields.TEMPERATURE_TYPE,
        '허용되지 않은 저장상태입니다: ' + storageStatus
      );
    }
    if (pickOrder === null || pickOrder <= 0) {
      addMasterIssue_(
        issues,
        'INVALID_PICKING_ORDER',
        HLAS_CONSTANTS.MASTER_DATA.SEVERITY.ERROR,
        rowNumber,
        fields.PICKING_ORDER,
        '집품순서는 0보다 큰 숫자여야 합니다.'
      );
    } else if (storagePickKey !== storageStatus + String(pickOrder)) {
      addMasterIssue_(
        issues,
        'INVALID_STORAGE_PICK_KEY',
        HLAS_CONSTANTS.MASTER_DATA.SEVERITY.ERROR,
        rowNumber,
        fields.STORAGE_PICK_KEY,
        '저장상태+집품순서 값이 표준 조합과 일치하지 않습니다.'
      );
    }
  });

  addDuplicateMasterIssues_(
    issues,
    itemCodeRows,
    'DUPLICATE_ITEM_CODE',
    fields.ITEM_CODE
  );
  addDuplicateMasterIssues_(
    issues,
    storagePickRows,
    'DUPLICATE_STORAGE_PICK_KEY',
    fields.STORAGE_PICK_KEY
  );

  orderSnapshot.records.forEach(function (record, index) {
    const orderRow = orderSnapshot.rowNumbers[index];
    const itemCode = normalizeMasterText_(record[fields.ITEM_CODE]);
    if (!itemCode) {
      return;
    }
    activeOrderCodes[itemCode] = true;
    if (!masterByCode[itemCode]) {
      addMasterIssue_(
        issues,
        'INVALID_ITEM_REFERENCE',
        HLAS_CONSTANTS.MASTER_DATA.SEVERITY.ERROR,
        orderRow,
        fields.ITEM_CODE,
        '주문내역 물품코드가 기초시트에 없습니다: ' + itemCode
      );
      return;
    }

    const masterRecord = masterByCode[itemCode];
    compareMasterReference_(
      issues,
      orderRow,
      fields.ITEM_NAME,
      record[fields.ITEM_NAME],
      masterRecord[fields.ITEM_NAME]
    );
    compareMasterReference_(
      issues,
      orderRow,
      fields.TEMPERATURE_TYPE,
      record[fields.TEMPERATURE_TYPE],
      masterRecord[fields.TEMPERATURE_TYPE]
    );
  });

  const severityCounts = countMasterIssueSeverity_(issues);
  return {
    valid: severityCounts.ERROR === 0,
    masterRecordCount: masterSnapshot.records.length,
    orderRecordCount: orderSnapshot.records.length,
    activeOrderItemCount: Object.keys(activeOrderCodes).length,
    notReferencedByCurrentOrders:
      Object.keys(masterByCode).length - Object.keys(activeOrderCodes).length,
    issueCount: issues.length,
    severity: severityCounts,
    issues: issues,
  };
}

function buildMasterDependencies_(sheetNames) {
  const available = createMasterSet_(sheetNames);
  return [
    {
      area: '주문내역',
      physicalSheet: '주문내역',
      exists: available['주문내역'] === true,
      references: ['물품코드', '물품명', '저장상태', '집품순서'],
      rule: '물품코드로 기초시트를 참조하며 물품명·저장상태를 교차 검증한다.',
    },
    {
      area: '주문공급',
      physicalSheet: '총수량 / 31코스~36코스',
      exists: available['총수량'] === true,
      references: ['물품코드', '물품명', '저장상태', '집품순서', '코스'],
      rule: '기초 A:G와 주문내역 배송코드를 이용해 코스별 집계·정렬한다.',
    },
    {
      area: '매장공급',
      physicalSheet: null,
      exists: false,
      references: ['물품코드', '물품명', '저장상태', '공급구분'],
      rule: '별도 운용본 의존성은 후속 통합 점검 대상으로 유지한다.',
    },
    {
      area: '집품',
      physicalSheet: '총수량 / 코스 시트',
      exists: available['총수량'] === true,
      references: ['저장상태', '저장상태+집품순서', '집품순서'],
      rule: '저장상태 순위와 집품순서로 출력 순서를 결정한다.',
    },
    {
      area: '검수',
      physicalSheet: '검증관리',
      exists: available['검증관리'] === true,
      references: ['물품코드', '물품명', '저장상태'],
      rule: '검증 결과에서 잘못된 물품 참조와 기초 누락을 확인한다.',
    },
    {
      area: '출고',
      physicalSheet: '코스 시트',
      exists: ['31코스', '32코스', '33코스', '34코스', '35코스', '36코스']
        .every(function (name) {
          return available[name] === true;
        }),
      references: ['배송코드', '코스', '물품코드', '집품순서'],
      rule: '배송코드의 코스와 기초 집품순서에 따라 코스별 출고자료를 구성한다.',
    },
  ];
}

function validateRequiredMasterValue_(issues, rowNumber, field, value) {
  if (!value) {
    addMasterIssue_(
      issues,
      'MASTER_REQUIRED',
      HLAS_CONSTANTS.MASTER_DATA.SEVERITY.ERROR,
      rowNumber,
      field,
      '필수값이 비어 있습니다.'
    );
  }
}

function addDuplicateMasterIssues_(issues, index, code, field) {
  Object.keys(index).forEach(function (value) {
    if (index[value].length > 1) {
      addMasterIssue_(
        issues,
        code,
        HLAS_CONSTANTS.MASTER_DATA.SEVERITY.ERROR,
        index[value][0],
        field,
        '중복값입니다: ' + value + ' / 행 ' + index[value].join(', ')
      );
    }
  });
}

function compareMasterReference_(
  issues,
  rowNumber,
  field,
  actualValue,
  masterValue
) {
  const actual = normalizeMasterText_(actualValue);
  const expected = normalizeMasterText_(masterValue);
  if (actual && expected && actual !== expected) {
    addMasterIssue_(
      issues,
      'MASTER_REFERENCE_MISMATCH',
      HLAS_CONSTANTS.MASTER_DATA.SEVERITY.WARNING,
      rowNumber,
      field,
      '주문내역 값과 기초시트 값이 다릅니다.'
    );
  }
}

function addMasterIssue_(issues, code, severity, row, field, message) {
  issues.push({
    code: code,
    severity: severity,
    row: row,
    field: field,
    message: message,
  });
}

function countMasterIssueSeverity_(issues) {
  const counts = { ERROR: 0, WARNING: 0, INFO: 0 };
  issues.forEach(function (issue) {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
  });
  return counts;
}

function normalizeMasterText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function normalizeMasterNumber_(value) {
  const text = normalizeMasterText_(value).replace(/,/g, '');
  if (!text) {
    return null;
  }
  const numberValue = Number(text);
  return isFinite(numberValue) ? numberValue : null;
}

function createMasterSet_(values) {
  const set = {};
  values.forEach(function (value) {
    set[String(value)] = true;
  });
  return set;
}

