/**
 * @fileoverview HLAS Sequence Manager
 * Sequence 증가 및 Lock 관리 Module
 */


const SequenceManager = {


  /**
   * Sequence 증가
   *
   * 기존 Public API 유지
   *
   * @param {string} key
   * @returns {number}
   */
  getNextSequence: function(key) {


    if (!key) {

      throw new Error(
        '[SequenceManager] Sequence key required'
      );

    }



    const lock =
      LockService
        .getScriptLock();



    try {


      lock.waitLock(
        5000
      );



      const current =
        this.getSequence(
          key
        );



      const next =
        current + 1;



      this.setSequence(

        key,

        next

      );



      return next;



    }
    catch(error){


      throw new Error(

        `[SequenceManager] ${error.message}`

      );


    }
    finally{


      if(
        lock.hasLock()
      ){

        lock.releaseLock();

      }


    }


  },



  /**
   * Sequence 조회
   *
   * @param {string} key
   */
  getSequence: function(key){


    const value =
      SettingsManager.get(

        this._createKey(key)

      );



    return Number(
      value || 0
    );


  },



  /**
   * Sequence 저장
   *
   * @param {string} key
   * @param {number} value
   */
  setSequence: function(
    key,
    value
  ){


    SettingsManager.set(

      this._createKey(key),

      value

    );


  },



  /**
   * Sequence Property Key 생성
   */
  _createKey: function(key){


    return `SEQ_${key}`;


  }


};