/**
 * @fileoverview HLAS Cache Invalidation Manager Test
 */


/**
 * Main Test
 */
function test_CacheInvalidationManager(){


  Logger.log(
    '=== CacheInvalidationManager 테스트 시작 ==='
  );


  try{


    testCacheInvalidationModule();


    testInventoryInvalidation();


    testKPIInvalidation();


    testDashboardInvalidation();



  }
  catch(error){


    Logger.log(
      `[FAIL] CacheInvalidation Test 오류 : ${error.message}`
    );


  }



  Logger.log(
    '=== CacheInvalidationManager 테스트 완료 ==='
  );


}





/**
 * Module 존재 확인
 */
function testCacheInvalidationModule(){


  if(
    typeof CacheInvalidationManager === 'undefined'
  ){

    throw new Error(
      'CacheInvalidationManager Module 없음'
    );

  }



  Logger.log(
    '[PASS] CacheInvalidationManager Module 존재'
  );


}





/**
 * Inventory Invalidation Test
 */
function testInventoryInvalidation(){


  CacheManager.set(

    'INVENTORY',

    'LIST',

    {
      test:'inventory'
    },

    300

  );


  CacheManager.set(

    'INVENTORY',

    'ANALYTICS',

    {
      test:'analytics'
    },

    300

  );



  CacheInvalidationManager
    .onInventoryChanged();



  const inventory =
    CacheManager.get(

      'INVENTORY',

      'LIST'

    );



  const analytics =
    CacheManager.get(

      'INVENTORY',

      'ANALYTICS'

    );



  if(
    inventory !== null
    ||
    analytics !== null
  ){

    throw new Error(
      'Inventory Cache 삭제 실패'
    );

  }



  Logger.log(
    '[PASS] Inventory Cache Invalidation 정상'
  );


}





/**
 * KPI Invalidation Test
 */
function testKPIInvalidation(){


  CacheManager.set(

    'KPI',

    'SUMMARY',

    {
      test:'kpi'
    },

    300

  );



  CacheInvalidationManager
    .onKPIChanged();



  const result =
    CacheManager.get(

      'KPI',

      'SUMMARY'

    );



  if(
    result !== null
  ){

    throw new Error(
      'KPI Cache 삭제 실패'
    );

  }



  Logger.log(
    '[PASS] KPI Cache Invalidation 정상'
  );


}





/**
 * Dashboard Invalidation Test
 */
function testDashboardInvalidation(){


  CacheManager.set(

    'DASHBOARD',

    'SUMMARY',

    {
      test:'dashboard'
    },

    300

  );



  CacheInvalidationManager
    .onDashboardRefresh();



  const result =
    CacheManager.get(

      'DASHBOARD',

      'SUMMARY'

    );



  if(
    result !== null
  ){

    throw new Error(
      'Dashboard Cache 삭제 실패'
    );

  }



  Logger.log(
    '[PASS] Dashboard Cache Invalidation 정상'
  );


}