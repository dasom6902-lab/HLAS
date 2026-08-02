/**
 * @fileoverview HLAS Scheduler Manager Test
 */


/**
 * SchedulerManager Test Main
 */
function test_SchedulerManager() {


  Logger.log(
    '=== SchedulerManager 테스트 시작 ==='
  );


  try {


    testSchedulerModule();


    testDashboardRefresh();


    testInventoryCheck();


    testAlertCheck();


    testExecutionHistory();



  } catch(error) {


    Logger.log(
      `[FAIL] SchedulerManager 테스트 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== SchedulerManager 테스트 완료 ==='
  );


}



/**
 * Module 존재 확인
 */
function testSchedulerModule() {


  if (
    typeof SchedulerManager === 'undefined'
  ) {


    throw new Error(
      'SchedulerManager Module 없음'
    );


  }



  Logger.log(
    '[PASS] SchedulerManager Module 존재'
  );


}



/**
 * Dashboard 자동 실행 검증
 */
function testDashboardRefresh() {


  const result =
    SchedulerManager
      .runDashboardRefresh();



  if (
    result !== true
  ) {


    throw new Error(
      'Dashboard Refresh 실행 실패'
    );


  }



  Logger.log(
    '[PASS] Dashboard Refresh 실행 정상'
  );


}



/**
 * Inventory Check 검증
 */
function testInventoryCheck() {


  const result =
    SchedulerManager
      .runInventoryCheck();



  if (
    result !== true
  ) {


    throw new Error(
      'Inventory Check 실행 실패'
    );


  }



  Logger.log(
    '[PASS] Inventory Check 실행 정상'
  );


}



/**
 * Alert Check 검증
 */
function testAlertCheck() {


  const result =
    SchedulerManager
      .runAlertCheck();



  if (
    result !== true
  ) {


    throw new Error(
      'Alert Check 실행 실패'
    );


  }



  Logger.log(
    '[PASS] Alert Check 실행 정상'
  );


}



/**
 * History 조회 검증
 */
function testExecutionHistory() {


  const history =
    SchedulerManager
      .getExecutionHistory();



  if (
    !Array.isArray(history)
  ) {


    throw new Error(
      'Execution History 조회 오류'
    );


  }



  Logger.log(
    '[PASS] Execution History 정상'
  );


}