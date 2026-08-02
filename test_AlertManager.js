/**
 * @fileoverview HLAS Alert Manager Test
 */


/**
 * AlertManager Test Main
 */
function test_AlertManager() {


  Logger.log(
    '=== AlertManager 테스트 시작 ==='
  );


  try {


    testAlertManagerModule();


    testCreateAlert();


    testGetAlerts();


    testInventoryAlert();


    testOperationalAlert();



  } catch(error) {


    Logger.log(
      `[FAIL] AlertManager 테스트 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== AlertManager 테스트 완료 ==='
  );


}



/**
 * Module 존재 확인
 */
function testAlertManagerModule() {


  if (
    typeof AlertManager === 'undefined'
  ) {


    throw new Error(
      'AlertManager Module 없음'
    );


  }



  Logger.log(
    '[PASS] AlertManager Module 존재'
  );


}



/**
 * Alert 생성 검증
 */
function testCreateAlert() {


  const result =
    AlertManager.createAlert(

      'TEST_ALERT',

      'INFO',

      'Alert Test Message'

    );



  if(
    result !== true
  ) {


    throw new Error(
      'Alert 생성 실패'
    );


  }



  Logger.log(
    '[PASS] Alert 생성 정상'
  );


}



/**
 * Alert 조회 검증
 */
function testGetAlerts() {


  const alerts =
    AlertManager.getAlerts();



  if(
    !Array.isArray(alerts)
  ) {


    throw new Error(
      'Alert 조회 오류'
    );


  }



  Logger.log(
    '[PASS] Alert 조회 정상'
  );


}



/**
 * Inventory Alert 검증
 */
function testInventoryAlert() {


  const result =
    AlertManager.checkInventoryAlert();



  if(
    typeof result !== 'boolean'
  ) {


    throw new Error(
      'Inventory Alert 오류'
    );


  }



  Logger.log(
    '[PASS] Inventory Alert 정상'
  );


}



/**
 * Operational Alert 검증
 */
function testOperationalAlert() {


  const result =
    AlertManager.checkOperationalAlert();



  if(
    result !== true
  ) {


    throw new Error(
      'Operational Alert 오류'
    );


  }



  Logger.log(
    '[PASS] Operational Alert 정상'
  );


}