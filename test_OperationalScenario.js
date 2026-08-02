/**
 * @fileoverview HLAS Operational Scenario Test
 *
 * 운영 예외 상황 검증
 *
 * Scenario-01
 * Order Cancel
 *
 * Scenario-02
 * Picking Failed
 *
 * Scenario-03
 * Shipment Cancel
 *
 * Scenario-04
 * Stock Shortage Error Flow
 */


function test_OperationalScenario() {


  Logger.log(
    '=== HLAS Operational Scenario Test 시작 ==='
  );


  try {


    /*
     * Scenario-01
     * Order Cancel Flow
     */


    const orderId =
      OrderManager.createOrder({

        supplier:'TEST_SUPPLIER',

        itemCode:'ITEM-CANCEL-001',

        itemName:'CANCEL_ITEM',

        quantity:20

      });


    Logger.log(
      `[PASS] Order 생성 : ${orderId}`
    );



    const orderCancelled =
      OrderManager.updateStatus(

        orderId,

        'CANCELLED'

      );



    if (orderCancelled) {


      const order =
        OrderManager.getOrder(
          orderId
        );


      if (
        order.status === 'CANCELLED'
      ) {


        Logger.log(
          '[PASS] Order 취소 처리 정상'
        );


      }


    }




    /*
     * Scenario-02
     * Picking Failed Flow
     */


    const pickingId =
      PickingManager.createPicking({

        orderId:orderId,

        itemCode:'ITEM-CANCEL-001',

        itemName:'CANCEL_ITEM',

        quantity:20

      });



    Logger.log(
      `[PASS] Picking 생성 : ${pickingId}`
    );



    const pickingFailed =
      PickingManager.updateStatus(

        pickingId,

        'FAILED'

      );



    if (pickingFailed) {


      const picking =
        PickingManager.getPicking(
          pickingId
        );


      if (
        picking.status === 'FAILED'
      ) {


        Logger.log(
          '[PASS] Picking 실패 처리 정상'
        );


      }


    }




    /*
     * Scenario-03
     * Shipment Cancel Flow
     */


    const shipmentId =
      ShipmentManager.createShipment({

        orderId:orderId,

        pickingId:pickingId,

        deliveryType:'NORMAL'

      });



    Logger.log(
      `[PASS] Shipment 생성 : ${shipmentId}`
    );



    const shipmentCancelled =
      ShipmentManager.updateStatus(

        shipmentId,

        'CANCELLED'

      );



    if (shipmentCancelled) {


      const shipment =
        ShipmentManager.getShipment(
          shipmentId
        );


      if (
        shipment.status === 'CANCELLED'
      ) {


        Logger.log(
          '[PASS] Shipment 취소 처리 정상'
        );


      }


    }




    /*
     * Scenario-04
     * Stock Shortage Error Flow
     */


    try {


      const itemCode =
        'ITEM-STOCK-ERROR-001';



      InventoryManager.createInventory({

        itemCode:itemCode,

        itemName:'SHORTAGE_ITEM',

        quantity:5,

        location:'C-01'

      });



      const inventory =
        InventoryManager.getInventory(
          itemCode
        );



      if (
        inventory.quantity < 20
      ) {


        CoreError.throw(

          'STOCK_SHORTAGE',

          '재고 부족'

        );


      }



    } catch(error) {


      const handledError =
        ErrorHandler.handle(

          error,

          'OperationalScenario'

        );



      if (
        handledError.code ===
        'STOCK_SHORTAGE'
      ) {


        Logger.log(
          '[PASS] 재고 부족 Error 처리 정상'
        );


      } else {


        throw handledError;


      }


    }



  } catch(error) {


    Logger.log(
      `[FAIL] Operational Scenario 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== HLAS Operational Scenario Test 완료 ==='
  );


}