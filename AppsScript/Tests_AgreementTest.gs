/**
 * @fileoverview TASK-0026 Agreement Domain 자동 테스트.
 */

/**
 * Agreement Repository, Service, API, Validator, Calculator와 회귀를 검사한다.
 *
 * @return {{passed:boolean,results:Array<Object>}} 테스트 결과
 */
function runAgreementTests() {
  const results = [];
  const pf = HLAS_CONSTANTS.FIELD.PRODUCER;
  const af = HLAS_CONSTANTS.FIELD.AGREEMENT;
  const rf = HLAS_CONSTANTS.FIELD.RECEIVING;
  const mf = HLAS_CONSTANTS.FIELD.MASTER_DATA;
  const suffix = Utilities.getUuid();
  const producerId = 'AGR-P-' + suffix;
  const agreementId = 'AGR-' + suffix;
  const receivingId = 'AGR-R-' + suffix;
  const product = MasterDataRepository.readMasterData().records.find(
    function (record) {
      return String(record[mf.ITEM_CODE] || '').trim() !== '';
    }
  );
  assertAgreementTest_(Boolean(product), 'Product Fixture');
  const rawProductId = product[mf.ITEM_CODE];
  const productId = DataTypeManager.normalizeProductID(rawProductId);
  try {
    const producer = {};
    producer[pf.PRODUCER_ID] = producerId;
    producer[pf.PRODUCER_NAME] = '약정 테스트 생산자';
    producer[pf.REGION] = '테스트 지역';
    producer[pf.COMMUNITY] = '테스트 공동체';
    producer[pf.TRADE_STATUS] = HLAS_CONSTANTS.SUPPLY_STATUS.ACTIVE;
    producer[pf.MEMBERSHIP_STATUS] = HLAS_CONSTANTS.MEMBERSHIP_TYPE.MEMBER;
    assertAgreementTest_(saveProducer(producer).ok, 'Producer Fixture');

    const receiving = {};
    receiving[rf.RECEIVING_ID] = receivingId;
    receiving[rf.RECEIVING_DATE] = '2026-07-30';
    receiving[rf.PRODUCER_ID] = producerId;
    receiving[rf.PRODUCT_ID] = rawProductId;
    receiving[rf.PRODUCT_NAME] = product[mf.ITEM_NAME];
    receiving[rf.CENTER_CODE] = 'BUSAN-01';
    receiving[rf.CENTER_NAME] = '부산 물류센터';
    receiving[rf.QUANTITY] = 40;
    receiving[rf.UNIT] = 'EA';
    receiving[rf.UNIT_PRICE] = 100;
    receiving[rf.RECEIVING_TYPE] =
      HLAS_CONSTANTS.RECEIVING_TYPE.RECEIVING;
    receiving[rf.STATUS] = HLAS_CONSTANTS.RECEIVING_STATUS.REGISTERED;
    assertAgreementTest_(saveReceiving(receiving).ok, 'Receiving Fixture');

    const agreement = {};
    agreement[af.AGREEMENT_ID] = agreementId;
    agreement[af.AGREEMENT_YEAR] = 2026;
    agreement[af.PRODUCER_ID] = producerId;
    agreement[af.PRODUCT_ID] = productId;
    agreement[af.PRODUCT_NAME] = product[mf.ITEM_NAME];
    agreement[af.AGREEMENT_QUANTITY] = 100;
    agreement[af.AGREEMENT_AMOUNT] = 10000;
    agreement[af.EXPECTED_SUPPLY_DATE] = '2026-09-30';
    agreement[af.START_DATE] = '2026-01-01';
    agreement[af.END_DATE] = '2026-12-31';
    agreement[af.AGREEMENT_STATUS] = HLAS_CONSTANTS.AGREEMENT_STATUS.ACTIVE;
    agreement[af.FUND_APPLICABLE] = true;
    const saved = saveAgreement(agreement);
    assertAgreementTest_(
      saved.ok && saved.data[af.AGREEMENT_ID] === agreementId,
      'Repository/API Test'
    );
    results.push(passAgreementTest_('Repository/API Test'));

    const duplicate = saveAgreement(agreement);
    assertAgreementTest_(
      !duplicate.ok && duplicate.error.code === 'AGREEMENT_DUPLICATE',
      'Validator Duplicate Test'
    );
    results.push(passAgreementTest_('Validator Test'));

    const updated = updateAgreement(agreementId, { InternalMemo: '수정 완료' });
    assertAgreementTest_(
      updated.ok && updated.data[af.INTERNAL_MEMO] === '수정 완료',
      'Service Update Test'
    );
    results.push(passAgreementTest_('Service Test'));

    const summary = getAgreementSummary(agreementId);
    assertAgreementTest_(
      summary.ok &&
      summary.data.achievementRate === 40 &&
      summary.data.remainingQuantity === 60 &&
      summary.data.remainingAmount === 6000 &&
      summary.data.fundBase === 4000,
      'Achievement/Remaining/Fund Test'
    );
    results.push(passAgreementTest_('Calculator Test'));

    const search = searchAgreement({
      producerId: producerId,
      productId: productId,
      year: 2026,
    });
    assertAgreementTest_(search.ok && search.data.length === 1, 'Index Search Test');
    results.push(passAgreementTest_('Index Search Test'));

    assertAgreementTest_(runFrameworkTests().passed, 'Regression Test');
    results.push(passAgreementTest_('Regression Test'));
    return { passed: true, results: results };
  } finally {
    cleanupAgreementTest_(agreementId, receivingId, producerId);
  }
}

function cleanupAgreementTest_(agreementId, receivingId, producerId) {
  [
    [PMS_CONFIG.AGREEMENT_TABLES.EXTENSION, agreementId],
    [PMS_CONFIG.AGREEMENT_TABLES.MASTER, agreementId],
    [PMS_CONFIG.RECEIVING_TABLES.EXTENSION, receivingId],
    [PMS_CONFIG.RECEIVING_TABLES.MASTER, receivingId],
    [PMS_CONFIG.PRODUCER_TABLES.EXTENSION, producerId],
    [PMS_CONFIG.PRODUCER_TABLES.MASTER, producerId],
  ].forEach(function (target) {
    if (SheetRepository.findById(target[0], target[1])) {
      SheetRepository.delete(target[0], target[1]);
    }
  });
  refreshAgreementIndex_();
}

function passAgreementTest_(name) {
  return { name: name, result: 'PASS' };
}

function assertAgreementTest_(condition, message) {
  if (!condition) {
    throw new SystemError(
      '[TASK-0026] ' + message + ' 실패',
      { test: message },
      'AGREEMENT_TEST_FAILED'
    );
  }
}
