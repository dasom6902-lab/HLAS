/**
 * @fileoverview HLAS Batch Processor Test
 */


/**
 * BatchProcessor Test Main
 */
function test_BatchProcessor(){


  Logger.log(
    '=== BatchProcessor 테스트 시작 ==='
  );


  try{


    testBatchProcessorModule();


    testBatchWrite();


    testBatchRead();


    testBatchAppend();



  }
  catch(error){


    Logger.log(
      `[FAIL] BatchProcessor Test 오류 : ${error.message}`
    );


  }



  Logger.log(
    '=== BatchProcessor 테스트 완료 ==='
  );


}



/**
 * Module 존재 확인
 */
function testBatchProcessorModule(){


  if(
    typeof BatchProcessor === 'undefined'
  ){

    throw new Error(
      'BatchProcessor Module 없음'
    );

  }



  Logger.log(
    '[PASS] BatchProcessor Module 존재'
  );


}



/**
 * Batch Write 테스트
 */
function testBatchWrite(){


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();



  const sheet =
    ss.insertSheet(
      'TEST_BATCH_WRITE'
    );



  const values = [

    [
      'A',
      'B',
      'C'
    ],

    [
      1,
      2,
      3
    ]

  ];



  BatchProcessor.write(
    sheet,
    1,
    1,
    values
  );



  const result =
    sheet
      .getRange(
        1,
        1,
        2,
        3
      )
      .getValues();



  if(
    result[1][0] !== 1
  ){

    throw new Error(
      'Batch Write 결과 오류'
    );

  }



  Logger.log(
    '[PASS] Batch Write 정상'
  );


}




/**
 * Batch Read 테스트
 */
function testBatchRead(){


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();



  const sheet =
    ss.getSheetByName(
      'TEST_BATCH_WRITE'
    );



  const result =
    BatchProcessor.read(
      sheet,
      1,
      1,
      2,
      3
    );



  if(
    result.length !== 2
  ){

    throw new Error(
      'Batch Read 결과 오류'
    );

  }



  Logger.log(
    '[PASS] Batch Read 정상'
  );


}




/**
 * Batch Append 테스트
 */
function testBatchAppend(){


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();



  const sheet =
    ss.getSheetByName(
      'TEST_BATCH_WRITE'
    );



  BatchProcessor.appendRows(
    sheet,
    [
      [
        'APPEND',
        'TEST',
        1
      ]
    ]
  );



  Logger.log(
    '[PASS] Batch Append 정상'
  );


}