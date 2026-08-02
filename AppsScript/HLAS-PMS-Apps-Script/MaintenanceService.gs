/** Maintenance/Read Only/Emergency Stop 운영 상태를 관리한다. */

/** @param {Object} state 상태 @return {Object} Core API 응답 */
function setMaintenanceState(state) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.UPDATE, HLAS_CONSTANTS.ENTITY.MAINTENANCE, '');
    const s = state || {};
    const record = {
      maintenance: s.maintenance === true, readOnly: s.readOnly === true,
      emergencyStop: s.emergencyStop === true, message: String(s.message || ''),
      updatedAt: new Date().toISOString(), updatedBy: getCurrentUser().email,
    };
    PropertiesService.getScriptProperties().setProperty('HLAS_MAINTENANCE_STATE', JSON.stringify(record));
    auditReliability_(HLAS_CONSTANTS.AUDIT_ACTION.MAINTENANCE_CHANGE, 'MAINTENANCE', 'SUCCESS', JSON.stringify(record));
    return record;
  }, { operation: 'setMaintenanceState' });
}

/** @return {Object} 현재 운영 상태 */
function getMaintenanceState() {
  const raw = PropertiesService.getScriptProperties().getProperty('HLAS_MAINTENANCE_STATE');
  return raw ? JSON.parse(raw) : { maintenance: false, readOnly: false, emergencyStop: false, message: '' };
}

/** @param {boolean=} writeOperation 쓰기 작업 여부 @return {boolean} 허용 여부 */
function assertPlatformAvailable(writeOperation) {
  const s = getMaintenanceState();
  if (s.emergencyStop) throw new CoreError('EMERGENCY_STOP', '시스템이 긴급 중지 상태입니다.');
  if (s.maintenance) throw new CoreError('MAINTENANCE_MODE', s.message || '시스템 점검 중입니다.');
  if (writeOperation && s.readOnly) throw new CoreError('READ_ONLY_MODE', '읽기 전용 모드입니다.');
  return true;
}
