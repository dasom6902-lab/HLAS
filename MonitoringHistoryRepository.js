/**
 * @fileoverview HLAS-0050 Monitoring History Repository
 * MONITORING_HISTORY_V1 Spreadsheet 저장 및 제한 조회를 담당한다.
 */

const MonitoringHistoryRepository = {
  SHEET_NAME: 'MONITORING_HISTORY',
  SCHEMA_VERSION: 'V1',
  HEADERS: [
    'TIME',
    'METRIC_DOMAIN',
    'METRIC_KEY',
    'METRIC_VALUE',
    'STATUS',
    'SOURCE',
    'PERIOD',
    'SCHEMA_VERSION'
  ],
  MAX_QUERY_ROWS: 10000,
  MAX_INSERT_BATCH: 500,
  MAX_DELETE_BATCH: 1000,
  RETENTION_DAYS: 30,
  MAX_DATA_ROWS: 50000,
  _validatedSpreadsheetId: '',
  _lastOperationMetric: null,

  initialize: function() {
    const spreadsheet = _getMonitoringHistorySpreadsheet_();
    let sheet = spreadsheet.getSheetByName(this.SHEET_NAME);
    let created = false;
    let writeCalls = 0;

    if (!sheet) {
      sheet = spreadsheet.insertSheet(this.SHEET_NAME);
      created = true;
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow === 0 || lastColumn === 0) {
      sheet
        .getRange(1, 1, 1, this.HEADERS.length)
        .setValues([this.HEADERS]);
      sheet.setFrozenRows(1);
      writeCalls++;
    } else {
      _validateMonitoringHistoryHeader_(sheet, this.HEADERS);
    }

    this._validatedSpreadsheetId = spreadsheet.getId();
    this._lastOperationMetric = {
      operation: 'INITIALIZE',
      readCalls: lastRow === 0 || lastColumn === 0 ? 0 : 1,
      writeCalls: writeCalls,
      deleteCalls: 0,
      rowsRead: lastRow > 0 ? 1 : 0,
      rowsWritten: writeCalls > 0 ? 1 : 0,
      rowsDeleted: 0
    };

    return {
      sheetName: sheet.getName(),
      schemaVersion: this.SCHEMA_VERSION,
      created: created,
      columns: this.HEADERS.length
    };
  },

  insertBatch: function(records) {
    const input = Array.isArray(records) ? records : [];

    if (input.length === 0) {
      this._lastOperationMetric = {
        operation: 'INSERT',
        readCalls: 0,
        writeCalls: 0,
        deleteCalls: 0,
        rowsRead: 0,
        rowsWritten: 0,
        rowsDeleted: 0
      };
      return {inserted: 0, batches: 0};
    }

    const lock = LockService.getScriptLock();

    if (!lock.tryLock(5000)) {
      throw new Error('Monitoring History Insert Lock 획득 실패');
    }

    try {
      const sheet = _getValidatedMonitoringHistorySheet_();
      const rows = input.map(function(record) {
        return _monitoringHistoryRecordToRow_(record);
      });
      let inserted = 0;
      let batches = 0;

      for (
        let offset = 0;
        offset < rows.length;
        offset += this.MAX_INSERT_BATCH
      ) {
        const batch = rows.slice(
          offset,
          offset + this.MAX_INSERT_BATCH
        );
        const startRow = sheet.getLastRow() + 1;

        sheet
          .getRange(startRow, 1, batch.length, this.HEADERS.length)
          .setValues(batch);
        inserted += batch.length;
        batches++;
      }

      this._lastOperationMetric = {
        operation: 'INSERT',
        readCalls: 0,
        writeCalls: batches,
        deleteCalls: 0,
        rowsRead: 0,
        rowsWritten: inserted,
        rowsDeleted: 0
      };

      return {
        inserted: inserted,
        batches: batches
      };
    } finally {
      lock.releaseLock();
    }
  },

  queryRange: function(startTime, endTime, options) {
    const config = options || {};
    const limit = Math.min(
      Math.max(Number(config.limit || this.MAX_QUERY_ROWS), 1),
      this.MAX_QUERY_ROWS
    );
    const start = _normalizeMonitoringHistoryDate_(
      startTime,
      'History 조회 시작 시간'
    );
    const end = _normalizeMonitoringHistoryDate_(
      endTime,
      'History 조회 종료 시간'
    );

    if (start.getTime() > end.getTime()) {
      throw new Error('History 조회 시작 시간이 종료 시간보다 늦습니다.');
    }

    const sheet = _getValidatedMonitoringHistorySheet_();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      this._lastOperationMetric = {
        operation: 'QUERY',
        readCalls: 0,
        writeCalls: 0,
        deleteCalls: 0,
        rowsRead: 0,
        rowsWritten: 0,
        rowsDeleted: 0
      };
      return [];
    }

    const dataRows = lastRow - 1;
    const rowsToRead = Math.min(dataRows, limit);
    const firstRow = lastRow - rowsToRead + 1;
    const values = sheet
      .getRange(firstRow, 1, rowsToRead, this.HEADERS.length)
      .getValues();
    const filters = {
      domain: _normalizeMonitoringHistoryFilter_(config.domain),
      key: _normalizeMonitoringHistoryFilter_(config.key),
      source: _normalizeMonitoringHistoryFilter_(config.source)
    };
    const result = [];

    values.forEach(function(row) {
      const record = _monitoringHistoryRowToRecord_(row);
      const timestamp = record.time.getTime();

      if (timestamp < start.getTime() || timestamp > end.getTime()) {
        return;
      }
      if (filters.domain && record.metricDomain !== filters.domain) {
        return;
      }
      if (filters.key && record.metricKey !== filters.key) {
        return;
      }
      if (filters.source && record.source !== filters.source) {
        return;
      }

      result.push(record);
    });

    result.sort(function(a, b) {
      return a.time.getTime() - b.time.getTime();
    });

    this._lastOperationMetric = {
      operation: 'QUERY',
      readCalls: 1,
      writeCalls: 0,
      deleteCalls: 0,
      rowsRead: rowsToRead,
      rowsWritten: 0,
      rowsDeleted: 0,
      returnedRows: result.length,
      truncated: dataRows > rowsToRead
    };

    return result;
  },

  enforceRetention: function(referenceTime, options) {
    const config = options || {};
    const retentionDays = Math.max(
      Number(config.retentionDays || this.RETENTION_DAYS),
      1
    );
    const maxRows = Math.max(
      Number(config.maxRows || this.MAX_DATA_ROWS),
      1
    );
    const deleteBatch = Math.min(
      Math.max(
        Number(config.deleteBatch || this.MAX_DELETE_BATCH),
        1
      ),
      this.MAX_DELETE_BATCH
    );
    const now = _normalizeMonitoringHistoryDate_(
      referenceTime || new Date(),
      'Retention 기준 시간'
    );
    const cutoff = new Date(
      now.getTime() - retentionDays * 24 * 60 * 60 * 1000
    );
    const lock = LockService.getScriptLock();

    if (!lock.tryLock(5000)) {
      throw new Error('Monitoring History Retention Lock 획득 실패');
    }

    try {
      const sheet = _getValidatedMonitoringHistorySheet_();
      const lastRow = sheet.getLastRow();
      const dataRows = Math.max(lastRow - 1, 0);

      if (dataRows === 0) {
        return _buildMonitoringRetentionResult_(0, 0, 0, false);
      }

      const scanRows = Math.min(dataRows, deleteBatch);
      const oldestTimes = sheet
        .getRange(2, 1, scanRows, 1)
        .getValues();
      let expiredRows = 0;

      for (let index = 0; index < oldestTimes.length; index++) {
        const value = oldestTimes[index][0];
        const time = value instanceof Date ? value : new Date(value);

        if (
          Number.isNaN(time.getTime()) ||
          time.getTime() >= cutoff.getTime()
        ) {
          break;
        }
        expiredRows++;
      }

      const excessRows = Math.max(dataRows - maxRows, 0);
      const rowsToDelete = Math.min(
        Math.max(expiredRows, excessRows),
        deleteBatch,
        dataRows
      );

      if (rowsToDelete > 0) {
        sheet.deleteRows(2, rowsToDelete);
      }

      const remainingRows = dataRows - rowsToDelete;
      const moreByCount = remainingRows > maxRows;
      const moreByAge = expiredRows === scanRows && scanRows === deleteBatch;
      const moreRequired = moreByCount || moreByAge;

      this._lastOperationMetric = {
        operation: 'RETENTION',
        readCalls: 1,
        writeCalls: 0,
        deleteCalls: rowsToDelete > 0 ? 1 : 0,
        rowsRead: scanRows,
        rowsWritten: 0,
        rowsDeleted: rowsToDelete
      };

      return _buildMonitoringRetentionResult_(
        rowsToDelete,
        expiredRows,
        excessRows,
        moreRequired
      );
    } finally {
      lock.releaseLock();
    }
  },

  getLastOperationMetric: function() {
    return this._lastOperationMetric
      ? Object.assign({}, this._lastOperationMetric)
      : null;
  }
};

function _getMonitoringHistorySpreadsheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('연결된 Spreadsheet를 찾을 수 없습니다.');
  }

  return spreadsheet;
}

function _getValidatedMonitoringHistorySheet_() {
  const spreadsheet = _getMonitoringHistorySpreadsheet_();
  let sheet = spreadsheet.getSheetByName(
    MonitoringHistoryRepository.SHEET_NAME
  );

  if (!sheet) {
    MonitoringHistoryRepository.initialize();
    sheet = spreadsheet.getSheetByName(
      MonitoringHistoryRepository.SHEET_NAME
    );
  } else if (
    MonitoringHistoryRepository._validatedSpreadsheetId !==
    spreadsheet.getId()
  ) {
    _validateMonitoringHistoryHeader_(
      sheet,
      MonitoringHistoryRepository.HEADERS
    );
    MonitoringHistoryRepository._validatedSpreadsheetId =
      spreadsheet.getId();
  }

  return sheet;
}

function _validateMonitoringHistoryHeader_(sheet, expectedHeaders) {
  const lastColumn = sheet.getLastColumn();
  const actual = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getValues()[0]
    .map(function(value) {
      return String(value || '').trim();
    });

  expectedHeaders.forEach(function(expected, index) {
    if (actual[index] !== expected) {
      throw new Error(
        'MONITORING_HISTORY_V1 Header 불일치: ' +
        (index + 1) + '열 expected=' + expected +
        ' actual=' + actual[index]
      );
    }
  });

  if (lastColumn > expectedHeaders.length) {
    const extraHeaders = sheet
      .getRange(
        1,
        expectedHeaders.length + 1,
        1,
        lastColumn - expectedHeaders.length
      )
      .getValues()[0]
      .some(function(value) {
        return String(value || '').trim() !== '';
      });

    if (extraHeaders) {
      throw new Error(
        'MONITORING_HISTORY_V1 허용 범위를 벗어난 Header가 있습니다.'
      );
    }
  }
}

function _monitoringHistoryRecordToRow_(record) {
  const normalized = _normalizeMonitoringHistoryRecord_(record);

  return [
    normalized.time,
    normalized.metricDomain,
    normalized.metricKey,
    normalized.metricValue,
    normalized.status,
    normalized.source,
    normalized.period,
    normalized.schemaVersion
  ];
}

function _monitoringHistoryRowToRecord_(row) {
  return _normalizeMonitoringHistoryRecord_({
    time: row[0],
    metricDomain: row[1],
    metricKey: row[2],
    metricValue: row[3],
    status: row[4],
    source: row[5],
    period: row[6],
    schemaVersion: row[7]
  });
}

function _normalizeMonitoringHistoryRecord_(record) {
  const value = record || {};
  const metricValue = Number(value.metricValue);
  const metricDomain = _normalizeRequiredMonitoringHistoryText_(
    value.metricDomain,
    'METRIC_DOMAIN'
  );
  const metricKey = _normalizeRequiredMonitoringHistoryText_(
    value.metricKey,
    'METRIC_KEY'
  );
  const source = _normalizeRequiredMonitoringHistoryText_(
    value.source,
    'SOURCE'
  );
  const schemaVersion = String(
    value.schemaVersion || MonitoringHistoryRepository.SCHEMA_VERSION
  ).trim().toUpperCase();

  if (!Number.isFinite(metricValue)) {
    throw new Error(
      metricDomain + ':' + metricKey + ' METRIC_VALUE가 유효하지 않습니다.'
    );
  }
  if (schemaVersion !== MonitoringHistoryRepository.SCHEMA_VERSION) {
    throw new Error(
      '지원하지 않는 Monitoring History Schema: ' + schemaVersion
    );
  }

  return {
    time: _normalizeMonitoringHistoryDate_(value.time, 'TIME'),
    metricDomain: metricDomain,
    metricKey: metricKey,
    metricValue: metricValue,
    status: String(value.status || 'UNKNOWN').trim().toUpperCase(),
    source: source,
    period: String(value.period || 'RAW_5M').trim().toUpperCase(),
    schemaVersion: schemaVersion
  };
}

function _normalizeRequiredMonitoringHistoryText_(value, field) {
  const normalized = String(value || '').trim().toUpperCase();

  if (!normalized) {
    throw new Error(field + ' 값이 필요합니다.');
  }

  return normalized;
}

function _normalizeMonitoringHistoryFilter_(value) {
  return value === undefined || value === null || value === ''
    ? ''
    : String(value).trim().toUpperCase();
}

function _normalizeMonitoringHistoryDate_(value, field) {
  const result = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);

  if (Number.isNaN(result.getTime())) {
    throw new Error(field + ' 값이 유효하지 않습니다.');
  }

  return result;
}

function _buildMonitoringRetentionResult_(
  deletedRows,
  expiredRows,
  excessRows,
  moreRequired
) {
  return {
    deletedRows: deletedRows,
    expiredRows: expiredRows,
    excessRows: excessRows,
    moreRequired: moreRequired,
    maxRows: MonitoringHistoryRepository.MAX_DATA_ROWS,
    retentionDays: MonitoringHistoryRepository.RETENTION_DAYS,
    deleteBatchLimit: MonitoringHistoryRepository.MAX_DELETE_BATCH
  };
}
