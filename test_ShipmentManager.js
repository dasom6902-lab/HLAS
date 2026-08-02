function test_ShipmentManager() {


  Logger.log(
    '=== ShipmentManager 테스트 시작 ==='
  );


  try {


    const shipmentId =
      ShipmentManager.createShipment({

        orderId:'ORD-TEST-001',

        pickingId:'PICK-TEST-001',

        deliveryType:'NORMAL'

      });


    Logger.log(
      `[PASS] Shipment 생성 : ${shipmentId}`
    );



    const shipment =
      ShipmentManager.getShipment(
        shipmentId
      );


    if (
      shipment &&
      shipment.shipmentId === shipmentId
    ) {

      Logger.log(
        '[PASS] Shipment 조회 정상'
      );

    }



    const updated =
      ShipmentManager.updateStatus(
        shipmentId,
        SHIPMENT_STATUS.SHIPPED
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
    '=== ShipmentManager 테스트 완료 ==='
  );

}