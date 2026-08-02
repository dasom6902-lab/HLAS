/**
 * @fileoverview TASK-0025 Receiving Transaction 자동 테스트.
 */

/**
 * Receiving Repository, Service, API, Validator와 기존 TASK 회귀를 검사한다.
 *
 * @return {{passed:boolean,results:Array<Object>}} 테스트 결과
 */
function runReceivingTests() {
  const results = [];
  const producerField = HLAS_CONSTANTS.FIELD.PRODUCER;
  const field = HLAS_CONSTANTS.FIELD.RECEIVING;
  const masterField = HLAS_CONSTANTS.FIELD.MASTER_DATA;
  const producerId = 'TEST-' + Utilities.getUuid();
  const receivingId = 'RCV-' + Utilities.getUuid();
  const returnId = 'RTN-' + Utilities.getUuid();
  const productSnapshot = MasterDataRepository.readMasterData();
  const product = productSnapshot.records.find(function (record) {
    return String(record[masterField.ITEM_CODE] || '').trim() !== '';
  });
  assertReceivingTest_(Boolean(product), 'Product Master Fixture');
  const productId = product[masterField.ITEM_CODE];
  const productName = product[masterField.ITEM_NAME];

  try {
    const producer = {};
    producer[producerField.PRODUCER_ID] = producerId;
    producer[producerField.PRODUCER_NAME] = '입고 테스트 생산자';
    producer[producerField.REGION] = '테스트 지역';
    producer[producerField.COMMUNITY] = '테스트 공동체';
    producer[producerField.TRADE_STATUS] =
      HLAS_CONSTANTS.SUPPLY_STATUS.ACTIVE;
    producer[producerField.MEMBERSHIP_STATUS] =
      HLAS_CONSTANTS.MEMBERSHIP_TYPE.MEMBER;
    const producerResponse = saveProducer(producer);
    assertReceivingTest_(producerResponse.ok, 'Producer Fixture');

    const receiving = createReceivingFixture_(
      receivingId,
      producerId,
      productId,
      productName
    );
    const saved = saveReceiving(receiving);
    assertReceivingTest_(
      saved.ok &&
        saved.data[field.RECEIVING_ID] === receivingId,
      'Repository Test'
    );
    assertReceivingTest_(
      Number(saved.data[field.AMOUNT]) === 2000 &&
        saved.data[field.PRODUCER_ID] === producerId &&
        String(saved.data[field.PRODUCT_ID]) === String(productId),
      'Repository Field Mapping Test'
    );
    results.push(passReceivingTest_('Repository Test'));

    const updated = updateReceiving(receivingId, {
      Quantity: 25,
      Memo: '수정 완료',
    });
    assertReceivingTest_(
      updated.ok &&
        updated.data[field.AMOUNT] === 2500 &&
        updated.data[field.MEMO] === '수정 완료',
      'Service Test'
    );
    results.push(passReceivingTest_('Service Test'));

    const search = searchReceiving({
      producerId: producerId,
      productId: productId,
      keyword: receivingId,
    });
    assertReceivingTest_(
      search.ok && search.data.length === 1,
      'API Test'
    );
    results.push(passReceivingTest_('API Test'));

    const duplicate = saveReceiving(receiving);
    assertReceivingTest_(
      !duplicate.ok && duplicate.error.code === 'RECEIVING_DUPLICATE',
      'Validator Duplicate Test'
    );
    const immutable = updateReceiving(receivingId, {
      ProducerID: 'DIFFERENT-PRODUCER',
    });
    assertReceivingTest_(
      !immutable.ok &&
        immutable.error.code === 'RECEIVING_IMMUTABLE_FK',
      'Validator Immutable FK Test'
    );
    results.push(passReceivingTest_('Validator Test'));

    assertReceivingTest_(
      ReceivingService.calculateReceivingAmount(20, 100) === 2000,
      'Receiving Amount Test'
    );
    results.push(passReceivingTest_('Receiving Amount Test'));

    const returnData = createReceivingFixture_(
      returnId,
      producerId,
      productId,
      productName
    );
    returnData[field.RECEIVING_TYPE] =
      HLAS_CONSTANTS.RECEIVING_TYPE.RETURN;
    returnData[field.QUANTITY] = 5;
    returnData[field.RETURN_QUANTITY] = 2;
    const returnResponse = saveReceiving(returnData);
    assertReceivingTest_(
      returnResponse.ok &&
        returnResponse.data[field.RETURN_AMOUNT] === 200,
      'Return Test'
    );

    const producerSummary = getReceivingSummary({
      producerId: producerId,
    });
    assertReceivingTest_(
      producerSummary.ok &&
        producerSummary.data.count === 2 &&
        producerSummary.data.netQuantity === 28 &&
        producerSummary.data.netAmount === 2800,
      'Producer Summary Test'
    );
    results.push(passReceivingTest_('Producer Summary Test'));

    const productSummary = getReceivingSummary({ productId: productId });
    assertReceivingTest_(
      productSummary.ok &&
        productSummary.data.count >= 2 &&
        productSummary.data.netAmount >= 2800,
      'Product Summary Test'
    );
    results.push(passReceivingTest_('Product Summary Test'));

    assertReceivingTest_(
      runProducerTests().passed,
      'Regression Test'
    );
    results.push(passReceivingTest_('Regression Test'));
    return { passed: true, results: results };
  } finally {
    cleanupReceivingTest_(returnId);
    cleanupReceivingTest_(receivingId);
    if (SheetRepository.findById(
      PMS_CONFIG.PRODUCER_TABLES.EXTENSION,
      producerId
    )) {
      SheetRepository.delete(
        PMS_CONFIG.PRODUCER_TABLES.EXTENSION,
        producerId
      );
    }
    if (SheetRepository.findById(
      PMS_CONFIG.PRODUCER_TABLES.MASTER,
      producerId
    )) {
      SheetRepository.delete(PMS_CONFIG.PRODUCER_TABLES.MASTER, producerId);
    }
  }
}

function createReceivingFixture_(
  receivingId,
  producerId,
  productId,
  productName
) {
  const field = HLAS_CONSTANTS.FIELD.RECEIVING;
  const record = {};
  record[field.RECEIVING_ID] = receivingId;
  record[field.RECEIVING_DATE] = '2026-07-29';
  record[field.PRODUCER_ID] = producerId;
  record[field.PRODUCT_ID] = productId;
  record[field.PRODUCT_NAME] = productName;
  record[field.CENTER_CODE] = 'BUSAN-01';
  record[field.CENTER_NAME] = '부산 물류센터';
  record[field.QUANTITY] = 20;
  record[field.UNIT] = 'EA';
  record[field.UNIT_PRICE] = 100;
  record[field.RECEIVING_TYPE] =
    HLAS_CONSTANTS.RECEIVING_TYPE.RECEIVING;
  record[field.STATUS] = HLAS_CONSTANTS.RECEIVING_STATUS.REGISTERED;
  return record;
}

function cleanupReceivingTest_(receivingId) {
  if (SheetRepository.findById(
    PMS_CONFIG.RECEIVING_TABLES.EXTENSION,
    receivingId
  )) {
    SheetRepository.delete(
      PMS_CONFIG.RECEIVING_TABLES.EXTENSION,
      receivingId
    );
  }
  if (SheetRepository.findById(
    PMS_CONFIG.RECEIVING_TABLES.MASTER,
    receivingId
  )) {
    SheetRepository.delete(PMS_CONFIG.RECEIVING_TABLES.MASTER, receivingId);
  }
}

function passReceivingTest_(name) {
  return { name: name, result: 'PASS' };
}

function assertReceivingTest_(condition, message) {
  if (!condition) {
    throw new SystemError(
      '[TASK-0025] ' + message + ' 실패',
      { test: message },
      'RECEIVING_TEST_FAILED'
    );
  }
}
