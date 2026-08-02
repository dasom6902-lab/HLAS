/**
 * @fileoverview HLAS Order Manager
 * 발주 Domain Module
 */


const OrderManager = {


  /**
   * 발주 생성
   *
   * @param {Object} orderData
   * @returns {string}
   */
  createOrder: function(orderData) {


    if (!orderData) {

      throw new Error(
        '[OrderManager] Order data required'
      );

    }


    const orderId =
      NumberGenerator.generateNumber(
        'ORD'
      );


    const sheet =
      _getOrderSheet();


    const now =
      new Date();


    sheet.appendRow([

      orderId,

      orderData.orderDate || now,

      orderData.supplier || '',

      orderData.itemCode || '',

      orderData.itemName || '',

      orderData.quantity || 0,

      ORDER_STATUS.CREATED,

      now,

      now

    ]);


    if (
      typeof writeInfo === 'function'
    ) {

      writeInfo(
        'OrderManager',
        `Order created : ${orderId}`
      );

    }


    return orderId;

  },



  /**
   * 발주 조회
   *
   * @param {string} orderId
   */
  getOrder: function(orderId) {


    const sheet =
      _getOrderSheet();


    const values =
      sheet.getDataRange()
        .getValues();


    for (
      let i = 1;
      i < values.length;
      i++
    ) {


      if (
        values[i][0] === orderId
      ) {


        return {

          orderId: values[i][0],
          orderDate: values[i][1],
          supplier: values[i][2],
          itemCode: values[i][3],
          itemName: values[i][4],
          quantity: values[i][5],
          status: values[i][6]

        };

      }

    }


    return null;

  },



  /**
   * 상태 변경
   *
   * @param {string} orderId
   * @param {string} status
   */
  updateStatus: function(
    orderId,
    status
  ) {


    const sheet =
      _getOrderSheet();


    const values =
      sheet.getDataRange()
        .getValues();


    for (
      let i = 1;
      i < values.length;
      i++
    ) {


      if (
        values[i][0] === orderId
      ) {


        sheet
          .getRange(
            i + 1,
            7
          )
          .setValue(status);


        sheet
          .getRange(
            i + 1,
            9
          )
          .setValue(
            new Date()
          );


        return true;

      }

    }


    return false;

  }


};




function _getOrderSheet() {


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      DOMAIN_SHEETS.ORDER
    );


  if (!sheet) {


    sheet =
      ss.insertSheet(
        DOMAIN_SHEETS.ORDER
      );


    sheet.appendRow([

      'ORDER_ID',
      'ORDER_DATE',
      'SUPPLIER',
      'ITEM_CODE',
      'ITEM_NAME',
      'QUANTITY',
      'STATUS',
      'CREATED_AT',
      'UPDATED_AT'

    ]);

  }


  return sheet;

}