/**
 * @fileoverview 모든 신규 Entity가 재사용하는 Row Audit Manager.
 */

const AuditManager = Object.freeze({
  /**
   * 신규 레코드의 Audit 필드를 초기화한다.
   *
   * @param {Object} data 원본 데이터
   * @param {string=} user 작업자
   * @return {Object} Audit 필드가 적용된 복사본
   */
  initializeAudit: function (data, user) {
    const now = new Date();
    const actor = resolveAuditActor_(user);
    return Object.assign({}, data || {}, {
      CreatedAt: (data || {}).CreatedAt || now,
      CreatedBy: (data || {}).CreatedBy || actor,
      UpdatedAt: now,
      UpdatedBy: actor,
      SchemaVersion:
        (data || {}).SchemaVersion || PMS_CONFIG.AUDIT.SCHEMA_VERSION,
      IsActive: (data || {}).IsActive === undefined
        ? true
        : Boolean((data || {}).IsActive),
      DeletedAt: (data || {}).DeletedAt || '',
      DeletedBy: (data || {}).DeletedBy || '',
      DeleteReason: (data || {}).DeleteReason || '',
    });
  },

  /**
   * 수정 레코드의 Audit 필드를 갱신한다.
   *
   * @param {Object} data 원본 데이터
   * @param {string=} user 작업자
   * @return {Object} Audit 수정 필드가 적용된 복사본
   */
  updateAudit: function (data, user) {
    return Object.assign({}, data || {}, {
      UpdatedAt: new Date(),
      UpdatedBy: resolveAuditActor_(user),
      SchemaVersion:
        (data || {}).SchemaVersion || PMS_CONFIG.AUDIT.SCHEMA_VERSION,
    });
  },

  /**
   * 레코드를 Soft Delete 상태로 변경한다.
   *
   * @param {Object} data 원본 데이터
   * @param {string=} user 작업자
   * @param {string=} reason 삭제 사유
   * @return {Object} 삭제 상태 복사본
   */
  softDelete: function (data, user, reason) {
    const actor = resolveAuditActor_(user);
    return Object.assign({}, this.updateAudit(data, actor), {
      IsActive: false,
      DeletedAt: new Date(),
      DeletedBy: actor,
      DeleteReason: reason || PMS_CONFIG.AUDIT.SOFT_DELETE_REASON,
    });
  },

  /**
   * Soft Delete 레코드를 복원한다.
   *
   * @param {Object} data 삭제 상태 데이터
   * @param {string=} user 작업자
   * @return {Object} 복원 상태 복사본
   */
  restore: function (data, user) {
    return Object.assign({}, this.updateAudit(data, user), {
      IsActive: true,
      DeletedAt: '',
      DeletedBy: '',
      DeleteReason: '',
    });
  },

  /**
   * 레코드의 Audit 필드만 반환한다.
   *
   * @param {Object} data Entity 데이터
   * @return {Object} Audit 정보
   */
  getAuditInfo: function (data) {
    const input = data || {};
    return {
      CreatedAt: input.CreatedAt || '',
      CreatedBy: input.CreatedBy || '',
      UpdatedAt: input.UpdatedAt || '',
      UpdatedBy: input.UpdatedBy || '',
      SchemaVersion: input.SchemaVersion || '',
      IsActive: input.IsActive,
      DeletedAt: input.DeletedAt || '',
      DeletedBy: input.DeletedBy || '',
      DeleteReason: input.DeleteReason || '',
    };
  },
});

function resolveAuditActor_(user) {
  if (user) return String(user);
  try {
    const current = getCurrentUser();
    return String(current.email || PMS_CONFIG.AUDIT.DEFAULT_USER);
  } catch (error) {
    return PMS_CONFIG.AUDIT.DEFAULT_USER;
  }
}
