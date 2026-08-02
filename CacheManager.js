/**
 * @fileoverview HLAS Cache Manager
 *
 * Cache Policy Standard Module
 *
 * Architecture:
 *
 * Manager
 *
 * ↓
 *
 * CacheManager
 *
 * ↓
 *
 * CacheService
 *
 * ↓
 *
 * CacheMetricManager
 */


const CacheManager = {



  PREFIX:
    'HLAS',




  /**
   * Cache 저장
   */
  set:function(
    domain,
    key,
    value,
    ttl
  ){


    const cacheKey =
      this.createKey(
        domain,
        key
      );



    const cache =
      CacheService
      .getScriptCache();



    cache.put(

      cacheKey,

      JSON.stringify(
        value
      ),

      ttl || 300

    );



    if(
      typeof CacheMetricManager !== 'undefined'
    ){

      CacheMetricManager
      .recordCreate(

        domain,

        key

      );

    }



    return true;


  },




  /**
   * Cache 조회
   */
  get:function(
    domain,
    key
  ){


    const cacheKey =
      this.createKey(
        domain,
        key
      );



    const cache =
      CacheService
      .getScriptCache();



    const value =
      cache.get(
        cacheKey
      );



    if(
      value === null
    ){


      if(
        typeof CacheMetricManager !== 'undefined'
      ){

        CacheMetricManager
        .recordMiss(

          domain,

          key

        );

      }



      return null;


    }



    if(
      typeof CacheMetricManager !== 'undefined'
    ){

      CacheMetricManager
      .recordHit(

        domain,

        key

      );

    }



    return JSON.parse(
      value
    );


  },




  /**
   * Cache 삭제
   */
  remove:function(
    domain,
    key
  ){


    const cacheKey =
      this.createKey(
        domain,
        key
      );



    CacheService
    .getScriptCache()
    .remove(
      cacheKey
    );



    if(
      typeof CacheMetricManager !== 'undefined'
    ){

      CacheMetricManager
      .recordInvalidate(

        domain,

        key

      );

    }



    return true;


  },




  /**
   * Cache Key 생성
   */
  createKey:function(
    domain,
    key
  ){


    return [

      this.PREFIX,

      String(domain)
      .toUpperCase(),

      String(key)
      .toUpperCase(),

      'V1'

    ]
    .join(':');


  },




  /**
   * Cache 존재 확인
   */
  exists:function(
    domain,
    key
  ){


    return this.get(

      domain,

      key

    ) !== null;


  }



};