/**
 * @fileoverview HLAS Security & Access Control Test
 */


/**
 * Security Test Main
 */
function test_SecurityAccess() {


  Logger.log(
    '=== HLAS Security Test 시작 ==='
  );


  try {


    testSensitiveDataDetection();


    testCredentialDetection();


    testErrorMessageExposure();


    testSettingsAccess();



  } catch(error) {


    Logger.log(
      `[FAIL] Security Test 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== HLAS Security Test 완료 ==='
  );


}



/**
 * 개인정보 탐지 검증
 */
function testSensitiveDataDetection() {


  const sensitiveMessages = [


    '홍길동 주민번호 900101-1234567',

    '전화번호 010-1234-5678',

    '계좌번호 123-456-789'


  ];



  sensitiveMessages.forEach(

    function(message){


      if (
        !_containsSensitiveData(message)
      ) {


        throw new Error(
          `민감정보 탐지 실패 : ${message}`
        );


      }


    }

  );



  Logger.log(
    '[PASS] 개인정보 패턴 탐지 정상'
  );


}



/**
 * 인증정보 탐지 검증
 */
function testCredentialDetection() {


  const credentials = [


    'TOKEN=abcdef',

    'PASSWORD=test123',

    'API_KEY=xxxx',

    'SECRET=value'


  ];



  credentials.forEach(

    function(message){


      if (
        !_containsCredential(message)
      ) {


        throw new Error(
          `인증정보 탐지 실패 : ${message}`
        );


      }


    }

  );



  Logger.log(
    '[PASS] 인증정보 패턴 탐지 정상'
  );


}



/**
 * Error Message 검증
 */
function testErrorMessageExposure() {


  const error =
    CoreError.create(

      'SECURITY_TEST',

      'Internal system error'

    );



  const handled =
    ErrorHandler.handle(

      error,

      'SecurityTest'

    );



  if (
    handled.code ===
    'SECURITY_TEST'
  ) {


    Logger.log(
      '[PASS] Error Message 처리 정상'
    );


  }


}



/**
 * Settings 접근 검증
 */
function testSettingsAccess() {


  const key =
    'SECURITY_TEST_KEY';



  SettingsManager.set(

    key,

    'TEST_VALUE'

  );



  const value =
    SettingsManager.get(
      key
    );



  if (
    value === 'TEST_VALUE'
  ) {


    Logger.log(
      '[PASS] Settings 접근 정상'
    );


  }


}



/**
 * 개인정보 패턴 검사
 */
function _containsSensitiveData(message) {


  return (

    /\d{6}-\d{7}/.test(message)

    ||

    /010-\d{4}-\d{4}/.test(message)

    ||

    /\d{3}-\d{3}-\d{3}/.test(message)

  );


}



/**
 * 인증정보 패턴 검사
 */
function _containsCredential(message) {


  return (

    /TOKEN/i.test(message)

    ||

    /PASSWORD/i.test(message)

    ||

    /API_KEY/i.test(message)

    ||

    /SECRET/i.test(message)

  );


}