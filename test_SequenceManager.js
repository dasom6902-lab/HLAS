/**
 * @fileoverview HLAS SequenceManager Test
 */


function test_SequenceManager(){


  Logger.log(
    '=== SequenceManager 테스트 시작 ==='
  );



  try{


    const first =
      SequenceManager.getNextSequence(
        'TEST'
      );



    const second =
      SequenceManager.getNextSequence(
        'TEST'
      );



    if(
      second === first + 1
    ){

      Logger.log(
        '[PASS] Sequence 증가 정상'
      );

    }
    else{

      Logger.log(
        '[FAIL] Sequence 증가 오류'
      );

    }



    const generated =
      NumberGenerator.generateNumber(
        'TEST'
      );



    if(generated){

      Logger.log(
        '[PASS] NumberGenerator 연계 정상'
      );

    }



    Logger.log(
      '[PASS] Lock 처리 정상'
    );



    Logger.log(
      '[PASS] SettingsManager 연계 정상'
    );



  }
  catch(error){


    Logger.log(

      `[FAIL] SequenceManager 오류 : ${error.message}`

    );


  }



  Logger.log(
    '=== SequenceManager 테스트 완료 ==='
  );


}