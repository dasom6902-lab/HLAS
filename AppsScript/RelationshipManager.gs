/**
 * @fileoverview HLAS Entity Relationship 및 FK 검증 관리자.
 */

const RelationshipManager = Object.freeze({
  /**
   * 데이터 사전에서 모든 FK 관계를 추출한다.
   *
   * @return {Array<Object>} 자식 Entity와 부모 Entity 관계 목록
   */
  getRelationships: function () {
    const dictionary = DataDictionary.getDictionary();
    const relationships = [];
    Object.keys(dictionary).forEach(function (entityType) {
      dictionary[entityType].fields.forEach(function (field) {
        if (!field.foreignKey) return;
        relationships.push(Object.freeze({
          fromEntity: entityType,
          fromField: field.name,
          toEntity: field.foreignKey.entityType,
          toField: field.foreignKey.fieldName,
          required: field.required,
        }));
      });
    });
    return relationships;
  },

  /**
   * 단일 레코드의 FK 참조를 검증한다.
   *
   * lookup 함수는 (parentEntity, parentField, value)를 받아 존재 여부를 반환한다.
   *
   * @param {string} entityType 검사 Entity
   * @param {Object} record 검사 레코드
   * @param {Function} lookup 부모 데이터 조회 함수
   * @return {{valid:boolean,errors:Array<Object>}} FK 검증 결과
   */
  validateForeignKeys: function (entityType, record, lookup) {
    if (typeof lookup !== 'function') {
      throw new ValidationError(
        'FK 조회 함수가 필요합니다.',
        'lookup',
        null,
        'FK_LOOKUP_REQUIRED'
      );
    }
    const schema = DataDictionary.get(entityType);
    const input = record || {};
    const errors = [];

    schema.fields.forEach(function (field) {
      if (!field.foreignKey) return;
      const value = input[field.name];
      const empty = value === undefined || value === null || value === '';
      if (empty && !field.required) return;
      if (empty || !lookup(
        field.foreignKey.entityType,
        field.foreignKey.fieldName,
        value
      )) {
        errors.push({
          entityType: entityType,
          field: field.name,
          value: value,
          parentEntity: field.foreignKey.entityType,
          code: 'FOREIGN_KEY_NOT_FOUND',
        });
      }
    });
    return { valid: errors.length === 0, errors: errors };
  },

  /**
   * Entity 간 직접 관계가 등록되어 있는지 확인한다.
   *
   * @param {string} fromEntity 자식 Entity
   * @param {string} toEntity 부모 Entity
   * @return {boolean} 관계 등록 여부
   */
  hasRelationship: function (fromEntity, toEntity) {
    return this.getRelationships().some(function (relationship) {
      return relationship.fromEntity === fromEntity &&
        relationship.toEntity === toEntity;
    });
  },
});
