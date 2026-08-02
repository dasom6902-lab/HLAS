/**
 * @fileoverview HLAS Scheduler Manager
 * 운영 자동화 실행 Module
 */


const SchedulerManager = {


  /**
   * Daily Automation 실행
   */
  runDailyTask: function() {


    this.runDashboardRefresh();


    this.runInventoryCheck();


    this.runAlertCheck();


    return true;


  },



  /**
   * Dashboard Refresh
   */
  runDashboardRefresh: function() {


    if(
      typeof DashboardManager === 'undefined'
    ){

      return false;

    }


    DashboardManager.refresh();


    this._writeHistory(
      'DASHBOARD_REFRESH'
    );


    return true;


  },



  /**
   * Inventory Check
   */
  runInventoryCheck: function() {


    if(
      typeof AlertManager === 'undefined'
    ){

      return false;

    }


    AlertManager.checkInventoryAlert();


    this._writeHistory(
      'INVENTORY_CHECK'
    );


    return true;


  },



  /**
   * Alert Check
   */
  runAlertCheck: function() {


    if(
      typeof AlertManager === 'undefined'
    ){

      return false;

    }


    AlertManager.checkOperationalAlert();


    this._writeHistory(
      'ALERT_CHECK'
    );


    return true;


  },



  /**
   * 실행 History 기록
   */
  _writeHistory: function(
    task
  ){


    const sheet =
      _getSchedulerSheet();



    sheet.appendRow([

      new Date(),

      task,

      'SUCCESS'

    ]);


  },



  /**
   * History 조회
   */
  getExecutionHistory: function(){


    const sheet =
      _getSchedulerSheet();



    const values =
      sheet
        .getDataRange()
        .getValues();



    return values.slice(1);


  }


};




/**
 * Scheduler Sheet 반환
 */
function _getSchedulerSheet(){


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();



  let sheet =
    ss.getSheetByName(
      'SCHEDULER_LOG'
    );



  if(!sheet){


    sheet =
      ss.insertSheet(
        'SCHEDULER_LOG'
      );


    sheet.appendRow([

      'TIME',

      'TASK',

      'STATUS'

    ]);


  }



  return sheet;


}