/**
 * @fileoverview TASK-0027 Data Migration Engine 자동 테스트.
 */

/**
 * Preview, Validation, Duplicate, Execute, Rollback, Log를 검증한다.
 *
 * @return {{passed:boolean,results:Array<Object>}} 테스트 결과
 */
function runMigrationTests() {
  const results = [];
  const suffix = Utilities.getUuid();
  const productId = 'MIG-' + suffix;
  let migrationId = '';
  initializePMS();
  const request = {
    entity: HLAS_CONSTANTS.MIGRATION_ENTITY.PRODUCT,
    sourceFile: 'TASK-0027-TEST.csv',
    source: {
      format: 'CSV',
      csv: 'legacy_code,legacy_name\n' + productId + ',Migration Test Product',
    },
    columnMapping: {
      legacy_code: 'ProductID',
      legacy_name: 'ProductName',
    },
    executedBy: 'TASK-0027-TEST',
  };
  try {
    const preview = previewMigration(request);
    assertMigrationTest_(
      preview.ok &&
      preview.data.valid &&
      preview.data.newRows === 1 &&
      preview.data.totalRows === 1,
      'Preview Test'
    );
    results.push(passMigrationTest_('Preview Test'));

    const validation = validateMigration(request);
    assertMigrationTest_(
      validation.ok &&
      validation.data.valid &&
      validation.data.errors.length === 0,
      'Validation Test'
    );
    results.push(passMigrationTest_('Validation Test'));

    const duplicateRequest = Object.assign({}, request, {
      source: {
        format: 'CSV',
        csv: [
          'ProductID,ProductName',
          productId + ',Duplicate 1',
          productId + ',Duplicate 2',
        ].join('\n'),
      },
      columnMapping: {},
    });
    const duplicate = previewMigration(duplicateRequest);
    assertMigrationTest_(
      duplicate.ok &&
      !duplicate.data.valid &&
      duplicate.data.errors.some(function (error) {
        return error.code === 'IMPORT_DUPLICATE_KEY';
      }),
      'Duplicate Test'
    );
    results.push(passMigrationTest_('Duplicate Test'));

    const executed = executeMigration(request);
    assertMigrationTest_(
      executed.ok &&
      executed.data.status === HLAS_CONSTANTS.MIGRATION_STATUS.EXECUTED &&
      executed.data.successRows === 1 &&
      executed.data.rollbackAvailable,
      'Batch Import Test'
    );
    migrationId = executed.data.migrationId;
    results.push(passMigrationTest_('Batch Import Test'));

    const stored = SheetRepository.findById(
      '26_PRODUCT_IMPORT_STAGING',
      productId
    );
    assertMigrationTest_(
      stored && stored.ProductName === 'Migration Test Product',
      'Imported Record Test'
    );

    const log = getMigrationLog(migrationId);
    assertMigrationTest_(
      log.ok &&
      log.data &&
      log.data[HLAS_CONSTANTS.MIGRATION_FIELD.TOTAL_ROWS] === 1 &&
      log.data[HLAS_CONSTANTS.MIGRATION_FIELD.SUCCESS_ROWS] === 1,
      'Migration Log Test'
    );
    results.push(passMigrationTest_('Migration Log Test'));

    const supplement = runSupplyHistory2026Test();
    assertMigrationTest_(
      supplement.passed,
      '2026 Supply Supplement Test'
    );
    results.push(passMigrationTest_('2026 Supply Supplement Test'));

    const rolledBack = rollbackMigration(migrationId);
    assertMigrationTest_(
      rolledBack.ok &&
      rolledBack.data.status ===
        HLAS_CONSTANTS.MIGRATION_STATUS.ROLLED_BACK &&
      !SheetRepository.findById('26_PRODUCT_IMPORT_STAGING', productId),
      'Rollback Test'
    );
    results.push(passMigrationTest_('Rollback Test'));

    const regression = runAgreementTests();
    assertMigrationTest_(regression.passed, 'TASK-0021~0026 Regression Test');
    results.push(passMigrationTest_('Regression Test'));

    const output = { passed: true, results: results };
    console.info('[TASK-0027] ' + JSON.stringify(output));
    return output;
  } finally {
    if (SheetRepository.findById('26_PRODUCT_IMPORT_STAGING', productId)) {
      SheetRepository.delete('26_PRODUCT_IMPORT_STAGING', productId);
    }
    if (migrationId &&
        SheetRepository.findById(PMS_CONFIG.MIGRATION_TABLES.LOG, migrationId)) {
      SheetRepository.delete(PMS_CONFIG.MIGRATION_TABLES.LOG, migrationId);
    }
  }
}

function runSupplyHistory2026Test() {
  const suffix = String(new Date().getTime());
  const serial = '20260701' + suffix;
  const existingId = serial + '-000001234-2-2000';
  const receivingSheet = PMS_CONFIG.RECEIVING_TABLES.MASTER;
  const existing = {
    ReceivingID: existingId,
    ReceivingDate: new Date('2026-07-01T00:00:00+09:00'),
    ProducerID: '000001',
    ProductID: '000001234',
    ProductName: '기존 운용본 물품',
    CenterCode: 'R01',
    CenterName: '',
    Quantity: 2,
    Unit: 'EA',
    UnitPrice: 1000,
    Amount: 2000,
    ReceivingType: HLAS_CONSTANTS.RECEIVING_TYPE.RECEIVING,
    ReturnQuantity: 0,
    ReturnAmount: 0,
    Status: HLAS_CONSTANTS.RECEIVING_STATUS.CONFIRMED,
    Remark: 'TASK-0027A 기존 운용본',
  };
  let migrationId = '';
  SheetRepository.insert(receivingSheet, existing);
  const rows = [
    {
      '공급일련번호': serial,
      '조합원번호': '000001',
      '조합원명': '테스트 생산자',
      '물품코드': '000001234',
      '물품명': '기존 운용본 물품',
      '결과수량': 2,
      '결과금액': 2000,
      '배송코드': 'R01',
    },
    {
      '공급일련번호': serial,
      '조합원번호': '000001',
      '조합원명': '테스트 생산자',
      '물품코드': '000005678',
      '물품명': '보완 물품',
      '결과수량': 3,
      '결과금액': 4500,
      '배송코드': 'R01',
    },
  ];
  rows.push(Object.assign({}, rows[1]));
  const request = {
    entity: HLAS_CONSTANTS.MIGRATION_ENTITY.RECEIVING,
    sourceProfile: HLAS_CONSTANTS.MIGRATION_SOURCE.SUPPLY_HISTORY_2026,
    sourceFile: '260701.xlsx',
    source: { format: 'XLSX', records: rows },
    executedBy: 'TASK-0027A-TEST',
  };
  try {
    const preview = previewMigration(request);
    assertMigrationTest_(
      preview.ok &&
      preview.data.operatingRows === 1 &&
      preview.data.supplementRows === 1 &&
      preview.data.duplicateRows === 1 &&
      preview.data.finalImportRows === 1,
      'Supplement Preview'
    );
    const executed = executeMigration(request);
    assertMigrationTest_(
      executed.ok &&
      executed.data.created === 1 &&
      executed.data.updated === 0,
      'Supplement Execute'
    );
    migrationId = executed.data.migrationId;
    const log = getMigrationLog(migrationId).data;
    assertMigrationTest_(
      log[HLAS_CONSTANTS.MIGRATION_FIELD.SUPPLEMENT_SOURCE] ===
        HLAS_CONSTANTS.MIGRATION_SOURCE.SUPPLY_HISTORY_2026 &&
      log[HLAS_CONSTANTS.MIGRATION_FIELD.APPLIED_ROWS] === 1 &&
      log[HLAS_CONSTANTS.MIGRATION_FIELD.SKIPPED_ROWS] === 2 &&
      log[HLAS_CONSTANTS.MIGRATION_FIELD.DUPLICATE_ROWS] === 1,
      'Supplement Migration Log'
    );
    const unchanged = SheetRepository.findById(receivingSheet, existingId);
    assertMigrationTest_(
      unchanged && unchanged.ProductName === '기존 운용본 물품',
      'Operating Source Protection'
    );
    const rollback = rollbackMigration(migrationId);
    assertMigrationTest_(
      rollback.ok &&
      rollback.data.status ===
        HLAS_CONSTANTS.MIGRATION_STATUS.ROLLED_BACK,
      'Supplement Rollback'
    );
    return { passed: true };
  } finally {
    if (SheetRepository.findById(receivingSheet, existingId)) {
      SheetRepository.delete(receivingSheet, existingId);
    }
    if (migrationId &&
        SheetRepository.findById(PMS_CONFIG.MIGRATION_TABLES.LOG, migrationId)) {
      SheetRepository.delete(PMS_CONFIG.MIGRATION_TABLES.LOG, migrationId);
    }
  }
}

function passMigrationTest_(name) {
  return { name: name, result: 'PASS' };
}

function assertMigrationTest_(condition, message) {
  if (!condition) {
    throw new SystemError(
      '[TASK-0027] ' + message + ' 실패',
      { test: message },
      'MIGRATION_TEST_FAILED'
    );
  }
}
