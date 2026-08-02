/**
 * @fileoverview HLAS Notification Manager
 * Alert Notification 전달 Module
 */


const NotificationManager = {


  /**
   * Notification 기본 전송
   *
   * @param {Object} notification
   */
  send: function(notification) {


    if (!notification) {

      throw new Error(
        '[NotificationManager] Notification required'
      );

    }


    this.writeLog(
      notification
    );


    return true;

  },



  /**
   * Alert Notification 전송
   *
   * @param {Object} alert
   */
  sendAlert: function(alert) {


    if (!alert) {

      throw new Error(
        '[NotificationManager] Alert required'
      );

    }


    return this.send({

      type:'ALERT',

      code:alert.code,

      level:alert.level,

      message:alert.message

    });


  },



  /**
   * Email Channel
   */
  sendEmail: function(
    message
  ) {


    this.writeLog({

      type:'EMAIL',

      message:message

    });


    return true;

  },



  /**
   * Chat Channel
   */
  sendChat: function(
    message
  ) {


    this.writeLog({

      type:'CHAT',

      message:message

    });


    return true;

  },



  /**
   * Notification Log 저장
   */
  writeLog: function(
    notification
  ) {


    const sheet =
      _getNotificationSheet();



    sheet.appendRow([

      new Date(),

      notification.type || '',

      notification.code || '',

      notification.level || '',

      notification.message || ''

    ]);


  },



  /**
   * History 조회
   */
  getHistory: function() {


    const sheet =
      _getNotificationSheet();



    const values =
      sheet
        .getDataRange()
        .getValues();



    return values.slice(1);

  }


};



/**
 * Notification Sheet 반환
 */
function _getNotificationSheet() {


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();



  let sheet =
    ss.getSheetByName(
      'NOTIFICATION'
    );



  if(!sheet){


    sheet =
      ss.insertSheet(
        'NOTIFICATION'
      );


    sheet.appendRow([

      'TIME',

      'TYPE',

      'CODE',

      'LEVEL',

      'MESSAGE'

    ]);


  }



  return sheet;


}