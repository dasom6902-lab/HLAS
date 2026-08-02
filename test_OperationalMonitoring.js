/**
 * @fileoverview HLAS Operational Monitoring Test
 */


function test_OperationalMonitoring() {


  Logger.log(
    '=== HLAS Operational Monitoring Test 시작 ==='
  );


  try {


    testLogAvailability();


    testErrorMonitoring();


    testSequenceMonitoring();


    testDomainMonitoring();



  } catch(error) {


    Logger.log(
      `[FAIL] Monitoring Test 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== HLAS Operational Monitoring Test 완료 ==='
  );


}



/**
 * Log Monitoring 확인
 */
function testLogAvailability() {


  if (
    typeof writeInfo !== 'function'
  ) {


    throw new Error(
      'LogUtils 연결 없음'
    );


  }


  Logger.log(
    '[PASS] Log Monitoring 연결 정상'
  );


}



/**
 * Error Monitoring 확인
 */
function testErrorMonitoring() {


  const error =
    CoreError.create(

      'MONITOR_TEST',

      'Monitoring Test Error'

    );



  const handled =
    ErrorHandler.handle(

      error,

      'Monitoring'

    );



  if (
    handled.code !== 'MONITOR_TEST'
  ) {


    throw new Error(
      'Error Monitoring 오류'
    );


  }



  Logger.log(
    '[PASS] Error Monitoring 정상'
  );


}



/**
 * Sequence Monitoring 확인
 */
function testSequenceMonitoring() {


  const key =
    'MONITOR_SEQUENCE';



  const before =
    SequenceManager.getCurrentSequence(
      key
    );



  SequenceManager.getNextSequence(
    key
  );



  const after =
    SequenceManager.getCurrentSequence(
      key
    );



  if (
    after !== before + 1
  ) {


    throw new Error(
      'Sequence Monitoring 오류'
    );


  }



  Logger.log(
    '[PASS] Sequence Monitoring 정상'
  );


}



/**
 * Domain Monitoring 확인
 */
function testDomainMonitoring() {


  const order =
    typeof OrderManager !== 'undefined';



  const picking =
    typeof PickingManager !== 'undefined';



  const inventory =
    typeof InventoryManager !== 'undefined';



  const shipment =
    typeof ShipmentManager !== 'undefined';



  if (
    !order ||
    !picking ||
    !inventory ||
    !shipment
  ) {


    throw new Error(
      'Domain Monitoring Module 오류'
    );


  }



  Logger.log(
    '[PASS] Domain Monitoring 정상'
  );


}