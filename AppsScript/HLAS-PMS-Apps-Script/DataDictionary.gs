/**
 * @fileoverview HLAS Entity별 PK, FK, 자료형 및 필수값 데이터 사전.
 */

const DataDictionary = Object.freeze({
  /**
   * 전체 데이터 사전을 반환한다.
   *
   * @return {Object<string,Object>} Entity별 데이터 정의
   */
  getDictionary: function () {
    const entity = HLAS_CONSTANTS.ENTITY_TYPE;
    const column = HLAS_CONSTANTS.COLUMN_NAME;
    const key = HLAS_CONSTANTS.KEY_NAME;
    const dictionary = {};

    dictionary[entity.PRODUCER] = entitySchema_(
      entity.PRODUCER,
      key.PRODUCER,
      [
        fieldDefinition_(column.PRODUCER_ID, 'String', true, true, null, 'ERP 기준 Producer Master PK'),
        fieldDefinition_(column.PRODUCER_NAME, 'String', true, false, null, '생산자 표시명'),
        fieldDefinition_(column.ACTIVE_YN, 'Boolean', true, false, null, '사용 여부'),
      ]
    );
    dictionary[entity.PRODUCT] = entitySchema_(
      entity.PRODUCT,
      key.PRODUCT,
      [
        fieldDefinition_(column.ITEM_CODE, 'String', true, true, null, 'Item Master PK'),
        fieldDefinition_(column.ITEM_NAME, 'String', true, false, null, '물품 표시명'),
        fieldDefinition_(column.PRODUCER_ID, 'String', false, false, fk_(entity.PRODUCER, key.PRODUCER), '대표 생산자'),
        fieldDefinition_(column.ACTIVE_YN, 'Boolean', true, false, null, '사용 여부'),
      ]
    );
    dictionary[entity.AGREEMENT] = entitySchema_(
      entity.AGREEMENT,
      key.AGREEMENT,
      [
        fieldDefinition_(column.AGREEMENT_ID, 'String', true, true, null, 'Agreement Master PK'),
        fieldDefinition_(column.PRODUCER_ID, 'String', true, false, fk_(entity.PRODUCER, key.PRODUCER), '약정 생산자'),
        fieldDefinition_(column.ITEM_CODE, 'String', true, false, fk_(entity.PRODUCT, key.PRODUCT), '약정 물품'),
        fieldDefinition_(column.START_DATE, 'Date', true, false, null, '약정 시작일'),
        fieldDefinition_(column.END_DATE, 'Date', false, false, null, '약정 종료일'),
        fieldDefinition_(column.STATUS, 'String', true, false, null, '약정 상태'),
      ]
    );
    dictionary[entity.RECEIVING] = entitySchema_(
      entity.RECEIVING,
      key.RECEIVING,
      [
        fieldDefinition_(column.RECEIVING_ID, 'String', true, true, null, 'Receiving Transaction PK'),
        fieldDefinition_(column.AGREEMENT_ID, 'String', true, false, fk_(entity.AGREEMENT, key.AGREEMENT), '연결 약정'),
        fieldDefinition_(column.PRODUCER_ID, 'String', true, false, fk_(entity.PRODUCER, key.PRODUCER), '입고 생산자'),
        fieldDefinition_(column.ITEM_CODE, 'String', true, false, fk_(entity.PRODUCT, key.PRODUCT), '입고 품번'),
        fieldDefinition_(column.RECEIVING_DATE, 'Date', true, false, null, '입고일'),
        fieldDefinition_(column.QUANTITY, 'Number', true, false, null, '입고 수량'),
      ]
    );
    dictionary[entity.RETURN] = entitySchema_(
      entity.RETURN,
      key.RETURN,
      [
        fieldDefinition_(column.RETURN_ID, 'String', true, true, null, 'Return Transaction PK'),
        fieldDefinition_(column.RECEIVING_ID, 'String', false, false, fk_(entity.RECEIVING, key.RECEIVING), '원 입고번호'),
        fieldDefinition_(column.PRODUCER_ID, 'String', true, false, fk_(entity.PRODUCER, key.PRODUCER), '반품 생산자'),
        fieldDefinition_(column.ITEM_CODE, 'String', true, false, fk_(entity.PRODUCT, key.PRODUCT), '반품 품번'),
        fieldDefinition_(column.RETURN_DATE, 'Date', true, false, null, '반품일'),
        fieldDefinition_(column.QUANTITY, 'Number', true, false, null, '반품 수량'),
      ]
    );
    dictionary[entity.ROUTE] = entitySchema_(
      entity.ROUTE,
      key.ROUTE,
      [
        fieldDefinition_(column.ROUTE_CODE, 'String', true, true, null, '공급코스 Master PK'),
        fieldDefinition_(column.ACTIVE_YN, 'Boolean', true, false, null, '사용 여부'),
      ]
    );
    dictionary[entity.ORDER] = entitySchema_(
      entity.ORDER,
      key.ORDER,
      [
        fieldDefinition_(column.ORDER_ID, 'String', true, true, null, 'Order Transaction PK'),
        fieldDefinition_(column.ITEM_CODE, 'String', true, false, fk_(entity.PRODUCT, key.PRODUCT), '주문 품번'),
        fieldDefinition_(column.ROUTE_CODE, 'String', true, false, fk_(entity.ROUTE, key.ROUTE), '공급코스'),
        fieldDefinition_(column.ORDER_DATE, 'Date', true, false, null, '주문일'),
        fieldDefinition_(column.QUANTITY, 'Number', true, false, null, '주문 수량'),
      ]
    );
    dictionary[entity.SHIPMENT] = entitySchema_(
      entity.SHIPMENT,
      key.SHIPMENT,
      [
        fieldDefinition_(column.SHIPMENT_ID, 'String', true, true, null, 'Shipment Transaction PK'),
        fieldDefinition_(column.ORDER_ID, 'String', true, false, fk_(entity.ORDER, key.ORDER), '출고 대상 주문'),
        fieldDefinition_(column.ROUTE_CODE, 'String', true, false, fk_(entity.ROUTE, key.ROUTE), '공급코스'),
        fieldDefinition_(column.SHIPMENT_DATE, 'Date', true, false, null, '출고일'),
      ]
    );
    dictionary[entity.INVENTORY] = entitySchema_(
      entity.INVENTORY,
      key.INVENTORY,
      [
        fieldDefinition_(column.INVENTORY_ID, 'String', true, true, null, 'Inventory Transaction PK'),
        fieldDefinition_(column.ITEM_CODE, 'String', true, false, fk_(entity.PRODUCT, key.PRODUCT), '재고 품번'),
        fieldDefinition_(column.QUANTITY, 'Number', true, false, null, '재고 수량'),
        fieldDefinition_(column.UPDATED_AT, 'DateTime', true, false, null, '재고 갱신일시'),
      ]
    );
    dictionary[entity.FUND_RULE] = entitySchema_(
      entity.FUND_RULE,
      key.FUND_RULE,
      [
        fieldDefinition_(column.FUND_RULE_ID, 'String', true, true, null, 'Fund Rule PK'),
        fieldDefinition_(column.ITEM_CODE, 'String', false, false, fk_(entity.PRODUCT, key.PRODUCT), '적용 품번'),
        fieldDefinition_(column.ACTIVE_YN, 'Boolean', true, false, null, '사용 여부'),
      ]
    );
    dictionary[entity.FUND_HISTORY] = entitySchema_(
      entity.FUND_HISTORY,
      key.FUND_HISTORY,
      [
        fieldDefinition_(column.FUND_HISTORY_ID, 'String', true, true, null, 'Fund History PK'),
        fieldDefinition_(column.FUND_RULE_ID, 'String', true, false, fk_(entity.FUND_RULE, key.FUND_RULE), '적용 기금 규칙'),
        fieldDefinition_(column.PRODUCER_ID, 'String', true, false, fk_(entity.PRODUCER, key.PRODUCER), '기금 대상 생산자'),
        fieldDefinition_(column.AMOUNT, 'Number', true, false, null, '기금 금액'),
        fieldDefinition_(column.CREATED_AT, 'DateTime', true, false, null, '기금 반영일시'),
      ]
    );

    return Object.freeze(dictionary);
  },

  /**
   * Entity 데이터 사전을 조회한다.
   *
   * @param {string} entityType Entity 유형
   * @return {Object} Entity 스키마
   */
  get: function (entityType) {
    const dictionary = this.getDictionary();
    if (!Object.prototype.hasOwnProperty.call(dictionary, entityType)) {
      throw new NotFoundError(
        '데이터 사전에 등록되지 않은 Entity입니다.',
        'entityType',
        { entityType: entityType },
        'DICTIONARY_NOT_FOUND'
      );
    }
    return dictionary[entityType];
  },
});

function entitySchema_(entityType, primaryKey, fields) {
  return Object.freeze({
    entityType: entityType,
    primaryKey: primaryKey,
    fields: Object.freeze(fields),
  });
}

function fieldDefinition_(name, type, required, primaryKey, foreignKey, description) {
  return Object.freeze({
    name: name,
    type: type,
    required: required,
    primaryKey: primaryKey,
    foreignKey: foreignKey,
    description: description,
  });
}

function fk_(entityType, fieldName) {
  return Object.freeze({ entityType: entityType, fieldName: fieldName });
}
