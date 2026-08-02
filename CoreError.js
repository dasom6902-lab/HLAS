/**
 * @fileoverview HLAS Core Error Module
 * 오류 생성 및 처리 전담 Module
 */


const CoreError = {


  /**
   * 오류 객체 생성
   *
   * @param {string} code
   * @param {string} message
   * @returns {Error}
   */
  create: function(code, message) {

    const error =
      new Error(message || 'Unknown Error');


    error.code =
      code || 'UNKNOWN_ERROR';


    return error;

  },


  /**
   * 오류 발생
   *
   * @param {string} code
   * @param {string} message
   */
  throw: function(code, message) {

    throw CoreError.create(
      code,
      message
    );

  },


  /**
   * 오류 처리
   *
   * @param {Error} error
   * @param {string} context
   */
  handle: function(error, context) {


    const moduleName =
      context || 'SYSTEM';


    const message =
      error && error.message
        ? error.message
        : String(error);



    try {

      if (typeof writeError === 'function') {

        writeError(
          moduleName,
          `[${error.code || 'UNKNOWN'}] ${message}`
        );

      }


    } catch(logError) {

      Logger.log(
        `[CoreError] Log 실패: ${logError.message}`
      );

    }


    return error;

  }

};