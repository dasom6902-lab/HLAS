/**
 * @fileoverview HLAS Notification Manager Test
 */


/**
 * NotificationManager Test Main
 */
function test_NotificationManager() {


  Logger.log(
    '=== NotificationManager 테스트 시작 ==='
  );


  try {


    testNotificationModule();


    testSendNotification();


    testSendAlert();


    testEmailChannel();


    testChatChannel();


    testHistory();



  } catch(error) {


    Logger.log(
      `[FAIL] NotificationManager 테스트 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== NotificationManager 테스트 완료 ==='
  );


}



/**
 * Module 존재 확인
 */
function testNotificationModule() {


  if (
    typeof NotificationManager === 'undefined'
  ) {


    throw new Error(
      'NotificationManager Module 없음'
    );


  }



  Logger.log(
    '[PASS] NotificationManager Module 존재'
  );


}



/**
 * Notification 전송 검증
 */
function testSendNotification() {


  const result =
    NotificationManager.send({

      type:'TEST',

      message:'Notification Test'

    });



  if (
    result !== true
  ) {


    throw new Error(
      'Notification 전송 실패'
    );


  }



  Logger.log(
    '[PASS] Notification 전송 정상'
  );


}



/**
 * Alert 전달 검증
 */
function testSendAlert() {


  const result =
    NotificationManager.sendAlert({

      code:'TEST_ALERT',

      level:'INFO',

      message:'Alert Test'

    });



  if (
    result !== true
  ) {


    throw new Error(
      'Alert Notification 실패'
    );


  }



  Logger.log(
    '[PASS] Alert Notification 정상'
  );


}



/**
 * Email Channel 검증
 */
function testEmailChannel() {


  const result =
    NotificationManager.sendEmail(
      'Email Test Message'
    );



  if (
    result !== true
  ) {


    throw new Error(
      'Email Channel 오류'
    );


  }



  Logger.log(
    '[PASS] Email Channel 정상'
  );


}



/**
 * Chat Channel 검증
 */
function testChatChannel() {


  const result =
    NotificationManager.sendChat(
      'Chat Test Message'
    );



  if (
    result !== true
  ) {


    throw new Error(
      'Chat Channel 오류'
    );


  }



  Logger.log(
    '[PASS] Chat Channel 정상'
  );


}



/**
 * History 조회 검증
 */
function testHistory() {


  const history =
    NotificationManager.getHistory();



  if (
    !Array.isArray(history)
  ) {


    throw new Error(
      'Notification History 오류'
    );


  }



  Logger.log(
    '[PASS] Notification History 정상'
  );


}