function test_InventoryManager() {


  Logger.log(
    '=== InventoryManager 테스트 시작 ==='
  );


  try {


    const itemCode =
      'ITEM-TEST-001';


    InventoryManager.createInventory({

      itemCode:itemCode,

      itemName:'TEST_ITEM',

      quantity:100,

      location:'A-01'

    });


    Logger.log(
      '[PASS] 재고 등록 정상'
    );



    const inventory =
      InventoryManager.getInventory(
        itemCode
      );


    if (
      inventory &&
      inventory.quantity === 100
    ) {

      Logger.log(
        '[PASS] 재고 조회 정상'
      );

    }



    InventoryManager.adjustStock(
      itemCode,
      -30
    );


    const updated =
      InventoryManager.getInventory(
        itemCode
      );


    if (
      updated.quantity === 70
    ) {

      Logger.log(
        '[PASS] 재고 증감 정상'
      );

    }



    InventoryManager.updateQuantity(
      itemCode,
      5
    );


    const lowStock =
      InventoryManager.getInventory(
        itemCode
      );


    if (
      lowStock.status ===
      INVENTORY_STATUS.LOW_STOCK
    ) {

      Logger.log(
        '[PASS] 재고 상태 변경 정상'
      );

    }



  } catch(error) {


    Logger.log(
      `[FAIL] 테스트 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== InventoryManager 테스트 완료 ==='
  );

}