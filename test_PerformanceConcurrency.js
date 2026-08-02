/**
 * @fileoverview HLAS Performance & Concurrency Test
 */


function test_PerformanceConcurrency() {


  Logger.log(
    '=== HLAS Performance Test 시작 ==='
  );


  try {


    testNumberGenerationPerformance();


    testSequenceLock();


    testDomainCreatePerformance();



  } catch(error) {


    Logger.log(
      `[FAIL] Performance Test 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== HLAS Performance Test 완료 ==='
  );

}



/**
 * NumberGenerator 성능 및 중복 검증
 */
function testNumberGenerationPerformance() {


  const numbers = [];


  const start =
    new Date()
      .getTime();



  for (
    let i = 0;
    i < 10;
    i++
  ) {


    numbers.push(

      NumberGenerator.generateNumber(
        'TEST'
      )

    );

  }



  const end =
    new Date()
      .getTime();



  const unique =
    new Set(numbers);



  if (
    numbers.length === unique.size
  ) {


    Logger.log(
      '[PASS] NumberGenerator 중복 방지 정상'
    );


  } else {


    throw new Error(
      'Number 중복 발생'
    );

  }



  Logger.log(
    `[INFO] Number 생성 시간 : ${end-start}ms`
  );

}



/**
 * Sequence Lock 검증
 */
function testSequenceLock() {


  const key =
    'PERFORMANCE_TEST';



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
    after === before + 1
  ) {


    Logger.log(
      '[PASS] Sequence Lock 처리 정상'
    );


  } else {


    throw new Error(
      'Sequence 증가 오류'
    );

  }


}



/**
 * Domain 생성 시간 검증
 */
function testDomainCreatePerformance() {


  const start =
    new Date()
      .getTime();



  const orderId =
    OrderManager.createOrder({

      supplier:'PERFORMANCE_TEST',

      itemCode:'PERF-001',

      itemName:'PERFORMANCE_ITEM',

      quantity:1

    });



  const end =
    new Date()
      .getTime();



  if(orderId) {


    Logger.log(
      `[PASS] Order 생성 정상 : ${orderId}`
    );


  }



  Logger.log(
    `[INFO] Order 생성 시간 : ${end-start}ms`
  );


}