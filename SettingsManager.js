/**
 * @fileoverview HLAS Settings Manager
 * System Configuration Access Layer
 *
 * 책임:
 * - 설정 데이터 조회
 * - 설정 데이터 저장
 * - 설정 데이터 삭제
 * - PropertiesService 접근 추상화
 */


const SettingsManager = {


  /**
   * 설정 조회
   *
   * @param {string} key
   * @returns {*}
   */
  get: function(key) {


    this._validateKey(key);


    try {


      const properties =
        PropertiesService
          .getScriptProperties();



      const value =
        properties.getProperty(key);



      if(
        value === null
      ){

        return null;

      }



      /*
       * JSON Object 복원 시도
       *
       * Object 저장:
       * JSON.parse 가능
       *
       * 일반 String:
       * 원본 반환
       */
      try{


        return JSON.parse(
          value
        );


      }
      catch(e){


        return value;


      }



    }
    catch(error){


      throw new Error(

        `[SettingsManager] Get failed : ${error.message}`

      );


    }


  },



  /**
   * 설정 저장
   *
   * @param {string} key
   * @param {*} value
   */
  set: function(
    key,
    value
  ){


    this._validateKey(key);


    try {


      const properties =
        PropertiesService
          .getScriptProperties();



      let saveValue;



      if(
        typeof value === 'object'
        &&
        value !== null
      ){

        saveValue =
          JSON.stringify(
            value
          );


      }
      else{


        saveValue =
          String(value);


      }



      properties.setProperty(

        key,

        saveValue

      );



    }
    catch(error){


      throw new Error(

        `[SettingsManager] Set failed : ${error.message}`

      );


    }


  },



  /**
   * 설정 삭제
   *
   * @param {string} key
   */
  remove: function(key){


    this._validateKey(key);



    try{


      const properties =
        PropertiesService
          .getScriptProperties();



      properties.deleteProperty(

        key

      );



    }
    catch(error){


      throw new Error(

        `[SettingsManager] Remove failed : ${error.message}`

      );


    }


  },



  /**
   * 설정 Key 존재 여부 확인
   *
   * @param {string} key
   * @returns {boolean}
   */
  exists: function(key){


    this._validateKey(key);



    try{


      const value =
        this.get(
          key
        );



      return value !== null;



    }
    catch(error){


      throw new Error(

        `[SettingsManager] Exists failed : ${error.message}`

      );


    }


  },



  /**
   * Key Validation
   *
   * @param {string} key
   */
  _validateKey: function(key){


    if(
      !key
      ||
      typeof key !== 'string'
    ){

      throw new Error(

        'Settings key required'

      );

    }


  }


};