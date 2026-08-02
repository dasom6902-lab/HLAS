/**
 * @fileoverview
 * NumberGenerator / SequenceManager Test
 */


/**
 * NumberGenerator 전체 테스트
 */
function test_NumberGenerator() {

  Logger.log(
    '=== NumberGenerator 테스트 시작 ==='
  );


  const testType = 'TEST';
  const testType2 = 'ORDER';


  try {


    SequenceManager.resetSequence(testType);
    SequenceManager.resetSequence(testType2);



    // 1. 초기값 확인
    const initial =
      SequenceManager.getCurrentSequence(testType);


    if (initial === 0) {

      Logger.log(
        '[PASS] 초기값 처리 정상'
      );

    } else {

      Logger.log(
        `[FAIL] 초기값 오류: ${initial}`
      );

    }



    // 2. 번호 증가 및 중복 방지
    const number1 =
      NumberGenerator.generateNumber(testType);


    const number2 =
      NumberGenerator.generateNumber(testType);


    if (number1 !== number2) {

      Logger.log(
        '[PASS] 번호 증가 및 중복 방지 정상'
      );

    } else {

      Logger.log(
        '[FAIL] 번호 중복 발생'
      );

    }



    // 3. Sequence 증가 확인
    const sequence =
      SequenceManager.getCurrentSequence(testType);


    if (sequence === 2) {

      Logger.log(
        '[PASS] Sequence 증가 정상'
      );

    } else {

      Logger.log(
        `[FAIL] Sequence 오류: ${sequence}`
      );

    }



    // 4. Type별 분리 확인
    NumberGenerator.generateNumber(testType2);


    const orderSequence =
      SequenceManager.getCurrentSequence(testType2);


    if (orderSequence === 1) {

      Logger.log(
        '[PASS] Type별 Sequence 분리 정상'
      );

    } else {

      Logger.log(
        '[FAIL] Type 분리 오류'
      );

    }



    // 5. Reset 확인
    SequenceManager.resetSequence(testType);


    const resetValue =
      SequenceManager.getCurrentSequence(testType);


    if (resetValue === 0) {

      Logger.log(
        '[PASS] Reset 정상'
      );

    } else {

      Logger.log(
        '[FAIL] Reset 오류'
      );

    }



    // 6. Lock 획득 테스트
    test_SequenceLock();


  } catch(error) {

    Logger.log(
      `[FAIL] 테스트 오류: ${error.message}`
    );

  }


  Logger.log(
    '=== NumberGenerator 테스트 완료 ==='
  );

}



/**
 * Sequence Lock 검증 테스트
 */
function test_SequenceLock() {


  Logger.log(
    '=== Lock 테스트 시작 ==='
  );


  const lock =
    LockService.getScriptLock();


  try {


    const acquired =
      lock.tryLock(1000);


    if (acquired) {

      Logger.log(
        '[PASS] Lock 획득 정상'
      );

    } else {

      Logger.log(
        '[FAIL] Lock 획득 실패'
      );

      return;

    }



    const testKey =
      'LOCK_TEST';


    SequenceManager.resetSequence(testKey);


    const value =
      SequenceManager.getNextSequence(testKey);


    if (value === 1) {

      Logger.log(
        '[PASS] Lock 상태에서 Sequence 처리 정상'
      );

    } else {

      Logger.log(
        '[FAIL] Lock 처리 Sequence 오류'
      );

    }


  } finally {


    lock.releaseLock();


    Logger.log(
      '[PASS] Lock 해제 정상'
    );


    Logger.log(
      '=== Lock 테스트 완료 ==='
    );

  }

}