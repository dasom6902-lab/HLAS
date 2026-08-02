/**
 * @fileoverview HLAS-0047 Alert Archive & Migration Policy Test
 * 임시 Sheet/Property와 고유 Test Alert만 사용하는 통합 테스트
 */

function test_AlertArchiveMigrationPolicy() {
  const startedAt = Date.now();
  const token = String(Date.now());
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tempSheets = [];
  const tempPropertyKeys = [];
  const alertCode = `HLAS0047_LIFECYCLE_${token}`;
  const dashboardBefore = _getDashboardAlertSummary();
  const backupIndexKey = AlertManager.BACKUP_RETENTION_POLICY.INDEX_KEY;
  const originalBackupIndex = PropertiesService
    .getScriptProperties()
    .getProperty(backupIndexKey);
  let passed = 0;

  Logger.log('=== HLAS-0047 Archive Migration Test 시작 ===');

  try {
    _assertHLAS0047(
      typeof AlertManager !== 'undefined',
      'AlertManager Module 존재'
    );
    passed++;

    const publicMethods = [
      'createAlert',
      'getAlerts',
      'updateAlertState',
      'getAlertState',
      'getAlertHistory',
      'getAlertSummary',
      'checkInventoryAlert',
      'checkSystemAlert',
      'checkOperationalAlert'
    ];
    _assertHLAS0047(
      publicMethods.every(function(name) {
        return typeof AlertManager[name] === 'function';
      }),
      'Public API 9개 유지'
    );
    passed++;

    _assertHLAS0047(
      AlertManager.SCHEMAS.ARCHIVE_METADATA.VERSION === 'V1' &&
      AlertManager.MIGRATION_POLICY.VERSION === 'V1',
      'Archive Metadata / Migration Policy V1'
    );
    passed++;

    _getAlertSheet();
    _getAlertHistorySheet();
    const properties = PropertiesService.getScriptProperties();
    const currentMigration = JSON.parse(
      properties.getProperty('HLAS:ALERT:MIGRATION_STATUS')
    );
    _assertHLAS0047(
      ['CURRENT', 'COMPLETED'].indexOf(currentMigration.status) >= 0 &&
      currentMigration.toVersion === 'V1',
      '운영 Migration Status 관리'
    );
    passed++;

    const archiveHistory = _createHLAS0047TempSheet_(
      spreadsheet,
      `HLAS0047_ARC_SRC_${token}`,
      AlertManager.SCHEMAS.HISTORY,
      tempSheets
    );
    const archiveTarget = _createHLAS0047TempSheet_(
      spreadsheet,
      `HLAS0047_ARC_DST_${token}`,
      AlertManager.SCHEMAS.ARCHIVE,
      tempSheets
    );
    const archiveMetadata = _createHLAS0047TempSheet_(
      spreadsheet,
      `HLAS0047_ARC_META_${token}`,
      AlertManager.SCHEMAS.ARCHIVE_METADATA,
      tempSheets
    );
    const now = new Date();
    const oldDate = new Date(
      now.getTime() - 400 * 24 * 60 * 60 * 1000
    );

    archiveHistory.getRange(2, 1, 4, 7).setValues([
      [oldDate, 'ALT-0047-OLD-1', 'HLAS0047_OLD_1', 'CREATED', '', 'OPEN', ''],
      [oldDate, 'ALT-0047-OLD-2', 'HLAS0047_OLD_2', 'CREATED', '', 'OPEN', ''],
      [now, 'ALT-0047-NEW-1', 'HLAS0047_NEW_1', 'CREATED', '', 'OPEN', ''],
      [now, 'ALT-0047-NEW-2', 'HLAS0047_NEW_2', 'CREATED', '', 'OPEN', '']
    ]);

    const archiveResult = _applyAlertHistoryArchivePolicy(
      archiveHistory,
      now,
      {
        MAX_ACTIVE_ROWS: 2,
        RETENTION_DAYS: 365,
        BATCH_SIZE: 10
      },
      archiveTarget,
      archiveMetadata,
      {runId: `ARC-SUCCESS-${token}`}
    );
    _assertHLAS0047(
      archiveResult.status === 'COMPLETED' &&
      archiveResult.archivedRows === 2 &&
      archiveResult.activeRowsAfter === 2,
      'Archive 조건 처리 및 완료'
    );
    passed++;

    _assertHLAS0047(
      archiveHistory.getLastRow() === 3 &&
      archiveTarget.getLastRow() === 3,
      'Archive Source/Target Row 정합성'
    );
    passed++;

    const archiveMetaRow = archiveMetadata
      .getRange(2, 1, 1, 10)
      .getValues()[0];
    _assertHLAS0047(
      archiveMetaRow[0] === `ARC-SUCCESS-${token}` &&
      archiveMetaRow[3] === 'V1' &&
      archiveMetaRow[4] === 'V1' &&
      archiveMetaRow[5] === 'V1' &&
      archiveMetaRow[6] === 2 &&
      archiveMetaRow[7] === 'COMPLETED',
      'Archive Metadata 완료 기록'
    );
    passed++;

    _assertHLAS0047(
      archiveMetadata.getRange(1, 1, 1, 10).getValues()[0].join('|') ===
        'RUN_ID|STARTED_AT|COMPLETED_AT|POLICY_VERSION|' +
        'SOURCE_SCHEMA_VERSION|TARGET_SCHEMA_VERSION|ARCHIVED_ROWS|' +
        'STATUS|ERROR|RECOVERY_STATUS',
      'Archive Metadata Schema V1'
    );
    passed++;

    const rollbackHistory = _createHLAS0047TempSheet_(
      spreadsheet,
      `HLAS0047_RB_SRC_${token}`,
      AlertManager.SCHEMAS.HISTORY,
      tempSheets
    );
    const rollbackTarget = _createHLAS0047TempSheet_(
      spreadsheet,
      `HLAS0047_RB_DST_${token}`,
      AlertManager.SCHEMAS.ARCHIVE,
      tempSheets
    );
    const rollbackMetadata = _createHLAS0047TempSheet_(
      spreadsheet,
      `HLAS0047_RB_META_${token}`,
      AlertManager.SCHEMAS.ARCHIVE_METADATA,
      tempSheets
    );
    rollbackHistory.getRange(2, 1, 2, 7).setValues([
      [oldDate, 'ALT-0047-RB-1', 'HLAS0047_RB_1', 'CREATED', '', 'OPEN', ''],
      [oldDate, 'ALT-0047-RB-2', 'HLAS0047_RB_2', 'CREATED', '', 'OPEN', '']
    ]);
    let archiveFailureRejected = false;

    try {
      _applyAlertHistoryArchivePolicy(
        rollbackHistory,
        now,
        {
          MAX_ACTIVE_ROWS: 0,
          RETENTION_DAYS: 365,
          BATCH_SIZE: 10
        },
        rollbackTarget,
        rollbackMetadata,
        {
          runId: `ARC-ROLLBACK-${token}`,
          injectFailureAfterArchiveWrite: true
        }
      );
    } catch (error) {
      archiveFailureRejected = /ARCHIVE_INJECTED_FAILURE/.test(
        error.message
      );
    }

    _assertHLAS0047(
      archiveFailureRejected,
      'Archive Failure 재전파'
    );
    passed++;

    _assertHLAS0047(
      rollbackHistory.getLastRow() === 3 &&
      rollbackTarget.getLastRow() === 1,
      'Archive Failure Source 보존 및 Target Rollback'
    );
    passed++;

    const rollbackMetaRow = rollbackMetadata
      .getRange(2, 1, 1, 10)
      .getValues()[0];
    _assertHLAS0047(
      rollbackMetaRow[7] === 'ROLLED_BACK' &&
      /ARCHIVE_INJECTED_FAILURE/.test(rollbackMetaRow[8]) &&
      rollbackMetaRow[9] === 'ARCHIVE_ROWS_REMOVED',
      'Archive Rollback Metadata'
    );
    passed++;

    const migrationProperty = `HLAS0047:MIGRATION:VERSION:${token}`;
    const migrationStatusKey = `HLAS0047:MIGRATION:STATUS:${token}`;
    tempPropertyKeys.push(migrationProperty, migrationStatusKey);
    const migrationSchema = _createHLAS0047MigrationSchema_(
      migrationProperty,
      migrationStatusKey
    );
    const migrationSheet = spreadsheet.insertSheet(
      `HLAS0047_MIG_SRC_${token}`
    );
    const migrationBackup = spreadsheet.insertSheet(
      `HLAS0047_MIG_BAK_${token}`
    );
    tempSheets.push(migrationSheet, migrationBackup);
    migrationSheet.getRange(1, 1, 3, 5).setValues([
      ['TIME', 'CODE', 'LEVEL', 'MESSAGE', 'STATUS'],
      [oldDate, 'LEGACY_1', 'WARN', 'Legacy One', 'OPEN'],
      [now, 'LEGACY_2', 'CRITICAL', 'Legacy Two', 'RESOLVED']
    ]);

    _ensureAlertSchemaHeader(
      migrationSheet,
      migrationSchema,
      {
        runId: `MIG-SUCCESS-${token}`,
        backupSheet: migrationBackup,
        batchSize: 1
      }
    );
    _assertHLAS0047(
      migrationSheet.getRange(1, 1, 1, 7).getValues()[0].join('|') ===
        'TIME|CODE|LEVEL|MESSAGE|STATUS|ALERT_ID|UPDATED_AT',
      'Legacy V0 → V1 Schema Migration'
    );
    passed++;

    const migratedRows = migrationSheet
      .getRange(2, 1, 2, 7)
      .getValues();
    _assertHLAS0047(
      /^ALT-/.test(migratedRows[0][5]) &&
      /^ALT-/.test(migratedRows[1][5]) &&
      migratedRows[0][6] instanceof Date &&
      migratedRows[1][6] instanceof Date,
      'Migration Alert ID / UPDATED_AT Backfill'
    );
    passed++;

    _assertHLAS0047(
      migratedRows[0].slice(0, 5).join('|') ===
        [oldDate, 'LEGACY_1', 'WARN', 'Legacy One', 'OPEN'].join('|') &&
      migratedRows[1].slice(0, 5).join('|') ===
        [now, 'LEGACY_2', 'CRITICAL', 'Legacy Two', 'RESOLVED'].join('|'),
      'Migration Legacy Consumer 데이터 동일성'
    );
    passed++;

    const migrationStatus = JSON.parse(
      properties.getProperty(migrationStatusKey)
    );
    _assertHLAS0047(
      properties.getProperty(migrationProperty) === 'V1' &&
      migrationStatus.status === 'COMPLETED' &&
      migrationStatus.migratedRows === 2 &&
      migrationStatus.recoveryStatus === 'BACKUP_RETAINED',
      'Migration Status COMPLETED'
    );
    passed++;

    _assertHLAS0047(
      migrationBackup.getRange(1, 1, 3, 5).getValues()[0].join('|') ===
        'TIME|CODE|LEVEL|MESSAGE|STATUS' &&
      migrationBackup.getLastRow() === 3,
      'Migration Backup 보존'
    );
    passed++;

    const rollbackMigrationProperty =
      `HLAS0047:ROLLBACK:VERSION:${token}`;
    const rollbackMigrationStatusKey =
      `HLAS0047:ROLLBACK:STATUS:${token}`;
    tempPropertyKeys.push(
      rollbackMigrationProperty,
      rollbackMigrationStatusKey
    );
    const rollbackMigrationSchema = _createHLAS0047MigrationSchema_(
      rollbackMigrationProperty,
      rollbackMigrationStatusKey
    );
    const rollbackMigrationSheet = spreadsheet.insertSheet(
      `HLAS0047_MRB_SRC_${token}`
    );
    const rollbackMigrationBackup = spreadsheet.insertSheet(
      `HLAS0047_MRB_BAK_${token}`
    );
    tempSheets.push(
      rollbackMigrationSheet,
      rollbackMigrationBackup
    );
    rollbackMigrationSheet.getRange(1, 1, 2, 5).setValues([
      ['TIME', 'CODE', 'LEVEL', 'MESSAGE', 'STATUS'],
      [now, 'ROLLBACK_1', 'WARN', 'Rollback One', 'OPEN']
    ]);
    let migrationFailureRejected = false;

    try {
      _ensureAlertSchemaHeader(
        rollbackMigrationSheet,
        rollbackMigrationSchema,
        {
          runId: `MIG-ROLLBACK-${token}`,
          backupSheet: rollbackMigrationBackup,
          injectFailureAfterHeader: true
        }
      );
    } catch (error) {
      migrationFailureRejected = /MIGRATION_INJECTED_FAILURE/.test(
        error.message
      );
    }

    _assertHLAS0047(
      migrationFailureRejected,
      'Migration Failure 재전파'
    );
    passed++;

    const restoredValues = rollbackMigrationSheet
      .getRange(1, 1, 2, 7)
      .getValues();
    _assertHLAS0047(
      restoredValues[0].slice(0, 5).join('|') ===
        'TIME|CODE|LEVEL|MESSAGE|STATUS' &&
      restoredValues[0][5] === '' &&
      restoredValues[0][6] === '' &&
      restoredValues[1].slice(1, 5).join('|') ===
        'ROLLBACK_1|WARN|Rollback One|OPEN',
      'Migration Rollback 원본 복원'
    );
    passed++;

    const rollbackMigrationStatus = JSON.parse(
      properties.getProperty(rollbackMigrationStatusKey)
    );
    _assertHLAS0047(
      properties.getProperty(rollbackMigrationProperty) === null &&
      rollbackMigrationStatus.status === 'ROLLED_BACK' &&
      rollbackMigrationStatus.recoveryStatus === 'SOURCE_RESTORED',
      'Migration Status ROLLED_BACK'
    );
    passed++;

    _assertHLAS0047(
      AlertManager.createAlert(
        alertCode,
        'WARN',
        'HLAS-0047 Integration Test'
      ) === true,
      '운영 Alert Lifecycle 생성'
    );
    passed++;

    const lifecycleAlert = _findHLAS0047AlertByCode_(alertCode);
    _assertHLAS0047(
      lifecycleAlert &&
      ['time', 'code', 'level', 'message', 'status'].every(
        function(key) {
          return Object.prototype.hasOwnProperty.call(
            lifecycleAlert,
            key
          );
        }
      ),
      'Legacy Consumer Field Compatibility'
    );
    passed++;

    AlertManager.updateAlertState(
      lifecycleAlert.id,
      'RESOLVED',
      'HLAS-0047 완료'
    );
    const lifecycleHistory = AlertManager.getAlertHistory(
      lifecycleAlert.id
    );
    _assertHLAS0047(
      lifecycleHistory.length === 2 &&
      lifecycleHistory[0].event === 'CREATED' &&
      lifecycleHistory[1].newStatus === 'RESOLVED',
      'Alert Lifecycle / History Integration'
    );
    passed++;

    const dashboardAfter = _getDashboardAlertSummary();
    _assertHLAS0047(
      dashboardAfter.TOTAL_COUNT === dashboardBefore.TOTAL_COUNT + 1 &&
      dashboardAfter.OPEN_COUNT === dashboardBefore.OPEN_COUNT,
      'Dashboard Alert Compatibility'
    );
    passed++;

    const duration = Date.now() - startedAt;
    _assertHLAS0047(
      duration < 45000,
      `Archive/Migration/Rollback 통합 성능 ${duration}ms`
    );
    passed++;

    Logger.log(
      `[PASS] HLAS-0047 ${passed}/24 PASS ` +
      JSON.stringify({
        durationMs: duration,
        policyVersion: 'V1',
        publicApiCount: publicMethods.length,
        archivedRows: archiveResult.archivedRows,
        archiveStatus: archiveResult.status,
        archiveRollbackStatus: rollbackMetaRow[7],
        archiveRecoveryStatus: rollbackMetaRow[9],
        migratedRows: migrationStatus.migratedRows,
        migrationStatus: migrationStatus.status,
        migrationRollbackStatus: rollbackMigrationStatus.status,
        migrationRecoveryStatus:
          rollbackMigrationStatus.recoveryStatus,
        dashboardTotalDelta:
          dashboardAfter.TOTAL_COUNT - dashboardBefore.TOTAL_COUNT,
        dashboardOpenDelta:
          dashboardAfter.OPEN_COUNT - dashboardBefore.OPEN_COUNT
      })
    );
  } catch (error) {
    Logger.log(
      `[FAIL] HLAS-0047 ${passed}/24 PASS: ${error.message}`
    );
    throw error;
  } finally {
    _deleteHLAS0047TestRows_(_getAlertSheet());
    _deleteHLAS0047TestRows_(_getAlertHistorySheet());
    tempPropertyKeys.forEach(function(key) {
      PropertiesService.getScriptProperties().deleteProperty(key);
      delete AlertManager._schemaRegistrationCache[key];
    });
    if (originalBackupIndex === null) {
      PropertiesService.getScriptProperties()
        .deleteProperty(backupIndexKey);
    } else {
      PropertiesService.getScriptProperties()
        .setProperty(backupIndexKey, originalBackupIndex);
    }
    for (let i = tempSheets.length - 1; i >= 0; i--) {
      const sheet = tempSheets[i];

      if (sheet && spreadsheet.getSheetByName(sheet.getName())) {
        spreadsheet.deleteSheet(sheet);
      }
    }
  }

  Logger.log('=== HLAS-0047 Archive Migration Test 완료 ===');
}

function _createHLAS0047TempSheet_(
  spreadsheet,
  name,
  schema,
  tempSheets
) {
  const sheet = spreadsheet.insertSheet(name);
  tempSheets.push(sheet);
  _ensureAlertSchemaHeader(sheet, schema);
  return sheet;
}

function _createHLAS0047MigrationSchema_(propertyKey, statusKey) {
  return {
    VERSION: 'V1',
    PROPERTY_KEY: propertyKey,
    MIGRATION_KEY: statusKey,
    HEADERS: AlertManager.SCHEMAS.ALERT.HEADERS.slice(),
    CONSUMER_PREFIX_LENGTH: 5
  };
}

function _findHLAS0047AlertByCode_(code) {
  const alerts = AlertManager.getAlerts();

  for (let i = alerts.length - 1; i >= 0; i--) {
    if (alerts[i].code === code) {
      return alerts[i];
    }
  }

  return null;
}

function _deleteHLAS0047TestRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return;
  }

  const values = sheet.getDataRange().getValues();

  for (let i = values.length - 1; i >= 1; i--) {
    const searchable = [
      values[i][1],
      values[i][2],
      values[i][3]
    ].join('|');

    if (searchable.indexOf('HLAS0047') >= 0) {
      sheet.deleteRow(i + 1);
    }
  }
}

function _assertHLAS0047(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  Logger.log(`[PASS] ${message}`);
}
