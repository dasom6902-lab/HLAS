/**
 * @fileoverview HLAS 업무 Entity와 논리 테이블의 연결 Registry.
 */

const EntityRegistry = Object.freeze({
  /**
   * 전체 Entity 정의를 반환한다.
   *
   * @return {Object<string,Object>} Entity Registry
   */
  getRegistry: function () {
    const entity = HLAS_CONSTANTS.ENTITY_TYPE;
    const tableType = HLAS_CONSTANTS.TABLE_TYPE;
    const definitions = {};

    definitions[entity.PRODUCT] = createEntityDefinition_(
      entity.PRODUCT, tableType.MASTER, PMS_CONFIG.MASTER_TABLES.PRODUCT
    );
    definitions[entity.PRODUCER] = createEntityDefinition_(
      entity.PRODUCER, tableType.MASTER, PMS_CONFIG.MASTER_TABLES.PRODUCER
    );
    definitions[entity.AGREEMENT] = createEntityDefinition_(
      entity.AGREEMENT, tableType.MASTER, PMS_CONFIG.MASTER_TABLES.AGREEMENT
    );
    definitions[entity.RECEIVING] = createEntityDefinition_(
      entity.RECEIVING, tableType.TRANSACTION, PMS_CONFIG.TRANSACTION_TABLES.RECEIVING
    );
    definitions[entity.RETURN] = createEntityDefinition_(
      entity.RETURN, tableType.TRANSACTION, PMS_CONFIG.TRANSACTION_TABLES.RETURN
    );
    definitions[entity.ORDER] = createEntityDefinition_(
      entity.ORDER, tableType.TRANSACTION, PMS_CONFIG.TRANSACTION_TABLES.ORDER
    );
    definitions[entity.SHIPMENT] = createEntityDefinition_(
      entity.SHIPMENT, tableType.TRANSACTION, PMS_CONFIG.TRANSACTION_TABLES.SHIPMENT
    );
    definitions[entity.INVENTORY] = createEntityDefinition_(
      entity.INVENTORY, tableType.TRANSACTION, PMS_CONFIG.TRANSACTION_TABLES.INVENTORY
    );
    definitions[entity.ROUTE] = createEntityDefinition_(
      entity.ROUTE, tableType.MASTER, PMS_CONFIG.MASTER_TABLES.ROUTE
    );
    definitions[entity.FUND_RULE] = createEntityDefinition_(
      entity.FUND_RULE, tableType.RULE, PMS_CONFIG.RULE_TABLES.FUND_RULE
    );
    definitions[entity.FUND_HISTORY] = createEntityDefinition_(
      entity.FUND_HISTORY, tableType.TRANSACTION, PMS_CONFIG.TRANSACTION_TABLES.FUND_HISTORY
    );

    return Object.freeze(definitions);
  },

  /**
   * Entity 정의를 조회한다.
   *
   * @param {string} entityType HLAS_CONSTANTS.ENTITY_TYPE 값
   * @return {Object} Entity 정의
   */
  get: function (entityType) {
    const registry = this.getRegistry();
    if (!Object.prototype.hasOwnProperty.call(registry, entityType)) {
      throw new NotFoundError(
        '등록되지 않은 Entity입니다.',
        'entityType',
        { entityType: entityType },
        'ENTITY_NOT_REGISTERED'
      );
    }
    return registry[entityType];
  },

  /**
   * Entity 등록 여부를 확인한다.
   *
   * @param {string} entityType Entity 유형
   * @return {boolean} 등록 여부
   */
  isRegistered: function (entityType) {
    return Object.prototype.hasOwnProperty.call(this.getRegistry(), entityType);
  },
});

function createEntityDefinition_(entityType, tableType, tableName) {
  return Object.freeze({
    entityType: entityType,
    tableType: tableType,
    tableName: tableName,
  });
}
