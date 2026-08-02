/**
 * @fileoverview TASK-0025A Core Framework 자동 테스트.
 */

/**
 * Import, Audit, DataType, Cache, Index 및 전체 회귀를 검사한다.
 *
 * @return {{passed:boolean,results:Array<Object>,performance:Object}} 결과
 */
function runFrameworkTests() {
  const results = [];
  const productId = '000' + String(Date.now()).slice(-6);
  let rollbackToken = '';
  let auditId = '';

  try {
    const normalizedProduct = DataTypeManager.normalizeProductID(10101265);
    assertFrameworkTest_(
      normalizedProduct === '010101265' &&
        DataTypeManager.normalizeProducerID('  P-001  ') === 'P-001' &&
        DataTypeManager.normalizeBarcode('0012345') === '0012345',
      'DataType Test'
    );
    results.push(passFrameworkTest_('DataType Test'));

    const created = AuditManager.initializeAudit(
      { ProductID: productId },
      'framework@test'
    );
    const deleted = AuditManager.softDelete(
      created,
      'framework@test',
      '테스트'
    );
    const restored = AuditManager.restore(deleted, 'framework@test');
    assertFrameworkTest_(
      created.IsActive === true &&
        deleted.IsActive === false &&
        deleted.DeleteReason === '테스트' &&
        restored.IsActive === true &&
        restored.DeletedAt === '',
      'Audit Manager Test'
    );
    const auditResponse = writeAudit({
      action: HLAS_CONSTANTS.AUDIT_ACTION.CREATE,
      entity: 'FRAMEWORK',
      entityId: productId,
      result: HLAS_CONSTANTS.AUDIT_RESULT.SUCCESS,
      message: 'TASK-0025A Audit Test',
    });
    assertFrameworkTest_(auditResponse.ok, 'Audit Service Test');
    auditId = auditResponse.data.auditId;
    results.push(passFrameworkTest_('Audit Test'));

    CacheManager.put('TEST:FRAMEWORK', { value: productId }, 60);
    const cached = CacheManager.get('TEST:FRAMEWORK');
    assertFrameworkTest_(
      cached && cached.value === productId,
      'Cache Test'
    );
    CacheManager.clearCache('TEST:FRAMEWORK');
    results.push(passFrameworkTest_('Cache Test'));

    const indexRecords = [];
    for (let index = 0; index < 2000; index += 1) {
      indexRecords.push({
        ProducerID: 'IDX-' + String(index).padStart(5, '0'),
        ProducerName: '생산자 ' + index,
      });
    }
    const indexStart = Date.now();
    const index = IndexManager.createIndex(
      HLAS_CONSTANTS.INDEX_TYPE.PRODUCER,
      indexRecords
    );
    let indexedResult = null;
    for (let search = 0; search < 500; search += 1) {
      indexedResult = index['IDX-01999'];
    }
    const indexElapsed = Date.now() - indexStart;
    const linearStart = Date.now();
    let linearResult = null;
    for (let repeat = 0; repeat < 500; repeat += 1) {
      linearResult = indexRecords.find(function (record) {
        return record.ProducerID === 'IDX-01999';
      });
    }
    const linearElapsed = Date.now() - linearStart;
    assertFrameworkTest_(
      indexedResult && linearResult &&
        indexedResult.ProducerID === linearResult.ProducerID,
      'Index Test'
    );
    IndexManager.clearCache(HLAS_CONSTANTS.INDEX_TYPE.PRODUCER);
    results.push(passFrameworkTest_('Index Test'));

    const csv = [
      'ERPCode,Name,Barcode',
      productId + ',Framework Product,000123456789',
    ].join('\n');
    const request = {
      entity: 'PRODUCT',
      source: { format: 'CSV', csv: csv },
      columnMapping: {
        ERPCode: 'ProductID',
        Name: 'ProductName',
        Barcode: 'Barcode',
      },
      user: 'framework@test',
    };
    const importStart = Date.now();
    const preview = previewFrameworkImport(request);
    assertFrameworkTest_(
      preview.ok &&
        preview.data.valid &&
        preview.data.created === 1 &&
        preview.data.errors.length === 0,
      'Import Preview Test'
    );
    const executed = executeFrameworkImport(request);
    assertFrameworkTest_(
      executed.ok && executed.data.created === 1,
      'Import Execute Test'
    );
    rollbackToken = executed.data.rollbackToken;
    const rolledBack = rollbackFrameworkImport(rollbackToken);
    assertFrameworkTest_(
      rolledBack.ok &&
        rolledBack.data.status ===
          HLAS_CONSTANTS.IMPORT_STATUS.ROLLED_BACK,
      'Import Rollback Test'
    );
    rollbackToken = '';
    const importElapsed = Date.now() - importStart;
    results.push(passFrameworkTest_('Import Test'));

    assertFrameworkTest_(
      runReceivingTests().passed,
      'Backward Compatibility / Regression Test'
    );
    results.push(
      passFrameworkTest_('Backward Compatibility / Regression Test')
    );

    const finalResult = {
      passed: true,
      results: results,
      performance: {
        recordCount: indexRecords.length,
        lookupIterations: 500,
        indexElapsedMs: indexElapsed,
        linearElapsedMs: linearElapsed,
        importElapsedMs: importElapsed,
      },
    };
    console.log('[TASK-0025A] ' + JSON.stringify(finalResult));
    return finalResult;
  } finally {
    CacheManager.clearCache('TEST:FRAMEWORK');
    IndexManager.clearCache(HLAS_CONSTANTS.INDEX_TYPE.PRODUCER);
    if (rollbackToken) {
      try {
        ImportRepository.rollback(rollbackToken);
      } catch (ignored) {
        // 테스트 정리 실패는 원래 테스트 결과를 덮어쓰지 않는다.
      }
    }
    const staging = SheetRepository.findAll('26_PRODUCT_IMPORT_STAGING');
    staging.filter(function (record) {
      return DataTypeManager.normalizeProductID(record.ProductID) ===
        DataTypeManager.normalizeProductID(productId);
    }).forEach(function (record) {
      SheetRepository.delete(
        '26_PRODUCT_IMPORT_STAGING',
        String(record.ProductID)
      );
    });
    if (auditId && SheetRepository.findById(
      HLAS_CONSTANTS.SHEETS.AUDIT,
      auditId
    )) {
      SheetRepository.delete(HLAS_CONSTANTS.SHEETS.AUDIT, auditId);
    }
  }
}

function passFrameworkTest_(name) {
  return { name: name, result: 'PASS' };
}

function assertFrameworkTest_(condition, message) {
  if (!condition) {
    throw new SystemError(
      '[TASK-0025A] ' + message + ' 실패',
      { test: message },
      'FRAMEWORK_TEST_FAILED'
    );
  }
}
