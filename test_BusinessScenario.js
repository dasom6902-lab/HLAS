/**
 * @fileoverview HLAS Business Scenario Test
 */


/**
 * Business Scenario Test
 *
 * Scenario-01
 * 정상 출고 Flow
 *
 * Scenario-02
 * 재고 부족 Exception Flow
 */
function test_BusinessScenario() {


  Logger.log(
    '=== HLAS Business Scenario Test 시작 ==='
  );


  try {


    /*
     * Scenario-01
     * 정상 Flow
     */


    const itemCode =
      'ITEM-BUSINESS-' +
      Utilities.formatDate(
        new Date(),
        'Asia/Seoul',
        'HHmmss'
      );



    InventoryManager.createInventory({

      itemCode:itemCode,

      itemName:'BUSINESS_ITEM',

      quantity:100,

      location:'A-01'

    });



    Logger.log(
      '[PASS] 정상 재고 생성'
    );



    const orderId =
      OrderManager.createOrder({

        supplier:'TEST_SUPPLIER',

        itemCode:itemCode,

        itemName:'BUSINESS_ITEM',

        quantity:30

      });



    Logger.log(
      `[PASS] 정상 주문 생성 : ${orderId}`
    );



    const pickingId =
      PickingManager.createPicking({

        orderId:orderId,

        itemCode:itemCode,

        itemName:'BUSINESS_ITEM',

        quantity:30

      });



    Logger.log(
      `[PASS] 정상 집품 생성 : ${pickingId}`
    );



    InventoryManager.adjustStock(

      itemCode,

      -30

    );



    const inventory =
      InventoryManager.getInventory(
        itemCode
      );



    if (
      Number(inventory.quantity) === 70
    ) {


      Logger.log(
        '[PASS] 정상 재고 차감'
      );


    } else {


      throw new Error(
        `재고 차감 결과 오류 : ${inventory.quantity}`
      );


    }



    const shipmentId =
      ShipmentManager.createShipment({

        orderId:orderId,

        pickingId:pickingId,

        deliveryType:'NORMAL'

      });



    Logger.log(
      `[PASS] 정상 출고 생성 : ${shipmentId}`
    );




    /*
     * Scenario-02
     * 재고 부족 Flow
     */


    try {


      const shortageItem =
        'ITEM-SOLDOUT-' +
        Utilities.formatDate(
          new Date(),
          'Asia/Seoul',
          'HHmmss'
        );



      InventoryManager.createInventory({

        itemCode:shortageItem,

        itemName:'SOLDOUT_ITEM',

        quantity:10,

        location:'B-01'

      });



      const stock =
        InventoryManager.getInventory(
          shortageItem
        );



      if (
        Number(stock.quantity) < 50
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

          'BusinessScenario'

        );



      if (
        handledError.code ===
        'STOCK_SHORTAGE'
      ) {


        Logger.log(
          '[PASS] 재고 부족 Exception 처리'
        );


      } else {


        throw handledError;


      }


    }



  } catch(error) {


    Logger.log(
      `[FAIL] Business Scenario 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== HLAS Business Scenario Test 완료 ==='
  );


}