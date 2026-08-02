/**
 * 현재 실행 사용자의 역할을 반환한다.
 *
 * 06_USER의 활성 이메일 역할을 우선하고, 없으면 Script Property
 * DEFAULT_ROLE을 사용한다. 초기 운영 호환을 위해 최종 기본값은 ADMIN이다.
 *
 * @return {string} 현재 역할
 */
function getCurrentRole() {
  const C = HLAS_CONSTANTS;
  const properties = PropertiesService.getScriptProperties();
  const testRole = String(properties.getProperty('HLAS_TEST_ROLE') || '').trim();
  if (testRole && C.ROLE.VALUES.indexOf(testRole) !== -1) return testRole;

  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  try {
    const users = SheetRepository.findAll(C.SHEETS.USER);
    const matched = users.find(function (user) {
      return String(user[C.FIELD.USER.EMAIL] || '').trim().toLowerCase() === email &&
        String(user[C.FIELD.USER.STATUS] || '').trim() === C.USER_STATUS.ACTIVE;
    });
    if (matched) {
      const role = String(matched[C.FIELD.USER.ROLE] || '').trim().toUpperCase();
      if (C.ROLE.VALUES.indexOf(role) !== -1) return role;
    }
  } catch (error) {
    // PMS 초기화 전에는 설정 기본값으로 안전하게 계속한다.
  }
  const defaultRole = String(
    properties.getProperty('DEFAULT_ROLE') || C.ROLE.ADMIN
  ).trim().toUpperCase();
  return C.ROLE.VALUES.indexOf(defaultRole) !== -1 ? defaultRole : C.ROLE.ADMIN;
}

/**
 * 현재 실행 사용자 정보를 반환한다.
 *
 * @return {Object} 이메일과 역할
 */
function getCurrentUser() {
  return {
    email: String(Session.getActiveUser().getEmail() || ''),
    role: getCurrentRole(),
  };
}
