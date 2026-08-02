/**
 * @fileoverview HLAS Alert Manager
 * Alert Archive Metadata, Schema Migration 및 Failure Recovery 표준 Module
 */

const AlertManager = {

  STATUSES: {
    OPEN: 'OPEN',
    ACKNOWLEDGED: 'ACKNOWLEDGED',
    RESOLVED: 'RESOLVED'
  },

  LEVELS: {
    INFO: 'INFO',
    WARN: 'WARN',
    CRITICAL: 'CRITICAL'
  },

  HISTORY_EVENTS: {
    CREATED: 'CREATED',
    STATE_CHANGED: 'STATE_CHANGED'
  },

  SCHEMAS: {
    ALERT: {
      VERSION: 'V1',
      PROPERTY_KEY: 'HLAS:ALERT:SCHEMA_VERSION',
      MIGRATION_KEY: 'HLAS:ALERT:MIGRATION_STATUS',
      HEADERS: [
        'TIME',
        'CODE',
        'LEVEL',
        'MESSAGE',
        'STATUS',
        'ALERT_ID',
        'UPDATED_AT'
      ],
      CONSUMER_PREFIX_LENGTH: 5
    },
    HISTORY: {
      VERSION: 'V1',
      PROPERTY_KEY: 'HLAS:ALERT_HISTORY:SCHEMA_VERSION',
      MIGRATION_KEY: 'HLAS:ALERT_HISTORY:MIGRATION_STATUS',
      HEADERS: [
        'TIME',
        'ALERT_ID',
        'CODE',
        'EVENT',
        'PREVIOUS_STATUS',
        'NEW_STATUS',
        'NOTE'
      ],
      CONSUMER_PREFIX_LENGTH: 7
    },
    ARCHIVE: {
      VERSION: 'V1',
      PROPERTY_KEY: 'HLAS:ALERT_HISTORY_ARCHIVE:SCHEMA_VERSION',
      MIGRATION_KEY: 'HLAS:ALERT_HISTORY_ARCHIVE:MIGRATION_STATUS',
      HEADERS: [
        'TIME',
        'ALERT_ID',
        'CODE',
        'EVENT',
        'PREVIOUS_STATUS',
        'NEW_STATUS',
        'NOTE'
      ],
      CONSUMER_PREFIX_LENGTH: 7
    },
    ARCHIVE_METADATA: {
      VERSION: 'V1',
      PROPERTY_KEY: 'HLAS:ALERT_ARCHIVE_METADATA:SCHEMA_VERSION',
      MIGRATION_KEY: 'HLAS:ALERT_ARCHIVE_METADATA:MIGRATION_STATUS',
      HEADERS: [
        'RUN_ID',
        'STARTED_AT',
        'COMPLETED_AT',
        'POLICY_VERSION',
        'SOURCE_SCHEMA_VERSION',
        'TARGET_SCHEMA_VERSION',
        'ARCHIVED_ROWS',
        'STATUS',
        'ERROR',
        'RECOVERY_STATUS'
      ],
      CONSUMER_PREFIX_LENGTH: 10
    }
  },

  MIGRATION_POLICY: {
    VERSION: 'V1',
    BATCH_SIZE: 200,
    LARGE_ROW_THRESHOLD: 5000,
    LARGE_BATCH_SIZE: 500,
    MAX_ROWS_PER_RUN: 50000,
    MAX_EXECUTION_MS: 240000,
    STATUS_UPDATE_BATCH_INTERVAL: 10,
    STATUSES: {
      CURRENT: 'CURRENT',
      STARTED: 'STARTED',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      ROLLED_BACK: 'ROLLED_BACK'
    }
  },

  ARCHIVE_POLICY: {
    VERSION: 'V1',
    PROPERTY_KEY: 'HLAS:ALERT_HISTORY:ARCHIVE_POLICY:V1',
    MAX_ACTIVE_ROWS: 5000,
    RETENTION_DAYS: 365,
    BATCH_SIZE: 250
  },

  ARCHIVE_METADATA_POLICY: {
    VERSION: 'V1',
    PROPERTY_KEY: 'HLAS:ALERT_ARCHIVE_METADATA:POLICY:V1',
    RETENTION_DAYS: 730,
    MAX_ROWS: 10000,
    CLEANUP_BATCH_SIZE: 250,
    PRESERVE_STATUSES: ['STARTED']
  },

  BACKUP_RETENTION_POLICY: {
    VERSION: 'V1',
    PROPERTY_KEY: 'HLAS:ALERT_MIGRATION_BACKUP:POLICY:V1',
    INDEX_KEY: 'HLAS:ALERT_MIGRATION_BACKUP:INDEX:V1',
    RETENTION_DAYS: 30,
    MAX_BACKUPS_PER_SOURCE: 5,
    MAX_INDEX_ENTRIES: 40,
    AUTO_DELETE: false,
    VALIDATION_BATCH_SIZE: 200
  },

  SCHEMA_MIGRATION_STRATEGY: {
    VERSION: 'V1',
    PROPERTY_KEY: 'HLAS:ALERT_SCHEMA_MIGRATION:STRATEGY:V1',
    CURRENT_VERSION: 'V1',
    FUTURE_VERSION: 'V2',
    FUTURE_STATUS: 'DESIGN_ONLY',
    SUPPORTED_PATHS: ['V0->V1'],
    V2_PRINCIPLES: [
      'ADDITIVE_FIRST',
      'LEGACY_PREFIX_PRESERVED',
      'EXPLICIT_ADAPTER_REQUIRED',
      'ROLLBACK_REQUIRED'
    ]
  },

  _schemaRegistrationCache: {},

  createAlert: function(code, level, message) {
    const context = 'AlertManager.createAlert';
    const metricStartedAt = Date.now();

    try {
      const normalized = this._normalizeAlertInput(
        code,
        level,
        message
      );
      const sheet = _getAlertSheet();
      const now = new Date();
      const alertId = this._createAlertId(now);

      sheet.appendRow([
        now,
        normalized.code,
        normalized.level,
        normalized.message,
        this.STATUSES.OPEN,
        alertId,
        now
      ]);

      this._appendHistory({
        time: now,
        alertId: alertId,
        code: normalized.code,
        event: this.HISTORY_EVENTS.CREATED,
        previousStatus: '',
        newStatus: this.STATUSES.OPEN,
        note: this._resolveAlertSource(normalized.code)
      });
      this._writeAlertLog(
        normalized.code,
        normalized.level,
        `CREATED id=${alertId} ${normalized.message}`
      );
      _recordAlertMetricSafely('ALERT_CREATED', {
        alertId: alertId,
        code: normalized.code,
        status: this.STATUSES.OPEN,
        durationMs: Date.now() - metricStartedAt,
        context: context
      });

      return true;
    } catch (error) {
      _recordAlertMetricSafely('OPERATION_FAILED', {
        code: code,
        durationMs: Date.now() - metricStartedAt,
        context: `${context}:${error.message}`
      });
      this._handleError(error, context);
      throw error;
    }
  },

  getAlerts: function() {
    const context = 'AlertManager.getAlerts';

    try {
      const sheet = _getAlertSheet();
      const values = sheet.getDataRange().getValues();
      const result = [];

      for (let i = 1; i < values.length; i++) {
        if (!this._hasAlertData(values[i])) {
          continue;
        }

        result.push(this._mapAlertRow(values[i], i + 1));
      }

      return result;
    } catch (error) {
      this._handleError(error, context);
      throw error;
    }
  },

  updateAlertState: function(alertId, newStatus, note) {
    const context = 'AlertManager.updateAlertState';
    const metricStartedAt = Date.now();

    try {
      const normalizedId = String(alertId || '').trim();
      const normalizedStatus = this._normalizeStatus(newStatus);

      if (!normalizedId) {
        throw new Error('Alert ID가 필요합니다.');
      }

      const sheet = _getAlertSheet();
      const values = sheet.getDataRange().getValues();
      const rowIndex = this._findAlertRowIndex(
        values,
        normalizedId
      );

      if (rowIndex < 1) {
        throw new Error(`Alert를 찾을 수 없습니다: ${normalizedId}`);
      }

      const rowNumber = rowIndex + 1;
      const row = values[rowIndex];
      const code = String(row[1] || '').trim();
      const previousStatus = this._normalizeStatus(
        row[4] || this.STATUSES.OPEN
      );
      const persistedId = String(row[5] || '').trim() ||
        normalizedId;

      this._validateTransition(previousStatus, normalizedStatus);

      if (previousStatus === normalizedStatus) {
        _recordAlertMetricSafely('STATE_CHANGED', {
          alertId: persistedId,
          code: code,
          status: normalizedStatus,
          durationMs: Date.now() - metricStartedAt,
          context: `${context}:NO_CHANGE`
        });
        return this.getAlertState(persistedId);
      }

      const now = new Date();
      sheet.getRange(rowNumber, 5, 1, 3).setValues([[
        normalizedStatus,
        persistedId,
        now
      ]]);

      this._appendHistory({
        time: now,
        alertId: persistedId,
        code: code,
        event: this.HISTORY_EVENTS.STATE_CHANGED,
        previousStatus: previousStatus,
        newStatus: normalizedStatus,
        note: String(note || '')
      });
      this._writeAlertLog(
        code,
        normalizedStatus === this.STATUSES.RESOLVED
          ? this.LEVELS.INFO
          : this.LEVELS.WARN,
        [
          'STATE_CHANGED',
          `id=${persistedId}`,
          `${previousStatus}->${normalizedStatus}`,
          String(note || '')
        ].join(' ').trim()
      );
      _recordAlertMetricSafely('STATE_CHANGED', {
        alertId: persistedId,
        code: code,
        status: normalizedStatus,
        durationMs: Date.now() - metricStartedAt,
        context: context
      });

      return this.getAlertState(persistedId);
    } catch (error) {
      _recordAlertMetricSafely('OPERATION_FAILED', {
        alertId: alertId,
        status: newStatus,
        durationMs: Date.now() - metricStartedAt,
        context: `${context}:${error.message}`
      });
      this._handleError(error, context);
      throw error;
    }
  },

  getAlertState: function(alertId) {
    const normalizedId = String(alertId || '').trim();

    if (!normalizedId) {
      return null;
    }

    const alerts = this.getAlerts();

    for (let i = 0; i < alerts.length; i++) {
      if (alerts[i].id === normalizedId) {
        return alerts[i];
      }
    }

    return null;
  },

  getAlertHistory: function(alertId) {
    const context = 'AlertManager.getAlertHistory';

    try {
      const normalizedId = String(alertId || '').trim();
      const sheet = _getAlertHistorySheet();
      const values = sheet.getDataRange().getValues();
      const result = [];

      for (let i = 1; i < values.length; i++) {
        if (!values[i][1]) {
          continue;
        }

        if (
          normalizedId &&
          String(values[i][1]) !== normalizedId
        ) {
          continue;
        }

        result.push({
          time: values[i][0],
          alertId: values[i][1],
          code: values[i][2],
          event: values[i][3],
          previousStatus: values[i][4],
          newStatus: values[i][5],
          note: values[i][6]
        });
      }

      return result;
    } catch (error) {
      this._handleError(error, context);
      throw error;
    }
  },

  getAlertSummary: function() {
    const alerts = this.getAlerts();
    const summary = {
      TOTAL_COUNT: alerts.length,
      OPEN_COUNT: 0,
      ACKNOWLEDGED_COUNT: 0,
      RESOLVED_COUNT: 0,
      CRITICAL_COUNT: 0,
      WARN_COUNT: 0,
      LAST_CODE: '',
      LAST_LEVEL: '',
      LAST_STATUS: ''
    };

    alerts.forEach(function(alert) {
      const status = String(alert.status || '').toUpperCase();
      const level = String(alert.level || '').toUpperCase();

      if (status === 'OPEN') {
        summary.OPEN_COUNT++;
      } else if (status === 'ACKNOWLEDGED') {
        summary.ACKNOWLEDGED_COUNT++;
      } else if (status === 'RESOLVED') {
        summary.RESOLVED_COUNT++;
      }

      if (level === 'CRITICAL') {
        summary.CRITICAL_COUNT++;
      } else if (level === 'WARN') {
        summary.WARN_COUNT++;
      }
    });

    if (alerts.length > 0) {
      const last = alerts[alerts.length - 1];
      summary.LAST_CODE = last.code;
      summary.LAST_LEVEL = last.level;
      summary.LAST_STATUS = last.status;
    }

    return summary;
  },

  checkInventoryAlert: function() {
    if (
      typeof InventoryAnalyticsManager === 'undefined' ||
      typeof InventoryAnalyticsManager.getShortageItems !== 'function'
    ) {
      return false;
    }

    const shortage = InventoryAnalyticsManager.getShortageItems();

    if (shortage.length > 0) {
      this.createAlert(
        'STOCK_SHORTAGE',
        this.LEVELS.WARN,
        `부족 재고 ${shortage.length}건`
      );
      return true;
    }

    return false;
  },

  checkSystemAlert: function() {
    if (typeof CacheMonitoringManager === 'undefined') {
      return true;
    }

    const manager = this;
    const alerts = CacheMonitoringManager.getAlertCandidates();

    alerts.forEach(function(alert) {
      if (!CacheMonitoringManager.shouldTrigger(alert)) {
        return;
      }

      manager.createAlert(
        alert.code,
        alert.level,
        alert.message
      );
      CacheMonitoringManager.markTriggered(alert);
    });

    return true;
  },

  checkOperationalAlert: function() {
    this.checkInventoryAlert();
    this.checkSystemAlert();
    return true;
  },

  _normalizeAlertInput: function(code, level, message) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const normalizedLevel = String(level || this.LEVELS.WARN)
      .trim()
      .toUpperCase();
    const normalizedMessage = String(message || '').trim();

    if (!normalizedCode) {
      throw new Error('Alert Code가 필요합니다.');
    }

    if (!normalizedMessage) {
      throw new Error('Alert Message가 필요합니다.');
    }

    if (
      [
        this.LEVELS.INFO,
        this.LEVELS.WARN,
        this.LEVELS.CRITICAL
      ].indexOf(normalizedLevel) < 0
    ) {
      throw new Error(`지원하지 않는 Alert Level: ${normalizedLevel}`);
    }

    return {
      code: normalizedCode,
      level: normalizedLevel,
      message: normalizedMessage
    };
  },

  _normalizeStatus: function(status) {
    const normalized = String(status || '').trim().toUpperCase();

    if (
      Object.keys(this.STATUSES).map(function(key) {
        return AlertManager.STATUSES[key];
      }).indexOf(normalized) < 0
    ) {
      throw new Error(`지원하지 않는 Alert Status: ${normalized}`);
    }

    return normalized;
  },

  _validateTransition: function(previousStatus, newStatus) {
    const transitions = {
      OPEN: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'],
      ACKNOWLEDGED: ['ACKNOWLEDGED', 'OPEN', 'RESOLVED'],
      RESOLVED: ['RESOLVED', 'OPEN']
    };

    if (
      !transitions[previousStatus] ||
      transitions[previousStatus].indexOf(newStatus) < 0
    ) {
      throw new Error(
        `허용되지 않는 Alert 상태 변경: ${previousStatus}->${newStatus}`
      );
    }
  },

  _findAlertRowIndex: function(values, alertId) {
    for (let i = 1; i < values.length; i++) {
      const persistedId = String(values[i][5] || '').trim();
      const legacyId = `ALERT-${i + 1}`;

      if (persistedId === alertId || legacyId === alertId) {
        return i;
      }
    }

    return -1;
  },

  _mapAlertRow: function(row, rowNumber) {
    return {
      time: row[0],
      code: row[1],
      level: row[2],
      message: row[3],
      status: row[4] || this.STATUSES.OPEN,
      id: String(row[5] || '').trim() || `ALERT-${rowNumber}`,
      updatedAt: row[6] || row[0],
      rowNumber: rowNumber
    };
  },

  _hasAlertData: function(row) {
    return Boolean(row[0] || row[1] || row[2] || row[3] || row[4]);
  },

  _createAlertId: function(now) {
    const time = now instanceof Date ? now.getTime() : Date.now();
    const uuid = typeof Utilities !== 'undefined' &&
      typeof Utilities.getUuid === 'function'
      ? Utilities.getUuid().replace(/-/g, '').slice(0, 12)
      : String(Math.floor(Math.random() * 1000000000000));

    return `ALT-${time}-${uuid}`;
  },

  _resolveAlertSource: function(code) {
    return String(code || '').indexOf('CACHE_') === 0
      ? 'SOURCE=CACHE_MONITORING'
      : 'SOURCE=OPERATIONAL';
  },

  _appendHistory: function(history) {
    const metricStartedAt = Date.now();
    const sheet = _getAlertHistorySheet();

    const normalized = this._normalizeHistory(history);

    sheet.appendRow([
      normalized.time,
      normalized.alertId,
      normalized.code,
      normalized.event,
      normalized.previousStatus,
      normalized.newStatus,
      normalized.note
    ]);

    _applyAlertHistoryArchivePolicy(sheet, new Date());
    _recordAlertMetricSafely('HISTORY_APPENDED', {
      alertId: normalized.alertId,
      code: normalized.code,
      status: normalized.newStatus,
      durationMs: Date.now() - metricStartedAt,
      context: normalized.event
    });
  },

  _normalizeHistory: function(history) {
    const source = history || {};
    const event = String(source.event || '').trim().toUpperCase();
    const alertId = String(source.alertId || '').trim();
    const code = String(source.code || '').trim().toUpperCase();
    const newStatus = String(source.newStatus || '')
      .trim()
      .toUpperCase();
    const previousStatus = String(source.previousStatus || '')
      .trim()
      .toUpperCase();

    if (!alertId || !code) {
      throw new Error('History Alert ID와 Code가 필요합니다.');
    }

    if (
      [
        this.HISTORY_EVENTS.CREATED,
        this.HISTORY_EVENTS.STATE_CHANGED
      ].indexOf(event) < 0
    ) {
      throw new Error(`지원하지 않는 History Event: ${event}`);
    }

    this._normalizeStatus(newStatus);

    if (
      event === this.HISTORY_EVENTS.STATE_CHANGED &&
      !previousStatus
    ) {
      throw new Error('State History의 이전 상태가 필요합니다.');
    }

    if (previousStatus) {
      this._normalizeStatus(previousStatus);
    }

    return {
      time: source.time instanceof Date
        ? source.time
        : new Date(source.time || Date.now()),
      alertId: alertId,
      code: code,
      event: event,
      previousStatus: previousStatus,
      newStatus: newStatus,
      note: String(source.note || '').slice(0, 500)
    };
  },

  _writeAlertLog: function(code, level, message) {
    const normalizedLevel = String(level || this.LEVELS.WARN)
      .toUpperCase();
    const logMessage = `${code} ${message}`;

    try {
      if (
        normalizedLevel === this.LEVELS.CRITICAL &&
        typeof writeError === 'function'
      ) {
        writeError('AlertManager', logMessage);
        return;
      }

      if (
        normalizedLevel === this.LEVELS.INFO &&
        typeof writeInfo === 'function'
      ) {
        writeInfo('AlertManager', logMessage);
        return;
      }

      if (typeof writeWarn === 'function') {
        writeWarn('AlertManager', logMessage);
        return;
      }

      Logger.log(`[AlertManager] ${normalizedLevel} ${logMessage}`);
    } catch (error) {
      this._handleError(error, 'AlertManager._writeAlertLog');
    }
  },

  _handleError: function(error, context) {
    try {
      if (
        typeof ErrorHandler !== 'undefined' &&
        typeof ErrorHandler.handle === 'function'
      ) {
        ErrorHandler.handle(error, context);
        return;
      }
    } catch (handlerError) {
      Logger.log(
        `[AlertManager] ErrorHandler 오류: ${handlerError.message}`
      );
    }

    Logger.log(`[AlertManager] ${context}: ${error.message}`);
  }
};

function _getAlertSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ALERT');

  if (!sheet) {
    sheet = ss.insertSheet('ALERT');
  }

  _ensureAlertSheetHeader(sheet);
  return sheet;
}

function _ensureAlertSheetHeader(sheet) {
  _ensureAlertSchemaHeader(sheet, AlertManager.SCHEMAS.ALERT);
}

function _getAlertHistorySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ALERT_HISTORY');

  if (!sheet) {
    sheet = ss.insertSheet('ALERT_HISTORY');
  }

  _ensureAlertHistoryHeader(sheet);
  return sheet;
}

function _ensureAlertHistoryHeader(sheet) {
  _ensureAlertSchemaHeader(sheet, AlertManager.SCHEMAS.HISTORY);
  _registerAlertArchivePolicy();
  _registerAlertConditionalPolicies();
}

function _getAlertHistoryArchiveSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ALERT_HISTORY_ARCHIVE');

  if (!sheet) {
    sheet = ss.insertSheet('ALERT_HISTORY_ARCHIVE');
  }

  _ensureAlertSchemaHeader(sheet, AlertManager.SCHEMAS.ARCHIVE);
  return sheet;
}

function _getAlertArchiveMetadataSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ALERT_ARCHIVE_METADATA');

  if (!sheet) {
    sheet = ss.insertSheet('ALERT_ARCHIVE_METADATA');
  }

  _ensureAlertSchemaHeader(
    sheet,
    AlertManager.SCHEMAS.ARCHIVE_METADATA
  );
  return sheet;
}

function _ensureAlertSchemaHeader(sheet, schema, options) {
  const headers = schema.HEADERS;

  _registerAlertConditionalPolicies();

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    _registerAlertSchemaVersion(schema);
    _ensureCurrentMigrationStatus(schema);
    return;
  }

  const current = sheet
    .getRange(1, 1, 1, headers.length)
    .getValues()[0];
  const detected = _detectAlertSchemaVersion(current, schema);

  if (detected === schema.VERSION) {
    _registerAlertSchemaVersion(schema);
    _ensureCurrentMigrationStatus(schema);
    return;
  }

  if (detected === 'V0') {
    _migrateAlertSchemaToV1(sheet, schema, options);
    return;
  }

  throw new Error(
    `호환되지 않는 ${sheet.getName()} Schema version=${detected}`
  );
}

function _detectAlertSchemaVersion(current, schema) {
  const headers = schema.HEADERS;
  let exact = true;

  for (let i = 0; i < headers.length; i++) {
    if (String(current[i] || '').trim() !== headers[i]) {
      exact = false;
      break;
    }
  }

  if (exact) {
    return schema.VERSION;
  }

  const legacyLength = schema.CONSUMER_PREFIX_LENGTH < headers.length
    ? schema.CONSUMER_PREFIX_LENGTH
    : headers.length - 1;
  let legacyCompatible = true;

  for (let i = 0; i < legacyLength; i++) {
    if (String(current[i] || '').trim() !== headers[i]) {
      legacyCompatible = false;
      break;
    }
  }

  if (legacyCompatible) {
    for (let i = legacyLength; i < headers.length; i++) {
      if (String(current[i] || '').trim()) {
        legacyCompatible = false;
        break;
      }
    }
  }

  return legacyCompatible ? 'V0' : 'INCOMPATIBLE';
}

function _migrateAlertSchemaToV1(sheet, schema, options) {
  const settings = options || {};
  const runId = settings.runId || _createAlertOperationId('MIG');
  const properties = PropertiesService.getScriptProperties();
  const previousVersion = properties.getProperty(schema.PROPERTY_KEY);
  const dataRows = Math.max(sheet.getLastRow() - 1, 0);
  const migrationControl = _resolveAlertMigrationControl(
    dataRows,
    settings
  );

  _assertAlertMigrationPath('V0', schema.VERSION);

  const snapshot = sheet.getDataRange().getValues();
  const backupSheet = settings.backupSheet ||
    _createAlertMigrationBackupSheet(sheet, runId, snapshot);
  const startedAt = new Date();

  if (settings.backupSheet) {
    _writeAlertMigrationBackup(backupSheet, snapshot);
  }

  let backupValidation;

  try {
    backupValidation = _validateAlertMigrationBackup(
      backupSheet,
      snapshot,
      settings.validationBatchSize
    );

    if (!backupValidation.valid) {
      throw new Error(
        `Migration Backup Validation 실패: ${backupValidation.error}`
      );
    }

    _recordAlertMigrationBackup(
      sheet,
      backupSheet,
      runId,
      backupValidation,
      startedAt
    );
  } catch (backupError) {
    _writeAlertMigrationStatus(schema, {
      migrationId: runId,
      fromVersion: 'V0',
      toVersion: schema.VERSION,
      status: AlertManager.MIGRATION_POLICY.STATUSES.FAILED,
      startedAt: startedAt,
      completedAt: new Date(),
      migratedRows: 0,
      backupSheet: backupSheet.getName(),
      error: backupError.message,
      recoveryStatus: 'SOURCE_UNCHANGED',
      backupValidated: false,
      batchSize: migrationControl.batchSize,
      totalBatches: migrationControl.totalBatches,
      largeMigration: migrationControl.largeMigration,
      strategyVersion: AlertManager.SCHEMA_MIGRATION_STRATEGY.VERSION
    });
    AlertManager._handleError(
      backupError,
      'AlertManager.BackupValidation'
    );
    throw backupError;
  }

  _writeAlertMigrationStatus(schema, {
    migrationId: runId,
    fromVersion: 'V0',
    toVersion: schema.VERSION,
    status: AlertManager.MIGRATION_POLICY.STATUSES.STARTED,
    startedAt: startedAt,
    completedAt: '',
    migratedRows: 0,
    backupSheet: backupSheet.getName(),
    error: '',
    recoveryStatus: 'BACKUP_VALIDATED',
    backupValidated: true,
    batchSize: migrationControl.batchSize,
    totalBatches: migrationControl.totalBatches,
    largeMigration: migrationControl.largeMigration,
    strategyVersion: AlertManager.SCHEMA_MIGRATION_STRATEGY.VERSION
  });

  try {
    sheet.getRange(1, 1, 1, schema.HEADERS.length)
      .setValues([schema.HEADERS]);

    if (settings.injectFailureAfterHeader) {
      throw new Error('HLAS-0047 MIGRATION_INJECTED_FAILURE');
    }

    const migratedRows = _backfillAlertMigrationRows(
      sheet,
      schema,
      Object.assign({}, settings, {
        batchSize: migrationControl.batchSize,
        maxExecutionMs: migrationControl.maxExecutionMs,
        migrationStartedAtMs: startedAt.getTime(),
        migrationId: runId,
        backupSheetName: backupSheet.getName()
      })
    );

    if (settings.injectFailureAfterBackfill) {
      throw new Error('HLAS-0047 BACKFILL_INJECTED_FAILURE');
    }

    delete AlertManager._schemaRegistrationCache[schema.PROPERTY_KEY];
    _registerAlertSchemaVersion(schema);
    _writeAlertMigrationStatus(schema, {
      migrationId: runId,
      fromVersion: 'V0',
      toVersion: schema.VERSION,
      status: AlertManager.MIGRATION_POLICY.STATUSES.COMPLETED,
      startedAt: startedAt,
      completedAt: new Date(),
      migratedRows: migratedRows,
      backupSheet: backupSheet.getName(),
      error: '',
      recoveryStatus: 'BACKUP_RETAINED',
      backupValidated: true,
      batchSize: migrationControl.batchSize,
      totalBatches: migrationControl.totalBatches,
      largeMigration: migrationControl.largeMigration,
      strategyVersion: AlertManager.SCHEMA_MIGRATION_STRATEGY.VERSION
    });

    _evaluateAlertMigrationBackupRetention(
      sheet.getParent(),
      sheet.getName(),
      startedAt
    );

    AlertManager._writeAlertLog(
      'ALERT_SCHEMA',
      AlertManager.LEVELS.INFO,
      `MIGRATION_COMPLETED id=${runId} rows=${migratedRows}`
    );

    return {
      migrationId: runId,
      status: 'COMPLETED',
      migratedRows: migratedRows,
      backupSheet: backupSheet.getName()
    };
  } catch (error) {
    _restoreAlertMigrationSnapshot(sheet, snapshot);

    if (previousVersion === null) {
      properties.deleteProperty(schema.PROPERTY_KEY);
    } else {
      properties.setProperty(schema.PROPERTY_KEY, previousVersion);
    }

    delete AlertManager._schemaRegistrationCache[schema.PROPERTY_KEY];
    _writeAlertMigrationStatus(schema, {
      migrationId: runId,
      fromVersion: 'V0',
      toVersion: schema.VERSION,
      status: AlertManager.MIGRATION_POLICY.STATUSES.ROLLED_BACK,
      startedAt: startedAt,
      completedAt: new Date(),
      migratedRows: Number(error.migratedRows || 0),
      backupSheet: backupSheet.getName(),
      error: error.message,
      recoveryStatus: 'SOURCE_RESTORED',
      backupValidated: Boolean(backupValidation && backupValidation.valid),
      batchSize: migrationControl.batchSize,
      totalBatches: migrationControl.totalBatches,
      largeMigration: migrationControl.largeMigration,
      strategyVersion: AlertManager.SCHEMA_MIGRATION_STRATEGY.VERSION
    });

    _evaluateAlertMigrationBackupRetention(
      sheet.getParent(),
      sheet.getName(),
      startedAt
    );

    AlertManager._handleError(
      error,
      'AlertManager.SchemaMigration'
    );
    throw error;
  }
}

function _backfillAlertMigrationRows(sheet, schema, options) {
  const dataRows = Math.max(sheet.getLastRow() - 1, 0);

  if (
    dataRows === 0 ||
    schema.CONSUMER_PREFIX_LENGTH !== 5
  ) {
    return dataRows;
  }

  const settings = options || {};
  const batchSize = Number(settings.batchSize) ||
    AlertManager.MIGRATION_POLICY.BATCH_SIZE;
  const maxExecutionMs = Number(settings.maxExecutionMs) ||
    AlertManager.MIGRATION_POLICY.MAX_EXECUTION_MS;
  const migrationStartedAtMs = Number(settings.migrationStartedAtMs) ||
    Date.now();
  const statusInterval =
    AlertManager.MIGRATION_POLICY.STATUS_UPDATE_BATCH_INTERVAL;
  let migratedRows = 0;
  let batchCount = 0;

  for (let offset = 0; offset < dataRows; offset += batchSize) {
    if (Date.now() - migrationStartedAtMs >= maxExecutionMs) {
      const timeoutError = new Error(
        `Migration 실행 시간 예산 초과: ${maxExecutionMs}ms`
      );
      timeoutError.migratedRows = migratedRows;
      timeoutError.batchCount = batchCount;
      throw timeoutError;
    }

    const size = Math.min(batchSize, dataRows - offset);
    const source = sheet.getRange(2 + offset, 1, size, 7).getValues();
    const values = source.map(function(row) {
      const eventTime = row[0] instanceof Date ? row[0] : new Date();

      return [
        String(row[5] || '').trim() ||
          AlertManager._createAlertId(eventTime),
        row[6] || eventTime
      ];
    });

    sheet.getRange(2 + offset, 6, size, 2).setValues(values);
    migratedRows += size;
    batchCount++;

    if (
      settings.migrationId &&
      batchCount % statusInterval === 0
    ) {
      _writeAlertMigrationStatus(schema, {
        migrationId: settings.migrationId,
        fromVersion: 'V0',
        toVersion: schema.VERSION,
        status: AlertManager.MIGRATION_POLICY.STATUSES.STARTED,
        startedAt: new Date(migrationStartedAtMs),
        completedAt: '',
        migratedRows: migratedRows,
        backupSheet: settings.backupSheetName || '',
        error: '',
        recoveryStatus: 'BACKFILL_IN_PROGRESS',
        backupValidated: true,
        batchSize: batchSize,
        totalBatches: Math.ceil(dataRows / batchSize),
        largeMigration: dataRows >=
          AlertManager.MIGRATION_POLICY.LARGE_ROW_THRESHOLD,
        strategyVersion:
          AlertManager.SCHEMA_MIGRATION_STRATEGY.VERSION
      });
    }
  }

  return migratedRows;
}

function _createAlertMigrationBackupSheet(sheet, runId, snapshot) {
  const spreadsheet = sheet.getParent();
  const name = `${sheet.getName()}_MIGRATION_BACKUP_${runId}`
    .slice(0, 99);
  const backup = spreadsheet.insertSheet(name);

  _writeAlertMigrationBackup(backup, snapshot);

  try {
    backup.hideSheet();
  } catch (error) {
    Logger.log(`[AlertManager] Backup Hide 오류: ${error.message}`);
  }

  return backup;
}

function _writeAlertMigrationBackup(backupSheet, snapshot) {
  backupSheet.clearContents();

  if (snapshot.length === 0 || snapshot[0].length === 0) {
    return;
  }

  backupSheet.getRange(
    1,
    1,
    snapshot.length,
    snapshot[0].length
  ).setValues(snapshot);
}

function _restoreAlertMigrationSnapshot(sheet, snapshot) {
  sheet.clearContents();

  if (snapshot.length === 0 || snapshot[0].length === 0) {
    return;
  }

  sheet.getRange(
    1,
    1,
    snapshot.length,
    snapshot[0].length
  ).setValues(snapshot);
}

function _resolveAlertMigrationControl(dataRows, options) {
  const settings = options || {};
  const policy = AlertManager.MIGRATION_POLICY;
  const rows = Math.max(Number(dataRows || 0), 0);

  if (rows > policy.MAX_ROWS_PER_RUN) {
    throw new Error(
      [
        'Large Migration 운영 승인 필요',
        `rows=${rows}`,
        `maxRowsPerRun=${policy.MAX_ROWS_PER_RUN}`
      ].join(' ')
    );
  }

  const largeMigration = rows >= policy.LARGE_ROW_THRESHOLD;
  const requestedBatchSize = Number(settings.batchSize || 0);
  const batchSize = requestedBatchSize > 0
    ? Math.floor(requestedBatchSize)
    : (largeMigration ? policy.LARGE_BATCH_SIZE : policy.BATCH_SIZE);
  const maxExecutionMs = Math.min(
    Math.max(
      Number(settings.maxExecutionMs || policy.MAX_EXECUTION_MS),
      1000
    ),
    policy.MAX_EXECUTION_MS
  );

  return {
    dataRows: rows,
    batchSize: Math.max(batchSize, 1),
    totalBatches: rows === 0 ? 0 : Math.ceil(rows / batchSize),
    largeMigration: largeMigration,
    maxExecutionMs: maxExecutionMs
  };
}

function _assertAlertMigrationPath(fromVersion, toVersion) {
  const path = `${fromVersion}->${toVersion}`;
  const supported = AlertManager
    .SCHEMA_MIGRATION_STRATEGY
    .SUPPORTED_PATHS;

  if (supported.indexOf(path) < 0) {
    throw new Error(`지원되지 않는 Schema Migration path=${path}`);
  }

  return path;
}

function _validateAlertMigrationBackup(
  backupSheet,
  snapshot,
  requestedBatchSize
) {
  const rows = snapshot.length;
  const columns = rows > 0 ? snapshot[0].length : 0;
  const batchSize = Math.max(
    Number(requestedBatchSize ||
      AlertManager.BACKUP_RETENTION_POLICY.VALIDATION_BATCH_SIZE),
    1
  );

  if (rows === 0 || columns === 0) {
    return {
      valid: backupSheet.getLastRow() === 0,
      rows: 0,
      columns: 0,
      error: backupSheet.getLastRow() === 0 ? '' : 'EMPTY_SIZE_MISMATCH'
    };
  }

  if (
    backupSheet.getLastRow() !== rows ||
    backupSheet.getLastColumn() !== columns
  ) {
    return {
      valid: false,
      rows: rows,
      columns: columns,
      error: 'BACKUP_DIMENSION_MISMATCH'
    };
  }

  for (let offset = 0; offset < rows; offset += batchSize) {
    const size = Math.min(batchSize, rows - offset);
    const actual = backupSheet
      .getRange(1 + offset, 1, size, columns)
      .getValues();

    for (let row = 0; row < size; row++) {
      for (let column = 0; column < columns; column++) {
        if (
          _normalizeAlertMigrationCell(actual[row][column]) !==
          _normalizeAlertMigrationCell(snapshot[offset + row][column])
        ) {
          return {
            valid: false,
            rows: rows,
            columns: columns,
            error: `BACKUP_VALUE_MISMATCH:${offset + row + 1}:${column + 1}`
          };
        }
      }
    }
  }

  return {
    valid: true,
    rows: rows,
    columns: columns,
    error: ''
  };
}

function _normalizeAlertMigrationCell(value) {
  if (value instanceof Date) {
    return `DATE:${value.getTime()}`;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return `${typeof value}:${String(value)}`;
}

function _recordAlertMigrationBackup(
  sourceSheet,
  backupSheet,
  runId,
  validation,
  createdAt
) {
  const policy = AlertManager.BACKUP_RETENTION_POLICY;
  const properties = PropertiesService.getScriptProperties();
  let index = [];

  try {
    index = JSON.parse(properties.getProperty(policy.INDEX_KEY) || '[]');
  } catch (error) {
    index = [];
  }

  index.push({
    runId: String(runId),
    sourceSheet: sourceSheet.getName(),
    backupSheet: backupSheet.getName(),
    createdAt: _formatAlertOperationTime(createdAt),
    validated: Boolean(validation.valid),
    rows: Number(validation.rows || 0),
    columns: Number(validation.columns || 0),
    retentionStatus: 'RETAINED'
  });

  properties.setProperty(
    policy.INDEX_KEY,
    JSON.stringify(index.slice(-policy.MAX_INDEX_ENTRIES))
  );
}

function _evaluateAlertMigrationBackupRetention(
  spreadsheet,
  sourceSheetName,
  referenceTime
) {
  const policy = AlertManager.BACKUP_RETENTION_POLICY;
  const properties = PropertiesService.getScriptProperties();
  let index;

  try {
    index = JSON.parse(properties.getProperty(policy.INDEX_KEY) || '[]');
  } catch (error) {
    index = [];
  }

  const now = referenceTime instanceof Date
    ? referenceTime
    : new Date();
  const cutoff = now.getTime() -
    policy.RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const sourceEntries = index
    .filter(function(entry) {
      return entry.sourceSheet === sourceSheetName;
    })
    .sort(function(left, right) {
      return new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime();
    });

  sourceEntries.forEach(function(entry, position) {
    const createdMs = new Date(entry.createdAt).getTime();
    const expired = !isNaN(createdMs) && createdMs < cutoff;
    const exceedsCount = position >= policy.MAX_BACKUPS_PER_SOURCE;

    entry.retentionStatus = expired || exceedsCount
      ? 'ELIGIBLE_FOR_REVIEW'
      : 'RETAINED';
  });

  const byName = {};
  sourceEntries.forEach(function(entry) {
    byName[entry.backupSheet] = entry.retentionStatus;
  });

  index = index.filter(function(entry) {
    return Boolean(spreadsheet.getSheetByName(entry.backupSheet));
  });
  index.forEach(function(entry) {
    if (byName[entry.backupSheet]) {
      entry.retentionStatus = byName[entry.backupSheet];
    }
  });

  properties.setProperty(
    policy.INDEX_KEY,
    JSON.stringify(index.slice(-policy.MAX_INDEX_ENTRIES))
  );

  return {
    retained: sourceEntries.filter(function(entry) {
      return entry.retentionStatus === 'RETAINED';
    }).length,
    eligibleForReview: sourceEntries.filter(function(entry) {
      return entry.retentionStatus === 'ELIGIBLE_FOR_REVIEW';
    }).length,
    autoDelete: policy.AUTO_DELETE
  };
}

function _ensureCurrentMigrationStatus(schema) {
  const properties = PropertiesService.getScriptProperties();

  if (properties.getProperty(schema.MIGRATION_KEY)) {
    return;
  }

  _writeAlertMigrationStatus(schema, {
    migrationId: '',
    fromVersion: schema.VERSION,
    toVersion: schema.VERSION,
    status: AlertManager.MIGRATION_POLICY.STATUSES.CURRENT,
    startedAt: '',
    completedAt: new Date(),
    migratedRows: 0,
    backupSheet: '',
    error: '',
    recoveryStatus: 'NOT_REQUIRED'
  });
}

function _writeAlertMigrationStatus(schema, status) {
  const value = {
    migrationId: String(status.migrationId || ''),
    fromVersion: String(status.fromVersion || ''),
    toVersion: String(status.toVersion || ''),
    status: String(status.status || ''),
    startedAt: _formatAlertOperationTime(status.startedAt),
    completedAt: _formatAlertOperationTime(status.completedAt),
    migratedRows: Number(status.migratedRows || 0),
    backupSheet: String(status.backupSheet || ''),
    error: String(status.error || ''),
    recoveryStatus: String(status.recoveryStatus || ''),
    backupValidated: Boolean(status.backupValidated),
    batchSize: Number(status.batchSize || 0),
    totalBatches: Number(status.totalBatches || 0),
    largeMigration: Boolean(status.largeMigration),
    strategyVersion: String(status.strategyVersion || '')
  };

  PropertiesService
    .getScriptProperties()
    .setProperty(schema.MIGRATION_KEY, JSON.stringify(value));
}

function _registerAlertSchemaVersion(schema) {
  if (AlertManager._schemaRegistrationCache[schema.PROPERTY_KEY]) {
    return;
  }

  const properties = PropertiesService.getScriptProperties();
  const current = properties.getProperty(schema.PROPERTY_KEY);

  if (current !== schema.VERSION) {
    properties.setProperty(schema.PROPERTY_KEY, schema.VERSION);
  }

  AlertManager._schemaRegistrationCache[schema.PROPERTY_KEY] = true;
}

function _registerAlertArchivePolicy() {
  const policy = AlertManager.ARCHIVE_POLICY;

  if (AlertManager._schemaRegistrationCache[policy.PROPERTY_KEY]) {
    return;
  }

  const value = JSON.stringify({
    version: policy.VERSION,
    maxActiveRows: policy.MAX_ACTIVE_ROWS,
    retentionDays: policy.RETENTION_DAYS,
    batchSize: policy.BATCH_SIZE
  });
  const properties = PropertiesService.getScriptProperties();

  if (properties.getProperty(policy.PROPERTY_KEY) !== value) {
    properties.setProperty(policy.PROPERTY_KEY, value);
  }

  AlertManager._schemaRegistrationCache[policy.PROPERTY_KEY] = true;
}

function _registerAlertArchiveMetadataPolicy() {
  const policy = AlertManager.ARCHIVE_METADATA_POLICY;
  _registerAlertInternalPolicy(policy.PROPERTY_KEY, {
    version: policy.VERSION,
    retentionDays: policy.RETENTION_DAYS,
    maxRows: policy.MAX_ROWS,
    cleanupBatchSize: policy.CLEANUP_BATCH_SIZE,
    preserveStatuses: policy.PRESERVE_STATUSES
  });
}

function _registerAlertBackupRetentionPolicy() {
  const policy = AlertManager.BACKUP_RETENTION_POLICY;
  _registerAlertInternalPolicy(policy.PROPERTY_KEY, {
    version: policy.VERSION,
    retentionDays: policy.RETENTION_DAYS,
    maxBackupsPerSource: policy.MAX_BACKUPS_PER_SOURCE,
    maxIndexEntries: policy.MAX_INDEX_ENTRIES,
    autoDelete: policy.AUTO_DELETE,
    validationBatchSize: policy.VALIDATION_BATCH_SIZE
  });
}

function _registerAlertSchemaMigrationStrategy() {
  const strategy = AlertManager.SCHEMA_MIGRATION_STRATEGY;
  _registerAlertInternalPolicy(strategy.PROPERTY_KEY, {
    version: strategy.VERSION,
    currentVersion: strategy.CURRENT_VERSION,
    futureVersion: strategy.FUTURE_VERSION,
    futureStatus: strategy.FUTURE_STATUS,
    supportedPaths: strategy.SUPPORTED_PATHS,
    v2Principles: strategy.V2_PRINCIPLES
  });
}

function _registerAlertConditionalPolicies() {
  const cacheKey = 'HLAS:ALERT:CONDITIONAL_POLICIES_REGISTERED';

  if (AlertManager._schemaRegistrationCache[cacheKey]) {
    return;
  }

  const metadata = AlertManager.ARCHIVE_METADATA_POLICY;
  const backup = AlertManager.BACKUP_RETENTION_POLICY;
  const strategy = AlertManager.SCHEMA_MIGRATION_STRATEGY;
  const expected = {};

  expected[metadata.PROPERTY_KEY] = JSON.stringify({
    version: metadata.VERSION,
    retentionDays: metadata.RETENTION_DAYS,
    maxRows: metadata.MAX_ROWS,
    cleanupBatchSize: metadata.CLEANUP_BATCH_SIZE,
    preserveStatuses: metadata.PRESERVE_STATUSES
  });
  expected[backup.PROPERTY_KEY] = JSON.stringify({
    version: backup.VERSION,
    retentionDays: backup.RETENTION_DAYS,
    maxBackupsPerSource: backup.MAX_BACKUPS_PER_SOURCE,
    maxIndexEntries: backup.MAX_INDEX_ENTRIES,
    autoDelete: backup.AUTO_DELETE,
    validationBatchSize: backup.VALIDATION_BATCH_SIZE
  });
  expected[strategy.PROPERTY_KEY] = JSON.stringify({
    version: strategy.VERSION,
    currentVersion: strategy.CURRENT_VERSION,
    futureVersion: strategy.FUTURE_VERSION,
    futureStatus: strategy.FUTURE_STATUS,
    supportedPaths: strategy.SUPPORTED_PATHS,
    v2Principles: strategy.V2_PRINCIPLES
  });

  const properties = PropertiesService.getScriptProperties();
  const current = properties.getProperties();
  const updates = {};

  Object.keys(expected).forEach(function(key) {
    if (current[key] !== expected[key]) {
      updates[key] = expected[key];
    }
    AlertManager._schemaRegistrationCache[key] = true;
  });

  if (Object.keys(updates).length > 0) {
    properties.setProperties(updates, false);
  }

  AlertManager._schemaRegistrationCache[cacheKey] = true;
}

function _registerAlertInternalPolicy(propertyKey, value) {
  if (AlertManager._schemaRegistrationCache[propertyKey]) {
    return;
  }

  const properties = PropertiesService.getScriptProperties();
  const serialized = JSON.stringify(value);

  if (properties.getProperty(propertyKey) !== serialized) {
    properties.setProperty(propertyKey, serialized);
  }

  AlertManager._schemaRegistrationCache[propertyKey] = true;
}

function _maintainAlertArchiveMetadata(sheet, referenceTime, overrides) {
  const standard = AlertManager.ARCHIVE_METADATA_POLICY;
  const settings = overrides || {};
  const policy = {
    retentionDays: settings.RETENTION_DAYS !== undefined
      ? Math.max(Number(settings.RETENTION_DAYS), 0)
      : standard.RETENTION_DAYS,
    maxRows: settings.MAX_ROWS !== undefined
      ? Math.max(Number(settings.MAX_ROWS), 1)
      : standard.MAX_ROWS,
    cleanupBatchSize: settings.CLEANUP_BATCH_SIZE !== undefined
      ? Math.max(Number(settings.CLEANUP_BATCH_SIZE), 1)
      : standard.CLEANUP_BATCH_SIZE
  };
  const dataRows = Math.max(sheet.getLastRow() - 1, 0);

  if (dataRows === 0) {
    return {deletedRows: 0, activeRows: 0};
  }

  const now = referenceTime instanceof Date
    ? referenceTime
    : new Date();
  const cutoff = now.getTime() -
    policy.retentionDays * 24 * 60 * 60 * 1000;
  const values = sheet.getRange(2, 1, dataRows, 10).getValues();
  const candidates = [];

  for (let i = 0; i < values.length; i++) {
    const status = String(values[i][7] || '').trim();

    if (standard.PRESERVE_STATUSES.indexOf(status) >= 0) {
      continue;
    }

    const completed = values[i][2] instanceof Date
      ? values[i][2].getTime()
      : new Date(values[i][2]).getTime();
    const expired = !isNaN(completed) && completed < cutoff;
    const exceedsMaxRows = dataRows - candidates.length > policy.maxRows;

    if (expired || exceedsMaxRows) {
      candidates.push(i + 2);
    }

    if (candidates.length >= policy.cleanupBatchSize) {
      break;
    }
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    sheet.deleteRow(candidates[i]);
  }

  return {
    deletedRows: candidates.length,
    activeRows: dataRows - candidates.length
  };
}

function _applyAlertHistoryArchivePolicy(
  historySheet,
  now,
  overrides,
  archiveSheet,
  metadataSheet,
  options
) {
  const policy = _mergeAlertArchivePolicy(overrides);
  const settings = options || {};
  const dataRowCount = Math.max(historySheet.getLastRow() - 1, 0);
  const result = {
    runId: '',
    version: policy.VERSION,
    activeRowsBefore: dataRowCount,
    archivedRows: 0,
    activeRowsAfter: dataRowCount,
    status: 'SKIPPED',
    recoveryStatus: 'NOT_REQUIRED'
  };

  if (dataRowCount === 0) {
    return result;
  }

  let archiveCount = Math.max(
    dataRowCount - policy.MAX_ACTIVE_ROWS,
    0
  );
  const referenceTime = now instanceof Date ? now : new Date();
  const cutoff = referenceTime.getTime() -
    policy.RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const scanCount = Math.min(dataRowCount, policy.BATCH_SIZE);
  const oldestTime = historySheet.getRange(2, 1).getValue();

  if (
    oldestTime instanceof Date &&
    oldestTime.getTime() < cutoff
  ) {
    const timeValues = historySheet
      .getRange(2, 1, scanCount, 1)
      .getValues();
    let expiredCount = 0;

    for (let i = 0; i < timeValues.length; i++) {
      const value = timeValues[i][0];

      if (!(value instanceof Date) || value.getTime() >= cutoff) {
        break;
      }

      expiredCount++;
    }

    archiveCount = Math.max(archiveCount, expiredCount);
  }

  archiveCount = Math.min(
    archiveCount,
    policy.BATCH_SIZE,
    dataRowCount
  );

  if (archiveCount === 0) {
    return result;
  }

  const runId = settings.runId || _createAlertOperationId('ARC');
  const rows = historySheet
    .getRange(2, 1, archiveCount, 7)
    .getValues();
  const target = archiveSheet || _getAlertHistoryArchiveSheet();
  const metadata = metadataSheet ||
    (!archiveSheet ? _getAlertArchiveMetadataSheet() : null);
  const targetRow = target.getLastRow() + 1;
  const startedAt = new Date();
  let metadataRow = 0;
  let archiveWritten = false;

  result.runId = runId;
  result.status = 'STARTED';

  if (metadata) {
    metadataRow = _appendAlertArchiveMetadata(metadata, {
      runId: runId,
      startedAt: startedAt,
      completedAt: '',
      policyVersion: policy.VERSION,
      sourceSchemaVersion: AlertManager.SCHEMAS.HISTORY.VERSION,
      targetSchemaVersion: AlertManager.SCHEMAS.ARCHIVE.VERSION,
      archivedRows: archiveCount,
      status: 'STARTED',
      error: '',
      recoveryStatus: 'NOT_REQUIRED'
    });
  }

  try {
    target.getRange(targetRow, 1, rows.length, 7).setValues(rows);
    archiveWritten = true;

    if (settings.injectFailureAfterArchiveWrite) {
      throw new Error('HLAS-0047 ARCHIVE_INJECTED_FAILURE');
    }

    historySheet.deleteRows(2, archiveCount);

    result.archivedRows = archiveCount;
    result.activeRowsAfter = dataRowCount - archiveCount;
    result.status = 'COMPLETED';

    if (metadata && metadataRow > 0) {
      _updateAlertArchiveMetadata(metadata, metadataRow, {
        completedAt: new Date(),
        archivedRows: archiveCount,
        status: 'COMPLETED',
        error: '',
        recoveryStatus: 'NOT_REQUIRED'
      });
      _maintainAlertArchiveMetadataSafely(metadata, new Date());
    }

    AlertManager._writeAlertLog(
      'ALERT_HISTORY',
      AlertManager.LEVELS.INFO,
      [
        'ARCHIVED',
        `id=${runId}`,
        `version=${policy.VERSION}`,
        `count=${archiveCount}`,
        `activeRows=${result.activeRowsAfter}`
      ].join(' ')
    );
    _recordAlertMetricSafely('ARCHIVE_COMPLETED', {
      durationMs: Date.now() - startedAt.getTime(),
      archivedRows: archiveCount,
      context: runId
    });

    return result;
  } catch (error) {
    let recoveryStatus = 'NOT_REQUIRED';

    if (archiveWritten) {
      try {
        target.deleteRows(targetRow, archiveCount);
        recoveryStatus = 'ARCHIVE_ROWS_REMOVED';
      } catch (recoveryError) {
        recoveryStatus = `RECOVERY_FAILED:${recoveryError.message}`;
      }
    }

    result.status = 'ROLLED_BACK';
    result.recoveryStatus = recoveryStatus;

    if (metadata && metadataRow > 0) {
      _updateAlertArchiveMetadata(metadata, metadataRow, {
        completedAt: new Date(),
        archivedRows: 0,
        status: 'ROLLED_BACK',
        error: error.message,
        recoveryStatus: recoveryStatus
      });
      _maintainAlertArchiveMetadataSafely(metadata, new Date());
    }

    _recordAlertMetricSafely('ARCHIVE_ROLLED_BACK', {
      durationMs: Date.now() - startedAt.getTime(),
      archivedRows: archiveCount,
      context: `${runId}:${error.message}`
    });

    AlertManager._handleError(
      error,
      'AlertManager.ArchivePolicy'
    );
    throw error;
  }
}

function _appendAlertArchiveMetadata(sheet, metadata) {
  const row = sheet.getLastRow() + 1;

  sheet.getRange(row, 1, 1, 10).setValues([[
    metadata.runId,
    metadata.startedAt,
    metadata.completedAt,
    metadata.policyVersion,
    metadata.sourceSchemaVersion,
    metadata.targetSchemaVersion,
    metadata.archivedRows,
    metadata.status,
    metadata.error,
    metadata.recoveryStatus
  ]]);

  return row;
}

function _updateAlertArchiveMetadata(sheet, row, update) {
  const current = sheet.getRange(row, 1, 1, 10).getValues()[0];

  current[2] = update.completedAt;
  current[6] = update.archivedRows;
  current[7] = update.status;
  current[8] = update.error;
  current[9] = update.recoveryStatus;
  sheet.getRange(row, 1, 1, 10).setValues([current]);
}

function _maintainAlertArchiveMetadataSafely(sheet, referenceTime) {
  try {
    return _maintainAlertArchiveMetadata(sheet, referenceTime);
  } catch (error) {
    AlertManager._handleError(
      error,
      'AlertManager.ArchiveMetadataMaintenance'
    );
    return {
      deletedRows: 0,
      activeRows: Math.max(sheet.getLastRow() - 1, 0),
      error: error.message
    };
  }
}

function _recordAlertMetricSafely(eventType, metadata) {
  try {
    if (
      typeof AlertMetricManager === 'undefined' ||
      typeof AlertMetricManager.record !== 'function'
    ) {
      return false;
    }

    return AlertMetricManager.record(eventType, metadata || {});
  } catch (error) {
    Logger.log(
      `[AlertManager] METRIC_RECORD_FAILED ` +
      `event=${eventType} message=${error.message}`
    );
    return false;
  }
}

function _createAlertOperationId(prefix) {
  const uuid = typeof Utilities !== 'undefined' &&
    typeof Utilities.getUuid === 'function'
    ? Utilities.getUuid().replace(/-/g, '').slice(0, 10)
    : String(Math.floor(Math.random() * 10000000000));

  return `${prefix}-${Date.now()}-${uuid}`;
}

function _formatAlertOperationTime(value) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);

  return isNaN(date.getTime()) ? '' : date.toISOString();
}

function _mergeAlertArchivePolicy(overrides) {
  const source = overrides || {};
  const standard = AlertManager.ARCHIVE_POLICY;

  return {
    VERSION: standard.VERSION,
    MAX_ACTIVE_ROWS: source.MAX_ACTIVE_ROWS !== undefined
      ? Math.max(Number(source.MAX_ACTIVE_ROWS), 0)
      : standard.MAX_ACTIVE_ROWS,
    RETENTION_DAYS: source.RETENTION_DAYS !== undefined
      ? Math.max(Number(source.RETENTION_DAYS), 0)
      : standard.RETENTION_DAYS,
    BATCH_SIZE: source.BATCH_SIZE !== undefined
      ? Math.max(Number(source.BATCH_SIZE), 1)
      : standard.BATCH_SIZE
  };
}
