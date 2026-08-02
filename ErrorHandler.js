/**
 * @fileoverview HLAS ErrorHandler
 * Exception Policy Management Module
 */


const ErrorHandler = {


  /**
   * Error 처리
   *
   * @param {Error} error
   * @param {string} context
   * @returns {Error}
   */
  handle: function(
    error,
    context
  ){

    const handledError =
      this.createError(
        error
      );


    CoreError.handle(
      handledError,
      context || 'SYSTEM'
    );


    return handledError;

  },



  /**
   * Exception 포함 실행
   *
   * @param {Function} callback
   * @param {string} context
   */
  execute: function(
    callback,
    context
  ){

    try{


      return callback();


    }
    catch(error){


      const handledError =
        this.handle(
          error,
          context
        );


      throw handledError;


    }

  },



  /**
   * Error 생성
   */
  createError: function(
    error
  ){


    if(
      this.isCoreError(error)
    ){

      return error;

    }


    return CoreError.create(

      'UNKNOWN_ERROR',

      error && error.message
        ? error.message
        : String(error)

    );


  },



  /**
   * CoreError 판별
   */
  isCoreError: function(
    error
  ){


    return !!(

      error
      &&
      error.code
      &&
      error.message

    );


  }


};