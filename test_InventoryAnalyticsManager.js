/**
 * @fileoverview HLAS Inventory Analytics Manager Test
 */


/**
 * Inventory Analytics Test Main
 */
function test_InventoryAnalyticsManager() {


  Logger.log(
    '=== InventoryAnalyticsManager 테스트 시작 ==='
  );


  try {


    testInventoryAnalyticsModule();


    testInventorySummary();


    testStockStatus();


    testInventoryKPI();



  } catch(error) {


    Logger.log(
      `[FAIL] Inventory Analytics Test 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== InventoryAnalyticsManager 테스트 완료 ==='
  );


}



/**
 * Module 존재 확인
 */
function testInventoryAnalyticsModule() {


  if (
    typeof InventoryAnalyticsManager === 'undefined'
  ) {


    throw new Error(
      'InventoryAnalyticsManager Module 없음'
    );


  }



  Logger.log(
    '[PASS] InventoryAnalyticsManager Module 존재'
  );


}



/**
 * Inventory Summary 검증
 */
function testInventorySummary() {


  const result =
    InventoryAnalyticsManager
      .getInventorySummary();



  if (
    typeof result.TOTAL_ITEM === 'undefined'
  ) {


    throw new Error(
      'Inventory Summary 계산 오류'
    );


  }



  Logger.log(
    '[PASS] Inventory Summary 정상'
  );


}



/**
 * Stock Status 검증
 */
function testStockStatus() {


  const result =
    InventoryAnalyticsManager
      .getStockStatus();



  if (
    typeof result !== 'object'
  ) {


    throw new Error(
      'Stock Status 계산 오류'
    );


  }



  Logger.log(
    '[PASS] Stock Status 정상'
  );


}



/**
 * Inventory KPI 검증
 */
function testInventoryKPI() {


  const result =
    InventoryAnalyticsManager
      .getInventoryKPI();



  if (
    typeof result.TOTAL_ITEM === 'undefined'
  ) {


    throw new Error(
      'Inventory KPI 계산 오류'
    );


  }



  if (
    typeof result.AVAILABLE_RATE === 'undefined'
  ) {


    throw new Error(
      'Inventory KPI Rate 오류'
    );


  }



  Logger.log(
    '[PASS] Inventory KPI 정상'
  );


}