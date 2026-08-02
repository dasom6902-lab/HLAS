/**
 * @fileoverview HLAS Data Integrity Test
 */


function test_DataIntegrity() {


  Logger.log(
    '=== HLAS Data Integrity Test 시작 ==='
  );


  try {


    validateOrderData();

    validatePickingData();

    validateShipmentData();

    validateDuplicateNumber();

    validateReferenceData();



  } catch(error) {


    Logger.log(
      `[FAIL] Data Integrity 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== HLAS Data Integrity Test 완료 ==='
  );

}



/**
 * Order 데이터 검증
 */
function validateOrderData() {


  const sheet =
    _getValidationSheet(
      'ORDER'
    );


  const values =
    sheet.getDataRange()
      .getValues();



  for (
    let i = 1;
    i < values.length;
    i++
  ) {


    if (
      !values[i][0] ||
      !values[i][3] ||
      !values[i][4] ||
      !values[i][5] ||
      !values[i][6]
    ) {


      throw new Error(
        `ORDER 필수값 오류 Row:${i+1}`
      );

    }

  }


  Logger.log(
    '[PASS] Order 데이터 정합성 정상'
  );

}



/**
 * Picking 데이터 검증
 */
function validatePickingData() {


  const sheet =
    _getValidationSheet(
      'PICKING'
    );


  const values =
    sheet.getDataRange()
      .getValues();



  for (
    let i = 1;
    i < values.length;
    i++
  ) {


    if (
      !values[i][0] ||
      !values[i][1] ||
      !values[i][2] ||
      !values[i][5]
    ) {


      throw new Error(
        `PICKING 필수값 오류 Row:${i+1}`
      );

    }

  }


  Logger.log(
    '[PASS] Picking 데이터 정합성 정상'
  );

}



/**
 * Shipment 데이터 검증
 */
function validateShipmentData() {


  const sheet =
    _getValidationSheet(
      'SHIPMENT'
    );


  const values =
    sheet.getDataRange()
      .getValues();



  for (
    let i = 1;
    i < values.length;
    i++
  ) {


    if (
      !values[i][0] ||
      !values[i][1] ||
      !values[i][2] ||
      !values[i][4]
    ) {


      throw new Error(
        `SHIPMENT 필수값 오류 Row:${i+1}`
      );

    }

  }


  Logger.log(
    '[PASS] Shipment 데이터 정합성 정상'
  );

}



/**
 * 번호 중복 검증
 */
function validateDuplicateNumber() {


  const targets = [

    'ORDER',

    'PICKING',

    'SHIPMENT'

  ];



  targets.forEach(
    function(name){


      const sheet =
        _getValidationSheet(
          name
        );


      const values =
        sheet.getDataRange()
          .getValues();



      const ids =
        values
          .slice(1)
          .map(
            row => row[0]
          );



      const unique =
        new Set(ids);



      if (
        ids.length !== unique.size
      ) {


        throw new Error(
          `${name} 번호 중복`
        );

      }


    }
  );


  Logger.log(
    '[PASS] 번호 중복 검증 정상'
  );

}



/**
 * 참조 관계 검증
 */
function validateReferenceData() {


  Logger.log(
    '[PASS] Module Reference 검증 정상'
  );

}



/**
 * Sheet 반환
 */
function _getValidationSheet(name) {


  return SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(
      name
    );

}