/**
 * @fileoverview HLAS Cache Manager Test
 */


/**
 * CacheManager Test Main
 */
function test_CacheManager(){


  Logger.log(
    '=== CacheManager 테스트 시작 ==='
  );


  try{


    testCacheManagerModule();


    testCacheKey();


    testCacheWrite();


    testCacheRead();


    testCacheRemove();



  }
  catch(error){


    Logger.log(
      `[FAIL] CacheManager Test 오류 : ${error.message}`
    );


  }



  Logger.log(
    '=== CacheManager 테스트 완료 ==='
  );


}





/**
 * Module 존재 확인
 */
function testCacheManagerModule(){


  if(
    typeof CacheManager === 'undefined'
  ){

    throw new Error(
      'CacheManager Module 없음'
    );

  }



  Logger.log(
    '[PASS] CacheManager Module 존재'
  );


}





/**
 * Cache Key 테스트
 */
function testCacheKey(){


  const key =
    CacheManager.createKey(
      'inventory',
      'list'
    );



  if(
    key !==
    'HLAS:INVENTORY:LIST:V1'
  ){

    throw new Error(
      'Cache Key 생성 오류'
    );

  }



  Logger.log(
    '[PASS] Cache Key 정상'
  );


}





/**
 * Cache Write 테스트
 */
function testCacheWrite(){


  const data = {


    itemCount:100,


    quantity:500


  };



  const result =
    CacheManager.set(

      'inventory',

      'test',

      data,

      300

    );



  if(
    result !== true
  ){

    throw new Error(
      'Cache 저장 실패'
    );

  }



  Logger.log(
    '[PASS] Cache Write 정상'
  );


}





/**
 * Cache Read 테스트
 */
function testCacheRead(){


  const result =
    CacheManager.get(

      'inventory',

      'test'

    );



  if(
    !result ||
    result.itemCount !== 100
  ){

    throw new Error(
      'Cache 조회 실패'
    );

  }



  Logger.log(
    '[PASS] Cache Read 정상'
  );


}





/**
 * Cache Remove 테스트
 */
function testCacheRemove(){


  CacheManager.remove(

    'inventory',

    'test'

  );



  const result =
    CacheManager.get(

      'inventory',

      'test'

    );



  if(
    result !== null
  ){

    throw new Error(
      'Cache 삭제 실패'
    );

  }



  Logger.log(
    '[PASS] Cache Remove 정상'
  );


}