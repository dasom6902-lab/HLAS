/**
 * @fileoverview TASK-0022 Data Architecture 자동 테스트.
 */

/**
 * Registry, Dictionary, FK, Config 정합성과 TASK-0021 회귀를 검사한다.
 *
 * @return {{passed:boolean,results:Array<Object>,validation:Object}} 테스트 결과
 */
function runArchitectureTests() {
  const results = [];
  const entity = HLAS_CONSTANTS.ENTITY_TYPE;
  const column = HLAS_CONSTANTS.COLUMN_NAME;

  const registry = ArchitectureRegistry.getRegistry();
  assertArchitectureTest_(
    Object.keys(registry).length === 4,
    'Registry Test'
  );
  results.push(passArchitectureTest_('Registry Test'));

  const producer = DataDictionary.get(entity.PRODUCER);
  const product = DataDictionary.get(entity.PRODUCT);
  assertArchitectureTest_(
    producer.primaryKey === column.PRODUCER_ID &&
      product.primaryKey === column.ITEM_CODE,
    'Dictionary Test'
  );
  results.push(passArchitectureTest_('Dictionary Test'));

  assertArchitectureTest_(
    RelationshipManager.hasRelationship(entity.AGREEMENT, entity.PRODUCER) &&
      RelationshipManager.hasRelationship(entity.RECEIVING, entity.AGREEMENT) &&
      RelationshipManager.hasRelationship(entity.ORDER, entity.PRODUCT) &&
      RelationshipManager.hasRelationship(entity.ORDER, entity.ROUTE),
    'Relationship Test'
  );
  results.push(passArchitectureTest_('Relationship Test'));

  const orderFixture = {};
  orderFixture[column.ITEM_CODE] = 'ITEM-001';
  orderFixture[column.ROUTE_CODE] = 'ROUTE-01';
  const fkValid = RelationshipManager.validateForeignKeys(
    entity.ORDER,
    orderFixture,
    function (parentEntity, parentField, value) {
      return Boolean(parentEntity && parentField && value);
    }
  );
  assertArchitectureTest_(fkValid.valid, 'FK Test');
  results.push(passArchitectureTest_('FK Test'));

  assertArchitectureTest_(
    PMS_CONFIG.MASTER_TABLES.PRODUCT &&
      PMS_CONFIG.TRANSACTION_TABLES.ORDER &&
      PMS_CONFIG.ANALYTICS_TABLES.AGE_STATISTICS &&
      PMS_CONFIG.RULE_TABLES.FUND_RULE,
    'Config Test'
  );
  results.push(passArchitectureTest_('Config Test'));

  const validation = ArchitectureValidator.validate();
  assertArchitectureTest_(validation.valid, 'Architecture Validator');
  results.push(passArchitectureTest_('Architecture Validator'));

  const task0021 = runMasterDataTests();
  assertArchitectureTest_(task0021.passed, 'TASK-0021 Regression');
  results.push(passArchitectureTest_('TASK-0021 Regression'));

  return {
    passed: true,
    results: results,
    validation: validation,
  };
}

function passArchitectureTest_(name) {
  return { name: name, result: 'PASS' };
}

function assertArchitectureTest_(condition, message) {
  if (!condition) {
    throw new SystemError(
      '[TASK-0022] ' + message + ' 실패',
      { test: message },
      'ARCHITECTURE_TEST_FAILED'
    );
  }
}
