/**
 * 역할이 특정 권한을 보유하는지 확인한다.
 *
 * @param {string} userRole ADMIN, MANAGER, USER, VIEWER
 * @param {string} permission READ, CREATE, UPDATE, DELETE, DASHBOARD
 * @return {boolean} 권한 보유 여부
 */
function hasPermission(userRole, permission) {
  const C = HLAS_CONSTANTS;
  const role = String(userRole || '').trim().toUpperCase();
  const target = String(permission || '').trim().toUpperCase();
  Validation.required(role, 'userRole');
  Validation.required(target, 'permission');
  if (C.ROLE.VALUES.indexOf(role) === -1) return false;

  const matrix = {};
  matrix[C.ROLE.ADMIN] = [
    C.PERMISSION.READ, C.PERMISSION.CREATE, C.PERMISSION.UPDATE,
    C.PERMISSION.DELETE, C.PERMISSION.DASHBOARD,
  ];
  matrix[C.ROLE.MANAGER] = matrix[C.ROLE.ADMIN].slice();
  matrix[C.ROLE.USER] = [
    C.PERMISSION.READ, C.PERMISSION.CREATE,
    C.PERMISSION.UPDATE, C.PERMISSION.DASHBOARD,
  ];
  matrix[C.ROLE.VIEWER] = [C.PERMISSION.READ, C.PERMISSION.DASHBOARD];
  return matrix[role].indexOf(target) !== -1;
}

/**
 * 현재 사용자의 권한 정보를 UI에 반환한다.
 *
 * @return {Object} 역할과 권한별 boolean
 */
function getPermissionContext() {
  const role = getCurrentRole();
  const P = HLAS_CONSTANTS.PERMISSION;
  return {
    role: role,
    read: hasPermission(role, P.READ),
    create: hasPermission(role, P.CREATE),
    update: hasPermission(role, P.UPDATE),
    delete: hasPermission(role, P.DELETE),
    dashboard: hasPermission(role, P.DASHBOARD),
  };
}

function assertPermission_(permission, entity, entityId) {
  const role = getCurrentRole();
  if (!hasPermission(role, permission)) {
    if (
      typeof writeEntityAudit_ === 'function' &&
      HLAS_CONSTANTS.SHEETS.AUDIT
    ) {
      writeEntityAudit_(
        HLAS_CONSTANTS.AUDIT_ACTION.PERMISSION_DENIED,
        entity || 'SYSTEM',
        entityId || '',
        HLAS_CONSTANTS.AUDIT_RESULT.DENIED,
        '권한이 없습니다: ' + permission,
        { role: role, permission: permission }
      );
    }
    throw new CoreError(
      'PERMISSION_DENIED',
      '권한이 없습니다: ' + permission,
      'permission',
      { role: role, permission: permission }
    );
  }
  return true;
}
