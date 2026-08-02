/**
 * @fileoverview TASK-0027A 보완 Source 중복 및 운용본 우선 판별.
 */
const MigrationDuplicateService = Object.freeze({
  /**
   * 운용본 우선 원칙에 따라 보완 대상과 제외 대상을 분류한다.
   *
   * @param {Array<Object>} supplementRecords 보완 Source 레코드
   * @param {Array<Object>} operatingRecords 운용본 레코드
   * @return {Object} 분류 결과
   */
  classify: function (supplementRecords, operatingRecords) {
    const operating = buildOperatingSupplyIndexes_(operatingRecords || []);
    const seenDetailed = {};
    const finalRecords = [];
    let operatingRows = 0;
    let duplicateRows = 0;
    (supplementRecords || []).forEach(function (record) {
      const keys = buildSupplyDuplicateKeys_(record);
      if (
        operating.ids[keys.receivingId] ||
        operating.serials[keys.serial] ||
        operating.fallback[keys.fallback]
      ) {
        operatingRows += 1;
        return;
      }
      if (seenDetailed[keys.detailed]) {
        duplicateRows += 1;
        return;
      }
      seenDetailed[keys.detailed] = true;
      finalRecords.push(record);
    });
    return {
      operatingRows: operatingRows,
      supplementRows: finalRecords.length,
      duplicateRows: duplicateRows,
      finalImportRows: finalRecords.length,
      skippedRows: operatingRows + duplicateRows,
      finalRecords: finalRecords,
    };
  },
});

function buildOperatingSupplyIndexes_(records) {
  const indexes = {
    ids: {},
    serials: {},
    fallback: {},
  };
  (records || []).forEach(function (record) {
    const keys = buildSupplyDuplicateKeys_(record);
    if (keys.receivingId) indexes.ids[keys.receivingId] = true;
    if (
      keys.serial &&
      keys.receivingId === keys.serial
    ) {
      indexes.serials[keys.serial] = true;
    }
    indexes.fallback[keys.fallback] = true;
  });
  return indexes;
}

function buildSupplyDuplicateKeys_(record) {
  const input = record || {};
  const receivingId =
    DataTypeManager.normalizeStringKey(input.ReceivingID);
  const serial = DataTypeManager.normalizeStringKey(
    input.SupplySerial || extractSupplySerial_(receivingId)
  );
  const producerId =
    DataTypeManager.normalizeProducerID(input.ProducerID);
  const productId =
    DataTypeManager.normalizeProductID(input.ProductID);
  const date = normalizeSupplyComparisonDate_(input.ReceivingDate);
  const quantity = normalizeSupplyNumber_(input.Quantity);
  const amount = normalizeSupplyNumber_(input.Amount);
  const primary = [serial, productId].join('|');
  const fallback = [
    date,
    producerId,
    productId,
    quantity,
    amount,
  ].join('|');
  return {
    receivingId: receivingId,
    serial: serial,
    primary: primary,
    detailed: [primary, quantity, amount].join('|'),
    fallback: fallback,
  };
}

function extractSupplySerial_(receivingId) {
  const match = String(receivingId || '').match(/^(\d{15,})/);
  return match ? match[1] : '';
}

function normalizeSupplyComparisonDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );
  }
  const text = String(value || '');
  return text.length >= 10 ? text.substring(0, 10) : text;
}

function normalizeSupplyNumber_(value) {
  const number = Number(value || 0);
  return isFinite(number) ? String(number) : String(value || '');
}
