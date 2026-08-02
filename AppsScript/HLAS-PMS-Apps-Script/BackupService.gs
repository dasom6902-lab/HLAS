/**
 * 전체 HLAS 데이터를 JSON 파일로 백업한다.
 *
 * @return {Object} Core API 표준 응답
 */
function createBackup() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.CREATE, HLAS_CONSTANTS.ENTITY.BACKUP, '');
    const snapshot = buildBackupSnapshot_();
    const backupId = 'BACKUP-' + Utilities.getUuid().toUpperCase();
    const fileName = 'HLAS_BACKUP_' + exportTimestamp_() + '.json';
    const file = DriveApp.createFile(fileName, JSON.stringify(snapshot), MimeType.PLAIN_TEXT);
    const saved = saveBackupHistory_(backupId, 'FULL', 'ALL', fileName, 'SUCCESS', file.getId());
    writeBackupAudit_(HLAS_CONSTANTS.AUDIT_ACTION.BACKUP, backupId, 'SUCCESS', 'Backup 완료', { fileId: file.getId() });
    notifyDataOperation_('Backup 완료', fileName);
    return { backupId: backupId, fileId: file.getId(), fileName: fileName, history: saved };
  }, { operation: 'createBackup' });
}

/**
 * 지정한 백업 파일로 전체 데이터를 복원한다.
 *
 * @param {string} backupId BACKUP_ID
 * @return {Object} Core API 표준 응답
 */
function restoreBackup(backupId) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.UPDATE, HLAS_CONSTANTS.ENTITY.BACKUP, backupId);
    const history = SheetRepository.findById(HLAS_CONSTANTS.SHEETS.BACKUP_HISTORY, backupId);
    if (!history) throw new NotFoundError('백업 이력을 찾을 수 없습니다.', 'backupId');
    const fileId = String(history[HLAS_CONSTANTS.FIELD.BACKUP.MESSAGE] || '').trim();
    const snapshot = JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8'));
    validateBackupSnapshot_(snapshot);
    Object.keys(snapshot.data).forEach(function (sheetName) {
      replaceSheetData_(sheetName, snapshot.data[sheetName]);
    });
    writeBackupAudit_(HLAS_CONSTANTS.AUDIT_ACTION.RESTORE, backupId, 'SUCCESS', 'Restore 완료', '');
    notifyDataOperation_('Restore 완료', backupId);
    return { backupId: backupId, restored: true };
  }, { operation: 'restoreBackup' });
}

/**
 * 백업 이력 목록을 반환한다.
 *
 * @return {Object} Core API 표준 응답
 */
function listBackups() {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.READ, HLAS_CONSTANTS.ENTITY.BACKUP, '');
    return SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.BACKUP_HISTORY);
  }, { operation: 'listBackups' });
}

/**
 * 백업 파일과 이력을 삭제한다.
 *
 * @param {string} backupId BACKUP_ID
 * @return {Object} Core API 표준 응답
 */
function deleteBackup(backupId) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.DELETE, HLAS_CONSTANTS.ENTITY.BACKUP, backupId);
    const C = HLAS_CONSTANTS;
    const history = SheetRepository.findById(C.SHEETS.BACKUP_HISTORY, backupId);
    if (!history) throw new NotFoundError('백업 이력을 찾을 수 없습니다.', 'backupId');
    const fileId = String(history[C.FIELD.BACKUP.MESSAGE] || '').trim();
    if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
    SheetRepository.delete(C.SHEETS.BACKUP_HISTORY, backupId);
    writeBackupAudit_(C.AUDIT_ACTION.DELETE_BACKUP, backupId, 'SUCCESS', 'Backup 삭제', '');
    return { backupId: backupId, deleted: true };
  }, { operation: 'deleteBackup' });
}

function buildBackupSnapshot_() {
  const C = HLAS_CONSTANTS;
  const sheets = [
    C.SHEETS.PROJECT, C.SHEETS.EPIC, C.SHEETS.FEATURE,
    C.SHEETS.FUNCTION, C.SHEETS.TASK, C.SHEETS.USER,
    C.SHEETS.AUDIT, C.SHEETS.NOTIFICATION, '99_SETTING',
  ];
  const data = {};
  sheets.forEach(function (sheetName) {
    data[sheetName] = SheetRepository.findAll(sheetName);
  });
  return { version: PMS_CONFIG.version, timestamp: new Date().toISOString(), data: data };
}

function validateBackupSnapshot_(snapshot) {
  if (!snapshot || !snapshot.data || typeof snapshot.data !== 'object') {
    throw new ValidationError('유효한 백업 데이터가 아닙니다.', 'snapshot', null, 'BACKUP_INVALID');
  }
  ['01_PROJECT', '02_EPIC', '03_FEATURE', '04_FUNCTION', '05_TASK'].forEach(function (sheetName) {
    if (!Array.isArray(snapshot.data[sheetName])) {
      throw new ValidationError('필수 백업 대상이 누락되었습니다: ' + sheetName, 'snapshot');
    }
  });
}

function replaceSheetData_(sheetName, rows) {
  return SheetRepository.replaceAll(sheetName, rows);
}

function saveBackupHistory_(backupId, type, target, fileName, status, fileId) {
  const C = HLAS_CONSTANTS;
  const record = {};
  record[C.FIELD.BACKUP.BACKUP_ID] = backupId;
  record[C.FIELD.BACKUP.TIMESTAMP] = new Date();
  record[C.FIELD.BACKUP.USER] = getCurrentUser().email || 'UNKNOWN';
  record[C.FIELD.BACKUP.TYPE] = type;
  record[C.FIELD.BACKUP.TARGET] = target;
  record[C.FIELD.BACKUP.FILE_NAME] = fileName;
  record[C.FIELD.BACKUP.STATUS] = status;
  record[C.FIELD.BACKUP.MESSAGE] = fileId;
  return SheetRepository.insert(C.SHEETS.BACKUP_HISTORY, record);
}

function writeBackupAudit_(action, backupId, result, message, detail) {
  return writeEntityAudit_(action, HLAS_CONSTANTS.ENTITY.BACKUP, backupId, result, message, detail);
}
