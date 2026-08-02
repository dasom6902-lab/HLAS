/**
 * @fileoverview HLAS KPIManager Test
 */


function test_KPIManager(){


  Logger.log(
    '=== KPIManager 테스트 시작 ==='
  );



  try{


    if(
      typeof KPIManager !== 'undefined'
    ){

      Logger.log(
        '[PASS] KPIManager Module 존재'
      );

    }



    const inventory =
      KPIManager.getInventoryKPI();



    if(
      inventory
    ){

      Logger.log(
        '[PASS] Inventory KPI 정상'
      );

    }



    const operational =
      KPIManager.getOperationalKPI();



    if(
      operational
    ){

      Logger.log(
        '[PASS] Operational KPI 정상'
      );

    }



    const summary =
      KPIManager.getSummary();



    if(
      summary
    ){

      Logger.log(
        '[PASS] KPI Summary 정상'
      );

    }



  }
  catch(error){


    Logger.log(

      `[FAIL] KPIManager 오류 : ${error.message}`

    );


  }



  Logger.log(
    '=== KPIManager 테스트 완료 ==='
  );


}