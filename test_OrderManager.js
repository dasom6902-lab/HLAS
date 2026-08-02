function test_OrderManager() {


  Logger.log(
    '=== OrderManager 테스트 시작 ==='
  );


  try {


    const orderId =
      OrderManager.createOrder({

        supplier:'TEST_SUPPLIER',

        itemCode:'ITEM001',

        itemName:'TEST_ITEM',

        quantity:10

      });


    Logger.log(
      `[PASS] Order 생성 : ${orderId}`
    );



    const order =
      OrderManager.getOrder(
        orderId
      );


    if (
      order &&
      order.orderId === orderId
    ) {

      Logger.log(
        '[PASS] Order 조회 정상'
      );

    }



    const updated =
      OrderManager.updateStatus(
        orderId,
        ORDER_STATUS.CONFIRMED
      );


    if (updated) {

      Logger.log(
        '[PASS] Status 변경 정상'
      );

    }


  } catch(error) {


    Logger.log(
      `[FAIL] 테스트 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== OrderManager 테스트 완료 ==='
  );

}