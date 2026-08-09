/**
 * @fileoverview
 * HLAS-0069 Business Key Manager
 *
 * 역할:
 *
 * - Revision 관리 기준 Key 생성
 * - Event 데이터 표준 Key 변환
 * - Business Identity 제공
 */


const BusinessKeyManager = Object.freeze({



  /**
   * Business Key 생성
   *
   * @param {Object} event
   *
   * @return {string}
   */
  create:function(event){


    if(!event){

      throw new Error(
        'BUSINESS_KEY_EVENT_REQUIRED'
      );

    }



    const source =

      String(
        event.source || 'UNKNOWN'
      )
      .toUpperCase();



    const sheetName =

      String(
        event.sheetName || ''
      )
      .trim();



    const key =

      String(
        event.key || ''
      )
      .trim();



    if(!sheetName){

      throw new Error(
        'BUSINESS_KEY_SHEET_REQUIRED'
      );

    }



    if(!key){

      throw new Error(
        'BUSINESS_KEY_VALUE_REQUIRED'
      );

    }



    return (

      source
      +
      ':'
      +
      sheetName
      +
      ':'
      +
      key

    );


  },





  /**
   * Event 검증
   */
  validate:function(event){


    return {


      source:
        !!event.source,


      sheetName:
        !!event.sheetName,


      key:
        !!event.key


    };


  }





});