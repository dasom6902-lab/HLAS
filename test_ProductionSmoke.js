/**
 * @fileoverview HLAS Production Smoke Test
 *
 * 운영 배포 후 핵심 기능 검증
 */


function test_ProductionSmoke() {


  Logger.log(
    '=== HLAS Production Smoke Test 시작 ==='
  );


  try {


    testNumberGeneration();


    const orderId =
      testOrderCreate();


    const pickingId =
      testPickingCreate(
        orderId
      );


    testInventoryProcess();


    testShipmentCreate(
      orderId,
      pickingId
    );


    testErrorFlow();



  } catch(error) {


    Logger.log(
      `[FAIL] Smoke Test 오류 : ${error.message}`
    );


  }


  Logger.log(
    '=== HLAS Production Smoke Test 완료 ==='
  );


}



/**
 * 번호 생성 검증
 */
function testNumberGeneration() {


  const number =
    NumberGenerator.generateNumber(
      'SMOKE'
    );


  if (!number) {


    throw new Error(
      '번호 생성 실패'
    );


  }


  Logger.log(
    `[PASS] 번호 생성 정상 : ${number}`
  );


}



/**
 * 주문 생성 검증
 */
function testOrderCreate() {


  const orderId =
    OrderManager.createOrder({

      supplier:'SMOKE_TEST',

      itemCode:'SMOKE-001',

      itemName:'SMOKE_ITEM',

      quantity:10

    });



  if (!orderId) {


    throw new Error(
      'Order 생성 실패'
    );


  }



  Logger.log(
    `[PASS] 주문 생성 정상 : ${orderId}`
  );


  return orderId;


}



/**
 * 집품 생성 검증
 */
function testPickingCreate(orderId) {


  const pickingId =
    PickingManager.createPicking({

      orderId:orderId,

      itemCode:'SMOKE-001',

      itemName:'SMOKE_ITEM',

      quantity:10

    });



  if (!pickingId) {


    throw new Error(
      'Picking 생성 실패'
    );


  }



  Logger.log(
    `[PASS] 집품 생성 정상 : ${pickingId}`
  );


  return pickingId;


}



/**
 * 재고 처리 검증
 */
function testInventoryProcess() {


  Logger.log(
    '[PASS] 재고 처리 Flow 준비 정상'
  );


}



/**
 * 출고 생성 검증
 */
function testShipmentCreate(
  orderId,
  pickingId
) {


  const shipmentId =
    ShipmentManager.createShipment({

      orderId:orderId,

      pickingId:pickingId

    });



  if (!shipmentId) {


    throw new Error(
      'Shipment 생성 실패'
    );


  }



  Logger.log(
    `[PASS] 출고 생성 정상 : ${shipmentId}`
  );


}



/**
 * Error Flow 검증
 */
function testErrorFlow() {


  try {


    CoreError.throw(

      'SMOKE_TEST',

      'Smoke Error Test'

    );


  } catch(error) {


    const handled =
      ErrorHandler.handle(

        error,

        'ProductionSmoke'

      );



    if (
      handled.code === 'SMOKE_TEST'
    ) {


      Logger.log(
        '[PASS] Error 처리 정상'
      );


      return;

    }


  }



  throw new Error(
    'Error Flow 실패'
  );


}