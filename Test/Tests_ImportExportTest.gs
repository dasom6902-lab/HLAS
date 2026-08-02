/**
 * Import / Export / Backup Framework 통합 테스트를 실행한다.
 *
 * 실제 Drive 백업 파일은 테스트 종료 시 삭제한다.
 *
 * @return {Object[]} 항목별 PASS/FAIL 결과
 */
function runImportExportTests() {
  const C = HLAS_CONSTANTS;
  const results = [];
  const properties = PropertiesService.getScriptProperties();
  const previousRole = properties.getProperty('HLAS_TEST_ROLE');
  const testId = 'PRJ-IMP-' + Date.now();
  let backupId = '';

  properties.setProperty('HLAS_TEST_ROLE', C.ROLE.ADMIN);
  try {
    const row = {};
    row.PROJECT_ID = testId;
    row[C.PROJECT_FIELD.PROJECT_NAME] = 'TASK-0015 Import Test';

    const preview = previewImport({ entity: C.ENTITY.PROJECT, records: [row] });
    assertImportExport_(preview.ok && preview.data.newCount === 1, 'Import Preview');
    recordImportExport_(results, 'Import Preview', true);

    const validation = validateImport({ entity: C.ENTITY.PROJECT, records: [row] });
    assertImportExport_(validation.ok && validation.data.valid, 'Import Validation');
    recordImportExport_(results, 'Import Validation', true);

    const imported = executeImport({ entity: C.ENTITY.PROJECT, records: [row] });
    assertImportExport_(imported.ok && imported.data.created === 1, 'Import Execute');
    recordImportExport_(results, 'Import Execute', true);

    const csv = exportEntity({ entity: C.ENTITY.PROJECT, format: 'CSV' });
    assertImportExport_(csv.ok && csv.data.content.indexOf(testId) !== -1, 'Export CSV');
    recordImportExport_(results, 'Export CSV', true);

    const json = exportEntity({ entity: C.ENTITY.PROJECT, format: 'JSON' });
    assertImportExport_(json.ok && JSON.parse(json.data.content).length > 0, 'Export JSON');
    recordImportExport_(results, 'Export JSON', true);

    const backup = createBackup();
    assertImportExport_(backup.ok && backup.data.backupId, 'Backup');
    backupId = backup.data.backupId;
    recordImportExport_(results, 'Backup', true);

    const restored = restoreBackup(backupId);
    assertImportExport_(restored.ok && restored.data.restored, 'Restore');
    recordImportExport_(results, 'Restore', true);

    const audits = getAuditList({ entity: C.ENTITY.BACKUP });
    assertImportExport_(audits.ok && audits.data.length > 0, 'Audit 연계');
    recordImportExport_(results, 'Audit 연계', true);

    const notices = getNotificationList({ entity: C.ENTITY.BACKUP });
    assertImportExport_(notices.ok && notices.data.length > 0, 'Notification 연계');
    recordImportExport_(results, 'Notification 연계', true);

    const deleted = deleteBackup(backupId);
    assertImportExport_(deleted.ok && deleted.data.deleted, 'Delete Backup');
    backupId = '';
    recordImportExport_(results, 'Delete Backup', true);

    Logger.log('[TASK-0015] Import/Export/Backup 테스트 PASS');
    return results;
  } finally {
    if (SheetRepository.findById(C.SHEETS.PROJECT, testId)) {
      SheetRepository.delete(C.SHEETS.PROJECT, testId);
    }
    if (backupId) {
      try { deleteBackup(backupId); } catch (ignore) {}
    }
    if (previousRole) properties.setProperty('HLAS_TEST_ROLE', previousRole);
    else properties.deleteProperty('HLAS_TEST_ROLE');
  }
}

function assertImportExport_(condition, message) {
  if (!condition) throw new Error(message);
}

function recordImportExport_(results, name, passed) {
  results.push({ name: name, result: passed ? 'PASS' : 'FAIL' });
  Logger.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + name);
}
