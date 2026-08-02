/**
 * @fileoverview TASK-0027 Source 데이터를 PMS 표준 레코드로 변환한다.
 */
const MigrationMapper = Object.freeze({
  /**
   * Source를 Parsing하고 Column/Data Type Mapping을 적용한다.
   *
   * @param {Object} request Migration 요청
   * @return {Array<Object>} 표준 레코드
   */
  map: function (request) {
    const input = request || {};
    const profile = MigrationProfile.get(input.entity);
    const records = ImportMapper.parse(input.source || {});
    if (input.sourceProfile) {
      const sourceProfile = MigrationProfile.getSource(input.sourceProfile);
      if (sourceProfile.entity !== profile.entity) {
        throw new ValidationError(
          'Source Profile과 Entity가 일치하지 않습니다.',
          'entity',
          {
            entity: profile.entity,
            sourceEntity: sourceProfile.entity,
          },
          'MIGRATION_SOURCE_ENTITY_MISMATCH'
        );
      }
      return mapSupplyHistory2026_(
        records,
        input,
        sourceProfile
      );
    }
    const dataTypes = Object.assign(
      {},
      profile.dataTypes,
      input.dataTypes || {}
    );
    return ImportMapper.map(
      records,
      input.columnMapping || {},
      dataTypes
    ).map(function (record) {
      return DataTypeManager.normalizeRecord(record);
    });
  },
});

function mapSupplyHistory2026_(records, request, sourceProfile) {
  const mapping = Object.assign(
    {},
    sourceProfile.columnMapping,
    request.columnMapping || {}
  );
  const mapped = ImportMapper.map(records, mapping, {
    Quantity: 'NUMBER',
    Amount: 'NUMBER',
  });
  const supplyDate = resolveSupplyHistoryDate_(
    request.supplyDate,
    request.sourceFile
  );
  return mapped.map(function (source) {
    const record = Object.assign({}, source);
    const serial = DataTypeManager.normalizeStringKey(record.SupplySerial);
    const productId = DataTypeManager.normalizeProductID(record.ProductID);
    const quantity = Number(record.Quantity || 0);
    const amount = Number(record.Amount || 0);
    Validation.required(serial, 'SupplySerial');
    Validation.required(productId, 'ProductID');
    record.SupplySerial = serial;
    record.ProductID = productId;
    record.ProducerID =
      DataTypeManager.normalizeProducerID(record.ProducerID);
    record.ReceivingDate = supplyDate;
    record.ReceivingID = [
      serial,
      productId,
      String(quantity),
      String(amount),
    ].join('-');
    record.UnitPrice = quantity === 0 ? 0 : amount / quantity;
    record.Unit = 'EA';
    record.ReceivingType = HLAS_CONSTANTS.RECEIVING_TYPE.RECEIVING;
    record.Status = HLAS_CONSTANTS.RECEIVING_STATUS.CONFIRMED;
    record.Remark = sourceProfile.name;
    record.SupplementSource = sourceProfile.name;
    return DataTypeManager.normalizeRecord(record);
  });
}

function resolveSupplyHistoryDate_(suppliedDate, sourceFile) {
  if (suppliedDate) {
    Validation.validDate(suppliedDate, 'supplyDate');
    return String(suppliedDate);
  }
  const fileName = String(sourceFile || '').split(/[\\/]/).pop();
  let stem = fileName.replace(/\.xlsx$/i, '');
  stem = PMS_CONFIG.MIGRATION.FILE_DATE_CORRECTIONS[stem] || stem;
  if (!/^\d{6}$/.test(stem)) {
    throw new ValidationError(
      '공급일을 파일명에서 확인할 수 없습니다.',
      'sourceFile',
      { sourceFile: sourceFile },
      'MIGRATION_SUPPLY_DATE_INVALID'
    );
  }
  const date = [
    '20' + stem.substring(0, 2),
    stem.substring(2, 4),
    stem.substring(4, 6),
  ].join('-');
  Validation.validDate(date, 'supplyDate');
  return date;
}
