/**
 * @fileoverview HLAS-0047 CONDITIONAL PASS 보완 Test
 * Archive Metadata, Backup Validation/Retention, Large Migration, V2 Strategy
 */

function test_AlertArchiveMigrationPolicyReview() {
  const startedAt = Date.now();
  const token = String(Date.now());
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const properties = PropertiesService.getScriptProperties();
  const tempSheets = [];
  const tempPropertyKeys = [];
  const backupIndexKey = AlertManager.BACKUP_RETENTION_POLICY.INDEX_KEY;
  const originalBackupIndex = properties.getProperty(backupIndexKey);
  let passed = 0;

  Logger.log('=== HLAS-0047 Conditional Review Test 시작 ===');

  try {
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
    _assertHLAS0047Review_(
      typeof AlertManager !== 'undefined' &&
      publicMethods.every(function(name) {
        return typeof AlertManager[name] === 'function';
      }),
      'AlertManager 및 Public API 9개 유지'
    );
    passed++;

    _assertHLAS0047Review_(
      AlertManager.ARCHIVE_METADATA_POLICY.VERSION === 'V1' &&
      AlertManager.BACKUP_RETENTION_POLICY.VERSION === 'V1' &&
      AlertManager.SCHEMA_MIGRATION_STRATEGY.VERSION === 'V1',
      'Conditional Review Policy V1 등록'
    );
    passed++;

    _registerAlertArchiveMetadataPolicy();
    _registerAlertBackupRetentionPolicy();
    _registerAlertSchemaMigrationStrategy();
    const metadataPolicy = JSON.parse(properties.getProperty(
      AlertManager.ARCHIVE_METADATA_POLICY.PROPERTY_KEY
    ));
    _assertHLAS0047Review_(
      metadataPolicy.retentionDays === 730 &&
      metadataPolicy.maxRows === 10000 &&
      metadataPolicy.preserveStatuses.indexOf('STARTED') >= 0,
      'Archive Metadata Policy 등록'
    );
    passed++;

    const backupPolicy = JSON.parse(properties.getProperty(
      AlertManager.BACKUP_RETENTION_POLICY.PROPERTY_KEY
    ));
    _assertHLAS0047Review_(
      backupPolicy.retentionDays === 30 &&
      backupPolicy.maxBackupsPerSource === 5 &&
      backupPolicy.autoDelete === false,
      'Backup Retention 비파괴 Policy 등록'
    );
    passed++;

    const strategy = JSON.parse(properties.getProperty(
      AlertManager.SCHEMA_MIGRATION_STRATEGY.PROPERTY_KEY
    ));
    _assertHLAS0047Review_(
      strategy.currentVersion === 'V1' &&
      strategy.futureVersion === 'V2' &&
      strategy.futureStatus === 'DESIGN_ONLY',
      'Schema V2 Design-Only Strategy 등록'
    );
    passed++;

    const metadataSheet = _createHLAS0047ReviewSheet_(
      spreadsheet,
      `HLAS0047R_META_${token}`,
      AlertManager.SCHEMAS.ARCHIVE_METADATA.HEADERS,
      tempSheets
    );
    const now = new Date();
    const oldDate = new Date(
      now.getTime() - 800 * 24 * 60 * 60 * 1000
    );
    metadataSheet.getRange(2, 1, 4, 10).setValues([
      ['OLD', oldDate, oldDate, 'V1', 'V1', 'V1', 1, 'COMPLETED', '', ''],
      ['ACTIVE', oldDate, '', 'V1', 'V1', 'V1', 0, 'STARTED', '', ''],
      ['RECENT-1', now, now, 'V1', 'V1', 'V1', 1, 'COMPLETED', '', ''],
      ['RECENT-2', now, now, 'V1', 'V1', 'V1', 1, 'ROLLED_BACK', '', '']
    ]);
    const metadataResult = _maintainAlertArchiveMetadata(
      metadataSheet,
      now,
      {
        RETENTION_DAYS: 730,
        MAX_ROWS: 2,
        CLEANUP_BATCH_SIZE: 10
      }
    );
    _assertHLAS0047Review_(
      metadataResult.deletedRows === 2 &&
      metadataResult.activeRows === 2,
      'Archive Metadata Retention/Max Row 정리'
    );
    passed++;

    const remainingMetadata = metadataSheet
      .getRange(2, 1, 2, 10)
      .getValues();
    _assertHLAS0047Review_(
      remainingMetadata.some(function(row) {
        return row[0] === 'ACTIVE' && row[7] === 'STARTED';
      }),
      '진행 중 Metadata 보존'
    );
    passed++;

    const backupSheet = spreadsheet.insertSheet(
      `HLAS0047R_BAK_${token}`
    );
    tempSheets.push(backupSheet);
    const snapshot = [
      ['TIME', 'CODE', 'LEVEL', 'MESSAGE', 'STATUS'],
      [now, 'REVIEW', 'WARN', 'Backup Validation', 'OPEN']
    ];
    _writeAlertMigrationBackup(backupSheet, snapshot);
    const validBackup = _validateAlertMigrationBackup(
      backupSheet,
      snapshot,
      1
    );
    _assertHLAS0047Review_(
      validBackup.valid && validBackup.rows === 2 &&
      validBackup.columns === 5,
      'Backup 전체 Row/Column Validation'
    );
    passed++;

    backupSheet.getRange(2, 2).setValue('CHANGED');
    const invalidBackup = _validateAlertMigrationBackup(
      backupSheet,
      snapshot,
      1
    );
    _assertHLAS0047Review_(
      !invalidBackup.valid &&
      invalidBackup.error.indexOf('BACKUP_VALUE_MISMATCH') === 0,
      'Backup Value Mismatch 탐지'
    );
    passed++;
    _writeAlertMigrationBackup(backupSheet, snapshot);

    const smallControl = _resolveAlertMigrationControl(100, {});
    _assertHLAS0047Review_(
      smallControl.batchSize === 200 &&
      smallControl.largeMigration === false,
      '일반 Migration Batch Control'
    );
    passed++;

    const largeControl = _resolveAlertMigrationControl(5000, {});
    _assertHLAS0047Review_(
      largeControl.batchSize === 500 &&
      largeControl.largeMigration === true &&
      largeControl.totalBatches === 10,
      'Large Migration Dynamic Batch Control'
    );
    passed++;

    let hardLimitRejected = false;
    try {
      _resolveAlertMigrationControl(50001, {});
    } catch (error) {
      hardLimitRejected = /운영 승인 필요/.test(error.message);
    }
    _assertHLAS0047Review_(
      hardLimitRejected,
      'Large Migration Hard Limit 차단'
    );
    passed++;

    _assertHLAS0047Review_(
      _assertAlertMigrationPath('V0', 'V1') === 'V0->V1',
      'V0→V1 Migration Path 허용'
    );
    passed++;

    let v2Rejected = false;
    try {
      _assertAlertMigrationPath('V1', 'V2');
    } catch (error) {
      v2Rejected = /지원되지 않는 Schema Migration/.test(error.message);
    }
    _assertHLAS0047Review_(
      v2Rejected,
      '승인 전 V2 Migration 실행 차단'
    );
    passed++;

    const migrationProperty = `HLAS0047R:VERSION:${token}`;
    const migrationStatusKey = `HLAS0047R:STATUS:${token}`;
    tempPropertyKeys.push(migrationProperty, migrationStatusKey);
    const migrationSchema = {
      VERSION: 'V1',
      PROPERTY_KEY: migrationProperty,
      MIGRATION_KEY: migrationStatusKey,
      HEADERS: AlertManager.SCHEMAS.ALERT.HEADERS.slice(),
      CONSUMER_PREFIX_LENGTH: 5
    };
    const migrationSheet = spreadsheet.insertSheet(
      `HLAS0047R_MIG_${token}`
    );
    const migrationBackup = spreadsheet.insertSheet(
      `HLAS0047R_MBK_${token}`
    );
    tempSheets.push(migrationSheet, migrationBackup);
    migrationSheet.getRange(1, 1, 3, 5).setValues([
      ['TIME', 'CODE', 'LEVEL', 'MESSAGE', 'STATUS'],
      [oldDate, 'REVIEW_1', 'WARN', 'Legacy 1', 'OPEN'],
      [now, 'REVIEW_2', 'INFO', 'Legacy 2', 'RESOLVED']
    ]);
    _ensureAlertSchemaHeader(migrationSheet, migrationSchema, {
      runId: `MIG-REVIEW-${token}`,
      backupSheet: migrationBackup,
      batchSize: 1
    });
    _assertHLAS0047Review_(
      migrationSheet.getRange(1, 1, 1, 7).getValues()[0].join('|') ===
        AlertManager.SCHEMAS.ALERT.HEADERS.join('|'),
      'Validation 적용 Migration 완료'
    );
    passed++;

    const migrationStatus = JSON.parse(
      properties.getProperty(migrationStatusKey)
    );
    _assertHLAS0047Review_(
      migrationStatus.status === 'COMPLETED' &&
      migrationStatus.backupValidated === true &&
      migrationStatus.recoveryStatus === 'BACKUP_RETAINED',
      'Migration Status Backup Validation 기록'
    );
    passed++;

    _assertHLAS0047Review_(
      migrationStatus.batchSize === 1 &&
      migrationStatus.totalBatches === 2 &&
      migrationStatus.largeMigration === false &&
      migrationStatus.strategyVersion === 'V1',
      'Migration Status Batch/Strategy 기록'
    );
    passed++;

    const migrationRows = migrationSheet
      .getRange(2, 1, 2, 7)
      .getValues();
    _assertHLAS0047Review_(
      migrationRows[0].slice(0, 5).join('|') ===
        [oldDate, 'REVIEW_1', 'WARN', 'Legacy 1', 'OPEN'].join('|') &&
      migrationRows[1].slice(0, 5).join('|') ===
        [now, 'REVIEW_2', 'INFO', 'Legacy 2', 'RESOLVED'].join('|'),
      'Legacy Consumer 데이터 동일성 유지'
    );
    passed++;

    const backupIndex = JSON.parse(
      properties.getProperty(backupIndexKey) || '[]'
    );
    _assertHLAS0047Review_(
      backupIndex.some(function(entry) {
        return entry.runId === `MIG-REVIEW-${token}` &&
          entry.validated === true && entry.rows === 3;
      }),
      'Backup Validation Index 기록'
    );
    passed++;

    const duration = Date.now() - startedAt;
    _assertHLAS0047Review_(
      duration < 30000,
      `Conditional Review 통합 성능 ${duration}ms`
    );
    passed++;

    Logger.log(
      `[PASS] HLAS-0047 Conditional Review ${passed}/20 PASS ` +
      JSON.stringify({
        durationMs: duration,
        publicApiCount: publicMethods.length,
        metadataDeletedRows: metadataResult.deletedRows,
        backupValidated: migrationStatus.backupValidated,
        batchSize: migrationStatus.batchSize,
        strategyVersion: migrationStatus.strategyVersion,
        v2Status: strategy.futureStatus
      })
    );
  } finally {
    tempSheets.reverse().forEach(function(sheet) {
      try {
        spreadsheet.deleteSheet(sheet);
      } catch (error) {
        Logger.log(`[HLAS-0047 Review Cleanup] ${error.message}`);
      }
    });

    tempPropertyKeys.forEach(function(key) {
      properties.deleteProperty(key);
      delete AlertManager._schemaRegistrationCache[key];
    });

    if (originalBackupIndex === null) {
      properties.deleteProperty(backupIndexKey);
    } else {
      properties.setProperty(backupIndexKey, originalBackupIndex);
    }

    Logger.log('=== HLAS-0047 Conditional Review Test 완료 ===');
  }
}

function _createHLAS0047ReviewSheet_(
  spreadsheet,
  name,
  headers,
  tempSheets
) {
  const sheet = spreadsheet.insertSheet(name);
  tempSheets.push(sheet);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function _assertHLAS0047Review_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  Logger.log(`[PASS] ${message}`);
}
