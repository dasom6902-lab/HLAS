/**
 * 알림 채널 구현체를 반환한다.
 *
 * 현재는 IN_APP만 실제 저장을 지원한다. EMAIL, GOOGLE_CHAT, SLACK은
 * 향후 동일 인터페이스로 구현할 수 있도록 명시적으로 예약한다.
 *
 * @param {string=} channelName 채널명
 * @return {Object} send(), sendBatch()를 제공하는 채널
 */
function getNotificationChannel(channelName) {
  const C = HLAS_CONSTANTS;
  const name = String(
    channelName || C.NOTIFICATION_CHANNEL.IN_APP
  ).trim().toUpperCase();

  if (name === C.NOTIFICATION_CHANNEL.IN_APP) {
    return {
      name: name,
      send: function (record) {
        return SheetRepository.insert(C.SHEETS.NOTIFICATION, record);
      },
      sendBatch: function () {
        throw new CoreError(
          'NOT_IMPLEMENTED',
          'Batch Notification은 향후 구현 예정입니다.'
        );
      },
    };
  }

  throw new CoreError(
    'NOTIFICATION_CHANNEL_NOT_IMPLEMENTED',
    '아직 구현되지 않은 Notification Channel입니다: ' + name,
    'channel',
    { channel: name }
  );
}

/**
 * Batch Notification 공개 인터페이스를 예약한다.
 *
 * 실제 Batch Insert는 후속 TASK에서 구현한다.
 *
 * @param {Object[]} list 알림 입력값 배열
 * @return {Object} Core API 표준 실패 응답
 */
function createNotifications(list) {
  return CommonAPI.execute(function () {
    if (!Array.isArray(list)) {
      throw new ValidationError('알림 목록 배열이 필요합니다.', 'list');
    }
    throw new CoreError(
      'NOT_IMPLEMENTED',
      'Batch Notification은 향후 구현 예정입니다.',
      'list',
      { count: list.length }
    );
  }, { operation: 'createNotifications' });
}
