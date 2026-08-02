/**
 * @fileoverview HLAS Shipment Manager
 * 출고 관리 Domain Module
 */


const ShipmentManager = {


  /**
   * 출고 생성
   *
   * @param {Object} shipmentData
   * @returns {string}
   */
  createShipment: function(shipmentData) {


    if (!shipmentData) {

      throw new Error(
        '[ShipmentManager] Shipment data required'
      );

    }


    const shipmentId =
      NumberGenerator.generateNumber(
        'SHIP'
      );


    const sheet =
      _getShipmentSheet();


    const now =
      new Date();


    sheet.appendRow([

      shipmentId,

      shipmentData.orderId || '',

      shipmentData.pickingId || '',

      shipmentData.deliveryType || '',

      SHIPMENT_STATUS.CREATED,

      now,

      now

    ]);


    if (
      typeof writeInfo === 'function'
    ) {

      writeInfo(
        'ShipmentManager',
        `Shipment created : ${shipmentId}`
      );

    }


    return shipmentId;

  },



  /**
   * 출고 조회
   *
   * @param {string} shipmentId
   */
  getShipment: function(shipmentId) {


    const sheet =
      _getShipmentSheet();


    const values =
      sheet.getDataRange()
        .getValues();


    for (
      let i = 1;
      i < values.length;
      i++
    ) {


      if (
        values[i][0] === shipmentId
      ) {


        return {

          shipmentId: values[i][0],

          orderId: values[i][1],

          pickingId: values[i][2],

          deliveryType: values[i][3],

          status: values[i][4]

        };

      }

    }


    return null;

  },



  /**
   * 출고 상태 변경
   *
   * @param {string} shipmentId
   * @param {string} status
   */
  updateStatus: function(
    shipmentId,
    status
  ) {


    const sheet =
      _getShipmentSheet();


    const values =
      sheet.getDataRange()
        .getValues();


    for (
      let i = 1;
      i < values.length;
      i++
    ) {


      if (
        values[i][0] === shipmentId
      ) {


        sheet
          .getRange(
            i + 1,
            5
          )
          .setValue(status);


        sheet
          .getRange(
            i + 1,
            7
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




/**
 * SHIPMENT Sheet 반환
 *
 * @returns {Sheet}
 */
function _getShipmentSheet() {


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      SHIPMENT_SHEETS.SHIPMENT
    );


  if (!sheet) {


    sheet =
      ss.insertSheet(
        SHIPMENT_SHEETS.SHIPMENT
      );


    sheet.appendRow([

      'SHIPMENT_ID',

      'ORDER_ID',

      'PICKING_ID',

      'DELIVERY_TYPE',

      'STATUS',

      'CREATED_AT',

      'UPDATED_AT'

    ]);

  }


  return sheet;

}