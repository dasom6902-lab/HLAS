/**
 * @fileoverview HLAS SettingsManager Test
 */


function test_SettingsManager() {


  Logger.log(
    '=== SettingsManager 테스트 시작 ==='
  );


  try {


    const testKey =
      'HLAS_TEST_SETTING';


    // 1. 저장 테스트

    SettingsManager.set(
      testKey,
      'TEST_VALUE'
    );


    const value =
      SettingsManager.get(
        testKey
      );


    if (value === 'TEST_VALUE') {

      Logger.log(
        '[PASS] 값 저장 및 조회 정상'
      );

    } else {

      Logger.log(
        '[FAIL] 값 저장 오류'
      );

    }



    // 2. Exists 테스트

    if (
      SettingsManager.exists(testKey)
    ) {

      Logger.log(
        '[PASS] 존재 확인 정상'
      );

    } else {

      Logger.log(
        '[FAIL] 존재 확인 오류'
      );

    }



    // 3. Object 저장 테스트

    const objectKey =
      'HLAS_TEST_OBJECT';


    const testObject =
      {
        id: 1,
        name: 'TEST'
      };


    SettingsManager.set(
      objectKey,
      testObject
    );


    const objectValue =
      SettingsManager.get(
        objectKey
      );


    if (
      objectValue.id === 1 &&
      objectValue.name === 'TEST'
    ) {

      Logger.log(
        '[PASS] Object 저장/조회 정상'
      );

    } else {

      Logger.log(
        '[FAIL] Object 처리 오류'
      );

    }



    // 4. 삭제 테스트

    SettingsManager.remove(
      testKey
    );


    if (
      !SettingsManager.exists(testKey)
    ) {

      Logger.log(
        '[PASS] 삭제 정상'
      );

    } else {

      Logger.log(
        '[FAIL] 삭제 오류'
      );

    }



    // 5. 정리

    SettingsManager.remove(
      objectKey
    );


  } catch(error) {


    Logger.log(
      `[FAIL] 테스트 오류: ${error.message}`
    );


  }


  Logger.log(
    '=== SettingsManager 테스트 완료 ==='
  );

}