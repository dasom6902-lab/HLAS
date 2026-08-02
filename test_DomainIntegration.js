function test_DomainIntegration() {


  Logger.log(
    '=== HLAS Domain Integration Test 시작 ==='
  );


  try {


    // 1. Order 생성

    const orderId =
      OrderManager.createOrder({

        supplier:'TEST_SUPPLIER',

        itemCode:'ITEM-INTEGRATION-001',

        itemName:'INTEGRATION_ITEM',

        quantity:100

      });


    Logger.log(
      `[PASS] Order 생성 : ${orderId}`
    );



    // 2. Picking 생성

    const pickingId =
      PickingManager.createPicking({

        orderId:orderId,

        itemCode:'ITEM-INTEGRATION-001',

        itemName:'INTEGRATION_ITEM',

        quantity:50

      });


    Logger.log(
      `[PASS] Picking 생성 : ${pickingId}`
    );



    // 3. Inventory 등록

    InventoryManager.createInventory({

      itemCode:'ITEM-INTEGRATION-001',

      itemName:'INTEGRATION_ITEM',

      quantity:100,

      location:'A-01'

    });


    Logger.log(
      '[PASS] Inventory 생성'
    );



    InventoryManager.adjustStock(

      'ITEM-INTEGRATION-001',

      -50

    );


    const inventory =
      InventoryManager.getInventory(
        'ITEM-INTEGRATION-001'
      );


    if (
      inventory.quantity === 50
    ) {

      Logger.log(
        '[PASS] Inventory 차감 정상'
      );

    }



    // 4. Shipment 생성

    const shipmentId =
      ShipmentManager.createShipment({

        orderId:orderId,

        pickingId:pickingId,

        deliveryType:'NORMAL'

      });


    Logger.log(
      `[PASS] Shipment 생성 : ${shipmentId}`
    );



  } catch(error) {


    Logger.log(
      `[FAIL] Integration 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== HLAS Domain Integration Test 완료 ==='
  );

}