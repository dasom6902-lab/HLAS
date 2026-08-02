/**
 * @fileoverview HLAS ErrorHandler Test
 */


function test_ErrorHandler() {


  Logger.log(
    '=== ErrorHandler 테스트 시작 ==='
  );


  try {


    // 1. ErrorHandler.handle 테스트

    const error =
      CoreError.create(
        'TEST_ERROR',
        '테스트 오류'
      );


    const handled =
      ErrorHandler.handle(
        error,
        'ErrorHandlerTest'
      );


    if (
      handled.code === 'TEST_ERROR' &&
      handled.message === '테스트 오류'
    ) {

      Logger.log(
        '[PASS] Error 처리 정상'
      );

    } else {

      Logger.log(
        '[FAIL] Error 처리 오류'
      );

    }



    // 2. execute 정상 실행 테스트

    const result =
      ErrorHandler.execute(
        function() {

          return 'SUCCESS';

        },
        'ExecuteTest'
      );


    if (result === 'SUCCESS') {

      Logger.log(
        '[PASS] Execute 정상 처리'
      );

    } else {

      Logger.log(
        '[FAIL] Execute 처리 오류'
      );

    }



    // 3. execute Exception 처리 테스트

    try {


      ErrorHandler.execute(
        function() {

          throw CoreError.create(
            'EXEC_ERROR',
            '실행 오류'
          );

        },
        'ExecuteErrorTest'
      );


      Logger.log(
        '[FAIL] Exception 미발생'
      );


    } catch(e) {


      if (e.code === 'EXEC_ERROR') {

        Logger.log(
          '[PASS] Exception 전달 정상'
        );

      } else {

        Logger.log(
          '[FAIL] Exception Code 오류'
        );

      }

    }



    // 4. LogUtils 연계 확인

    ErrorHandler.handle(
      CoreError.create(
        'LOG_TEST',
        '로그 테스트'
      ),
      'LogTest'
    );


    Logger.log(
      '[PASS] LogUtils 연계 호출 완료'
    );


  } catch(error) {


    Logger.log(
      `[FAIL] 테스트 오류: ${error.message}`
    );


  }


  Logger.log(
    '=== ErrorHandler 테스트 완료 ==='
  );

}