/**
 * @fileoverview HLAS Data Architecture Registry 정합성 검증기.
 */

const ArchitectureValidator = Object.freeze({
  /**
   * Architecture 전체 정합성을 검사한다.
   *
   * @return {{valid:boolean,checks:Array<Object>,errors:Array<Object>}} 검증 결과
   */
  validate: function () {
    const errors = [];
    const checks = [];
    const entities = EntityRegistry.getRegistry();
    const dictionary = DataDictionary.getDictionary();

    Object.keys(entities).forEach(function (entityType) {
      const definition = entities[entityType];
      const schema = dictionary[entityType];
      pushArchitectureCheck_(
        checks, errors, Boolean(schema),
        'DICTIONARY_REGISTERED', entityType
      );
      pushArchitectureCheck_(
        checks, errors,
        ArchitectureRegistry.isRegistered(definition.tableName),
        'ARCHITECTURE_REGISTERED', entityType
      );
      pushArchitectureCheck_(
        checks, errors,
        ArchitectureRegistry.getTableType(definition.tableName) === definition.tableType,
        'TABLE_TYPE_MATCH', entityType
      );
      if (!schema) return;

      const primaryFields = schema.fields.filter(function (field) {
        return field.primaryKey && field.name === schema.primaryKey;
      });
      pushArchitectureCheck_(
        checks, errors, primaryFields.length === 1,
        'PRIMARY_KEY_VALID', entityType
      );

      schema.fields.forEach(function (field) {
        if (!field.foreignKey) return;
        const parentSchema = dictionary[field.foreignKey.entityType];
        const parentFieldExists = Boolean(parentSchema) &&
          parentSchema.fields.some(function (parentField) {
            return parentField.name === field.foreignKey.fieldName;
          });
        pushArchitectureCheck_(
          checks, errors, parentFieldExists,
          'FOREIGN_KEY_VALID', entityType + '.' + field.name
        );
      });
    });

    Object.keys(dictionary).forEach(function (entityType) {
      pushArchitectureCheck_(
        checks, errors,
        EntityRegistry.isRegistered(entityType),
        'ENTITY_REGISTERED', entityType
      );
    });

    return {
      valid: errors.length === 0,
      checks: checks,
      errors: errors,
    };
  },

  /**
   * Architecture 검증을 CommonAPI 표준 응답으로 실행한다.
   *
   * @return {Object} CommonAPI 표준 응답
   */
  review: function () {
    return CommonAPI.execute(function () {
      const result = ArchitectureValidator.validate();
      if (!result.valid) {
        throw new ValidationError(
          'Data Architecture 검증에 실패했습니다.',
          'architecture',
          result.errors,
          'ARCHITECTURE_VALIDATION_FAILED'
        );
      }
      return result;
    }, { operation: 'ARCHITECTURE_REVIEW' });
  },
});

function pushArchitectureCheck_(checks, errors, passed, name, target) {
  const result = { name: name, target: target, passed: passed };
  checks.push(result);
  if (!passed) errors.push(result);
}
