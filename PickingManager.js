/**
 * @fileoverview HLAS Picking Manager
 * 사전집품 Domain Module
 */


const PickingManager = {


  /**
   * 집품 생성
   *
   * @param {Object} pickingData
   * @returns {string}
   */
  createPicking: function(pickingData) {


    if (!pickingData) {

      throw new Error(
        '[PickingManager] Picking data required'
      );

    }


    const pickingId =
      NumberGenerator.generateNumber(
        'PICK'
      );


    const sheet =
      _getPickingSheet();


    const now =
      new Date();


    sheet.appendRow([

      pickingId,

      pickingData.orderId || '',

      pickingData.itemCode || '',

      pickingData.itemName || '',

      pickingData.quantity || 0,

      PICKING_STATUS.CREATED,

      now,

      now

    ]);


    if (
      typeof writeInfo === 'function'
    ) {

      writeInfo(
        'PickingManager',
        `Picking created : ${pickingId}`
      );

    }


    return pickingId;

  },



  /**
   * 집품 조회
   *
   * @param {string} pickingId
   */
  getPicking: function(pickingId) {


    const sheet =
      _getPickingSheet();


    const values =
      sheet.getDataRange()
        .getValues();


    for (
      let i = 1;
      i < values.length;
      i++
    ) {


      if (
        values[i][0] === pickingId
      ) {


        return {

          pickingId: values[i][0],

          orderId: values[i][1],

          itemCode: values[i][2],

          itemName: values[i][3],

          quantity: values[i][4],

          status: values[i][5]

        };

      }

    }


    return null;

  },



  /**
   * 상태 변경
   *
   * @param {string} pickingId
   * @param {string} status
   */
  updateStatus: function(
    pickingId,
    status
  ) {


    const sheet =
      _getPickingSheet();


    const values =
      sheet.getDataRange()
        .getValues();


    for (
      let i = 1;
      i < values.length;
      i++
    ) {


      if (
        values[i][0] === pickingId
      ) {


        sheet
          .getRange(
            i + 1,
            6
          )
          .setValue(status);


        sheet
          .getRange(
            i + 1,
            8
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
 * PICKING Sheet 반환
 *
 * @returns {Sheet}
 */
function _getPickingSheet() {


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      PICKING_SHEETS.PICKING
    );


  if (!sheet) {


    sheet =
      ss.insertSheet(
        PICKING_SHEETS.PICKING
      );


    sheet.appendRow([

      'PICKING_ID',

      'ORDER_ID',

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