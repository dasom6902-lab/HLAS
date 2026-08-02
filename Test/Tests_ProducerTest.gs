/**
 * @fileoverview TASK-0024 Producer Master 자동 테스트.
 */

/**
 * Producer Repository, Service, API, Validator와 기존 TASK 회귀를 검사한다.
 *
 * @return {{passed:boolean,results:Array<Object>}} 테스트 결과
 */
function runProducerTests() {
  const results = [];
  const field = HLAS_CONSTANTS.FIELD.PRODUCER;
  const column = HLAS_CONSTANTS.COLUMN_NAME;
  const producerId = 'TEST-' + Utilities.getUuid();

  try {
    const producer = {};
    producer[field.PRODUCER_ID] = producerId;
    producer[field.PRODUCER_NAME] = '테스트 생산자';
    producer[field.REGION] = '테스트 지역';
    producer[field.COMMUNITY] = '테스트 공동체';
    producer[field.TRADE_STATUS] = HLAS_CONSTANTS.SUPPLY_STATUS.ACTIVE;
    producer[field.MEMBERSHIP_STATUS] =
      HLAS_CONSTANTS.MEMBERSHIP_TYPE.MEMBER;
    producer[field.ASSOCIATION_MEMBER] =
      HLAS_CONSTANTS.PRODUCER.BOOLEAN_TRUE;
    producer[field.FUND_ELIGIBLE] =
      HLAS_CONSTANTS.PRODUCER.BOOLEAN_TRUE;
    producer[field.SUPPORT_GRADE] = HLAS_CONSTANTS.SUPPORT_GRADE.A;

    const saved = saveProducer(producer);
    assertProducerTest_(saved.ok, 'Repository Test');
    results.push(passProducerTest_('Repository Test'));

    const inactive = ProducerService.deactivateProducer(producerId);
    const active = ProducerService.activateProducer(producerId);
    assertProducerTest_(
      inactive[field.IS_ACTIVE] === false &&
        active[field.IS_ACTIVE] === true,
      'Service Test'
    );
    results.push(passProducerTest_('Service Test'));

    const search = searchProducer({ keyword: producerId });
    assertProducerTest_(
      search.ok && search.data.length === 1,
      'API Test'
    );
    results.push(passProducerTest_('API Test'));

    const duplicate = saveProducer(producer);
    assertProducerTest_(
      !duplicate.ok && duplicate.error.code === 'PRODUCER_DUPLICATE',
      'Validator Test'
    );
    results.push(passProducerTest_('Validator Test'));

    const receivingOne = {};
    receivingOne[column.PRODUCER_ID] = producerId;
    receivingOne[column.QUANTITY] = 10;
    receivingOne[column.AMOUNT] = 100;
    receivingOne[column.RECEIVING_DATE] = '2026-01-01';
    const receivingTwo = {};
    receivingTwo[column.PRODUCER_ID] = producerId;
    receivingTwo[column.QUANTITY] = 20;
    receivingTwo[column.AMOUNT] = 200;
    receivingTwo[column.RECEIVING_DATE] = '2026-02-01';
    const statistics = ProducerService.calculateSupplyStatistics(
      producerId,
      [receivingOne, receivingTwo]
    );
    assertProducerTest_(
      statistics.count === 2 &&
        statistics.quantity === 30 &&
        statistics.amount === 300 &&
        statistics.lastReceivingDate === '2026-02-01',
      'Supply Statistics Test'
    );
    results.push(passProducerTest_('Supply Statistics Test'));

    assertProducerTest_(
      runMasterDataTests().passed &&
        runArchitectureTests().passed &&
        runTargetTests().passed,
      'Regression Test'
    );
    results.push(passProducerTest_('Regression Test'));

    return { passed: true, results: results };
  } finally {
    if (SheetRepository.findById(PMS_CONFIG.PRODUCER_TABLES.EXTENSION, producerId)) {
      SheetRepository.delete(PMS_CONFIG.PRODUCER_TABLES.EXTENSION, producerId);
    }
    if (SheetRepository.findById(PMS_CONFIG.PRODUCER_TABLES.MASTER, producerId)) {
      SheetRepository.delete(PMS_CONFIG.PRODUCER_TABLES.MASTER, producerId);
    }
  }
}

function passProducerTest_(name) {
  return { name: name, result: 'PASS' };
}

function assertProducerTest_(condition, message) {
  if (!condition) {
    throw new SystemError(
      '[TASK-0024] ' + message + ' 실패',
      { test: message },
      'PRODUCER_TEST_FAILED'
    );
  }
}
