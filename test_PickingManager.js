function test_PickingManager() {


  Logger.log(
    '=== PickingManager 테스트 시작 ==='
  );


  try {


    const pickingId =
      PickingManager.createPicking({

        orderId:'ORD-TEST-001',

        itemCode:'ITEM001',

        itemName:'TEST_ITEM',

        quantity:5

      });


    Logger.log(
      `[PASS] Picking 생성 : ${pickingId}`
    );



    const picking =
      PickingManager.getPicking(
        pickingId
      );


    if (
      picking &&
      picking.pickingId === pickingId
    ) {

      Logger.log(
        '[PASS] Picking 조회 정상'
      );

    }



    const updated =
      PickingManager.updateStatus(
        pickingId,
        PICKING_STATUS.COMPLETED
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
    '=== PickingManager 테스트 완료 ==='
  );

}