/**
 * 새 알림을 생성한다.
 *
 * @param {Object} data 알림 입력값
 * @return {Object} Core API 표준 응답
 */
function createNotification(data) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    const input = normalizeNotificationInput_(data);
    assertPermission_(C.PERMISSION.CREATE, C.ENTITY.NOTIFICATION, '');

    try {
      const record = {};
      record[C.FIELD.NOTIFICATION.NOTIFICATION_ID] =
        'NOTI-' + Utilities.getUuid().toUpperCase();
      record[C.FIELD.NOTIFICATION.TIMESTAMP] = new Date();
      record[C.FIELD.NOTIFICATION.TYPE] = input.type;
      record[C.FIELD.NOTIFICATION.USER] = input.user;
      record[C.FIELD.NOTIFICATION.ENTITY] = input.entity;
      record[C.FIELD.NOTIFICATION.ENTITY_ID] = input.entityId;
      record[C.FIELD.NOTIFICATION.TITLE] = input.title;
      record[C.FIELD.NOTIFICATION.MESSAGE] = input.message;
      record[C.FIELD.NOTIFICATION.STATUS] = C.NOTIFICATION_STATUS.UNREAD;
      record[C.FIELD.NOTIFICATION.READ_AT] = '';
      validateNotificationRecord_(record);
      const channel = getNotificationChannel(
        C.NOTIFICATION_CHANNEL.IN_APP
      );
      return toNotificationModel_(channel.send(record));
    } catch (error) {
      writeEntityAudit_(
        C.AUDIT_ACTION.ERROR,
        C.ENTITY.NOTIFICATION,
        input.entityId,
        C.AUDIT_RESULT.FAIL,
        'Notification 생성 실패',
        { error: error.message, title: input.title }
      );
      throw error;
    }
  }, { operation: 'createNotification' });
}

/**
 * 알림을 한 번 읽고 메모리에서 필터·정렬한다.
 *
 * @param {Object=} options status, type, user, sortOrder
 * @return {Object} Core API 표준 응답
 */
function getNotificationList(options) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    assertPermission_(C.PERMISSION.READ, C.ENTITY.NOTIFICATION, '');
    const input = options || {};
    const status = String(input.status || '').trim().toUpperCase();
    const type = String(input.type || '').trim().toUpperCase();
    const user = String(input.user || '').trim().toLowerCase();
    const sortOrder =
      String(input.sortOrder || C.SEARCH.DESC).toLowerCase() === C.SEARCH.ASC
        ? C.SEARCH.ASC
        : C.SEARCH.DESC;

    const rows = SheetRepository.findAll(C.SHEETS.NOTIFICATION);
    return rows.filter(function (row) {
      if (
        status &&
        String(row[C.FIELD.NOTIFICATION.STATUS] || '').toUpperCase() !== status
      ) return false;
      if (
        type &&
        String(row[C.FIELD.NOTIFICATION.TYPE] || '').toUpperCase() !== type
      ) return false;
      if (
        user &&
        String(row[C.FIELD.NOTIFICATION.USER] || '').toLowerCase().indexOf(user) === -1
      ) return false;
      return true;
    }).sort(function (left, right) {
      const a = new Date(left[C.FIELD.NOTIFICATION.TIMESTAMP]).getTime() || 0;
      const b = new Date(right[C.FIELD.NOTIFICATION.TIMESTAMP]).getTime() || 0;
      return sortOrder === C.SEARCH.ASC ? a - b : b - a;
    }).map(toNotificationModel_);
  }, { operation: 'getNotificationList' });
}

/**
 * 알림을 읽음 상태로 변경한다.
 *
 * @param {string} notificationId 알림 ID
 * @return {Object} Core API 표준 응답
 */
function markAsRead(notificationId) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    assertPermission_(
      C.PERMISSION.UPDATE, C.ENTITY.NOTIFICATION, notificationId
    );
    Validation.required(
      notificationId, C.FIELD.NOTIFICATION.NOTIFICATION_ID
    );
    const current = SheetRepository.findById(
      C.SHEETS.NOTIFICATION, String(notificationId).trim()
    );
    if (!current) {
      throw new NotFoundError(
        '알림을 찾을 수 없습니다: ' + notificationId,
        C.FIELD.NOTIFICATION.NOTIFICATION_ID
      );
    }
    const changes = {};
    changes[C.FIELD.NOTIFICATION.STATUS] = C.NOTIFICATION_STATUS.READ;
    changes[C.FIELD.NOTIFICATION.READ_AT] = new Date();
    return toNotificationModel_(
      SheetRepository.update(
        C.SHEETS.NOTIFICATION, String(notificationId).trim(), changes
      )
    );
  }, { operation: 'markAsRead' });
}

/**
 * 알림을 삭제한다.
 *
 * @param {string} notificationId 알림 ID
 * @return {Object} Core API 표준 응답
 */
function deleteNotification(notificationId) {
  return CommonAPI.execute(function () {
    const C = HLAS_CONSTANTS;
    assertPermission_(
      C.PERMISSION.DELETE, C.ENTITY.NOTIFICATION, notificationId
    );
    Validation.required(
      notificationId, C.FIELD.NOTIFICATION.NOTIFICATION_ID
    );
    const normalizedId = String(notificationId).trim();
    if (!SheetRepository.findById(C.SHEETS.NOTIFICATION, normalizedId)) {
      throw new NotFoundError(
        '삭제할 알림을 찾을 수 없습니다: ' + normalizedId,
        C.FIELD.NOTIFICATION.NOTIFICATION_ID
      );
    }
    SheetRepository.delete(C.SHEETS.NOTIFICATION, normalizedId);
    return { notificationId: normalizedId, deleted: true };
  }, { operation: 'deleteNotification' });
}

function normalizeNotificationInput_(data) {
  const C = HLAS_CONSTANTS;
  const input = data || {};
  return {
    type: String(input.type || C.NOTIFICATION_TYPE.INFO).trim().toUpperCase(),
    user: String(input.user || getCurrentUser().email || '').trim(),
    entity: String(input.entity || 'SYSTEM').trim().toUpperCase(),
    entityId: String(input.entityId || '').trim(),
    title: String(input.title || '').trim(),
    message: String(input.message || '').trim(),
  };
}

function validateNotificationRecord_(record) {
  const C = HLAS_CONSTANTS;
  Validation.required(
    record[C.FIELD.NOTIFICATION.NOTIFICATION_ID],
    C.FIELD.NOTIFICATION.NOTIFICATION_ID
  );
  Validation.required(
    record[C.FIELD.NOTIFICATION.TYPE], C.FIELD.NOTIFICATION.TYPE
  );
  if (
    C.NOTIFICATION_TYPE.VALUES.indexOf(
      record[C.FIELD.NOTIFICATION.TYPE]
    ) === -1
  ) {
    throw new ValidationError(
      '지원하지 않는 알림 TYPE입니다.',
      C.FIELD.NOTIFICATION.TYPE
    );
  }
  Validation.required(
    record[C.FIELD.NOTIFICATION.TITLE], C.FIELD.NOTIFICATION.TITLE
  );
  Validation.required(
    record[C.FIELD.NOTIFICATION.STATUS], C.FIELD.NOTIFICATION.STATUS
  );
}

function toNotificationModel_(record) {
  const C = HLAS_CONSTANTS;
  return {
    notificationId: String(record[C.FIELD.NOTIFICATION.NOTIFICATION_ID] || ''),
    timestamp: formatNotificationDate_(record[C.FIELD.NOTIFICATION.TIMESTAMP]),
    type: String(record[C.FIELD.NOTIFICATION.TYPE] || ''),
    user: String(record[C.FIELD.NOTIFICATION.USER] || ''),
    entity: String(record[C.FIELD.NOTIFICATION.ENTITY] || ''),
    entityId: String(record[C.FIELD.NOTIFICATION.ENTITY_ID] || ''),
    title: String(record[C.FIELD.NOTIFICATION.TITLE] || ''),
    message: String(record[C.FIELD.NOTIFICATION.MESSAGE] || ''),
    status: String(record[C.FIELD.NOTIFICATION.STATUS] || ''),
    readAt: formatNotificationDate_(record[C.FIELD.NOTIFICATION.READ_AT]),
  };
}

function formatNotificationDate_(value) {
  if (!value) return '';
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'
    );
  }
  return String(value);
}

function notificationExists_(entityId, title) {
  const C = HLAS_CONSTANTS;
  return SheetRepository.findAll(C.SHEETS.NOTIFICATION).some(function (row) {
    return String(row[C.FIELD.NOTIFICATION.ENTITY_ID] || '') === entityId &&
      String(row[C.FIELD.NOTIFICATION.TITLE] || '') === title;
  });
}
