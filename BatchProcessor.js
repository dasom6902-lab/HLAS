/**
 * @fileoverview HLAS Batch Processor
 *
 * Spreadsheet Batch 처리 공통 Module
 *
 * Architecture:
 *
 * Manager Layer
 *
 * ↓
 *
 * BatchProcessor
 *
 * ↓
 *
 * Spreadsheet Service
 *
 */


const BatchProcessor = {



  /**
   * Batch Read
   *
   * @param {Sheet} sheet
   * @param {number} startRow
   * @param {number} startColumn
   * @param {number} numRows
   * @param {number} numColumns
   *
   * @returns {Array}
   */
  read: function(
    sheet,
    startRow,
    startColumn,
    numRows,
    numColumns
  ){


    try {


      if(
        !sheet
      ){

        throw new Error(
          'Sheet is required'
        );

      }



      return sheet
        .getRange(
          startRow,
          startColumn,
          numRows,
          numColumns
        )
        .getValues();



    }
    catch(error){


      this._handleError(
        error,
        'BatchProcessor.read'
      );


      throw error;


    }


  },




  /**
   * Batch Write
   *
   * @param {Sheet} sheet
   * @param {number} startRow
   * @param {number} startColumn
   * @param {Array} values
   */
  write: function(
    sheet,
    startRow,
    startColumn,
    values
  ){


    try {


      if(
        !sheet
      ){

        throw new Error(
          'Sheet is required'
        );

      }



      if(
        !values ||
        values.length === 0
      ){

        return;


      }



      const rows =
        values.length;



      const columns =
        values[0].length;



      sheet
        .getRange(
          startRow,
          startColumn,
          rows,
          columns
        )
        .setValues(
          values
        );



    }
    catch(error){


      this._handleError(
        error,
        'BatchProcessor.write'
      );


      throw error;


    }


  },




  /**
   * Batch Append
   *
   * 기존 appendRow 대체
   */
  appendRows: function(
    sheet,
    values
  ){


    this.write(
      sheet,
      sheet.getLastRow() + 1,
      1,
      values
    );


  },




  /**
   * Error 처리
   */
  _handleError:function(
    error,
    context
  ){


    try {


      if(
        typeof ErrorHandler !== 'undefined'
      ){

        ErrorHandler.handle(
          error,
          context
        );


      }
      else{


        Logger.log(
          `[${context}] ${error.message}`
        );


      }



    }
    catch(logError){


      Logger.log(
        `[BatchProcessor] ${logError.message}`
      );


    }


  }


};