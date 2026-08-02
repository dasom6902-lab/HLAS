/**
 * CoreError 테스트
 */
function test_CoreError() {


  Logger.log(
    '=== CoreError 테스트 시작 ==='
  );


  try {


    // 1. Error 생성 테스트
    const error =
      CoreError.create(
        'TEST_ERROR',
        '테스트 오류'
      );


    if (
      error.code === 'TEST_ERROR' &&
      error.message === '테스트 오류'
    ) {

      Logger.log(
        '[PASS] Error 생성 정상'
      );

    } else {

      Logger.log(
        '[FAIL] Error 생성 오류'
      );

    }



    // 2. Exception 테스트

    try {

      CoreError.throw(
        'THROW_TEST',
        'Throw 테스트'
      );


    } catch(e) {


      if (e.code === 'THROW_TEST') {

        Logger.log(
          '[PASS] Exception 처리 정상'
        );

      } else {

        Logger.log(
          '[FAIL] Exception Code 오류'
        );

      }

    }



    // 3. Log 연계 테스트

    CoreError.handle(
      error,
      'CoreErrorTest'
    );


    Logger.log(
      '[PASS] Log 연계 호출 완료'
    );



  } catch(error) {


    Logger.log(
      `[FAIL] 테스트 오류: ${error.message}`
    );

  }


  Logger.log(
    '=== CoreError 테스트 완료 ==='
  );

}