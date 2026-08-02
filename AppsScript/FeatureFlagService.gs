/** 환경별 Feature Flag를 관리한다. */

/** @param {Object} data Flag 입력 @return {Object} Core API 응답 */
function setFeatureFlag(data) {
  return CommonAPI.execute(function () {
    assertPermission_(HLAS_CONSTANTS.PERMISSION.UPDATE, HLAS_CONSTANTS.ENTITY.FEATURE_FLAG, data && data.flag);
    const d = data || {}; Validation.required(d.flag, 'flag');
    const target = String(d.target || 'PROD').toUpperCase();
    if (HLAS_CONSTANTS.ENVIRONMENT.VALUES.indexOf(target) === -1) throw new ValidationError('환경은 DEV/TEST/PROD여야 합니다.', 'target');
    const existing = SheetRepository.findById(HLAS_CONSTANTS.SHEETS.FEATURE_FLAG, String(d.flag));
    const row = { FLAG: String(d.flag), DESCRIPTION: String(d.description || ''), ENABLED: d.enabled === true || String(d.enabled).toUpperCase() === 'Y' ? 'Y' : 'N', TARGET: target, UPDATED_AT: new Date() };
    const saved = existing ? SheetRepository.update(HLAS_CONSTANTS.SHEETS.FEATURE_FLAG, row.FLAG, row) : SheetRepository.insert(HLAS_CONSTANTS.SHEETS.FEATURE_FLAG, row);
    auditReliability_(HLAS_CONSTANTS.AUDIT_ACTION.FEATURE_FLAG_CHANGE, row.FLAG, 'SUCCESS', row.ENABLED + '/' + target);
    return saved;
  }, { operation: 'setFeatureFlag' });
}

/** @param {string} flag Flag @param {string=} target 환경 @return {boolean} 활성 여부 */
function isFeatureEnabled(flag, target) {
  Validation.required(flag, 'flag');
  const row = SheetRepository.findById(HLAS_CONSTANTS.SHEETS.FEATURE_FLAG, flag);
  if (!row) throw new NotFoundError('Feature Flag를 찾을 수 없습니다.', 'flag');
  return String(row.ENABLED) === 'Y' && String(row.TARGET) === String(target || 'PROD').toUpperCase();
}

/** @param {string=} target 환경 @return {Object} 목록 */
function listFeatureFlags(target) {
  return CommonAPI.execute(function () {
    return SheetRepository.findAll(HLAS_CONSTANTS.SHEETS.FEATURE_FLAG).filter(function (r) {
      return !target || String(r.TARGET) === String(target).toUpperCase();
    });
  }, { operation: 'listFeatureFlags' });
}
