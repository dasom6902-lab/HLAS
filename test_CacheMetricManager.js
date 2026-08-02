/**
 * @fileoverview HLAS Cache Metric Manager Test
 */


/**
 * Cache Metric Test Main
 */
function test_CacheMetricManager(){


  Logger.log(
    '=== CacheMetricManager 테스트 시작 ==='
  );


  try{


    testCacheMetricModule();


    testCacheHit();


    testCacheMiss();


    testCacheCreate();


    testCacheInvalidate();


    testCacheMetricRead();



  }
  catch(error){


    Logger.log(
      `[FAIL] CacheMetric Test 오류 : ${error.message}`
    );


  }



  Logger.log(
    '=== CacheMetricManager 테스트 완료 ==='
  );


}





/**
 * Module 존재 확인
 */
function testCacheMetricModule(){


  if(
    typeof CacheMetricManager === 'undefined'
  ){

    throw new Error(
      'CacheMetricManager Module 없음'
    );

  }



  Logger.log(
    '[PASS] CacheMetricManager Module 존재'
  );


}





/**
 * Hit Metric Test
 */
function testCacheHit(){


  CacheMetricManager
    .recordHit(

      'INVENTORY',

      'LIST'

    );



  const metric =
    CacheMetricManager
    .getMetric(

      'INVENTORY',

      'LIST'

    );



  if(
    metric.hit < 1
  ){

    throw new Error(
      'Cache Hit Metric 기록 실패'
    );

  }



  Logger.log(
    '[PASS] Cache Hit Metric 정상'
  );


}





/**
 * Miss Metric Test
 */
function testCacheMiss(){


  CacheMetricManager
    .recordMiss(

      'INVENTORY',

      'LIST'

    );



  const metric =
    CacheMetricManager
    .getMetric(

      'INVENTORY',

      'LIST'

    );



  if(
    metric.miss < 1
  ){

    throw new Error(
      'Cache Miss Metric 기록 실패'
    );

  }



  Logger.log(
    '[PASS] Cache Miss Metric 정상'
  );


}





/**
 * Create Metric Test
 */
function testCacheCreate(){


  CacheMetricManager
    .recordCreate(

      'INVENTORY',

      'LIST'

    );



  const metric =
    CacheMetricManager
    .getMetric(

      'INVENTORY',

      'LIST'

    );



  if(
    metric.create < 1
  ){

    throw new Error(
      'Cache Create Metric 기록 실패'
    );

  }



  Logger.log(
    '[PASS] Cache Create Metric 정상'
  );


}





/**
 * Invalidate Metric Test
 */
function testCacheInvalidate(){


  CacheMetricManager
    .recordInvalidate(

      'INVENTORY',

      'LIST'

    );



  const metric =
    CacheMetricManager
    .getMetric(

      'INVENTORY',

      'LIST'

    );



  if(
    metric.invalidate < 1
  ){

    throw new Error(
      'Cache Invalidate Metric 기록 실패'
    );

  }



  Logger.log(
    '[PASS] Cache Invalidate Metric 정상'
  );


}





/**
 * Metric 조회 Test
 */
function testCacheMetricRead(){


  const metric =
    CacheMetricManager
    .getMetric(

      'INVENTORY',

      'LIST'

    );



  if(
    typeof metric.hit !== 'number'
    ||
    typeof metric.miss !== 'number'
    ||
    typeof metric.create !== 'number'
    ||
    typeof metric.invalidate !== 'number'
  ){

    throw new Error(
      'Metric 조회 구조 오류'
    );

  }



  Logger.log(
    '[PASS] Metric 조회 정상'
  );


}