/**
 * @fileoverview CacheService 기반 공통 Cache Manager.
 */

const CacheManager = Object.freeze({
  /**
   * 값을 Cache에 저장한다.
   *
   * @param {string} key Cache Key
   * @param {*} value 저장 값
   * @param {number=} ttlSeconds TTL
   * @return {boolean} 저장 성공
   */
  put: function (key, value, ttlSeconds) {
    const normalizedKey = buildFrameworkCacheKey_(key);
    const serialized = JSON.stringify(value);
    if (serialized.length > PMS_CONFIG.CACHE.MAX_VALUE_LENGTH) {
      throw new ValidationError(
        'Cache 값이 허용 크기를 초과했습니다.',
        'value',
        { length: serialized.length },
        'CACHE_VALUE_TOO_LARGE'
      );
    }
    CacheService.getScriptCache().put(
      normalizedKey,
      serialized,
      Number(ttlSeconds || PMS_CONFIG.CACHE.DEFAULT_TTL_SECONDS)
    );
    return true;
  },

  /**
   * Cache 값을 조회한다.
   *
   * @param {string} key Cache Key
   * @return {*|null} 복원된 값 또는 null
   */
  get: function (key) {
    const serialized = CacheService.getScriptCache().get(
      buildFrameworkCacheKey_(key)
    );
    return serialized === null ? null : JSON.parse(serialized);
  },

  /**
   * 지정 Cache를 삭제한다.
   *
   * @param {string} key Cache Key
   * @return {boolean} 삭제 성공
   */
  clearCache: function (key) {
    CacheService.getScriptCache().remove(buildFrameworkCacheKey_(key));
    return true;
  },

  /**
   * 여러 Cache 값을 한 번에 준비한다.
   *
   * @param {Object<string,*>} entries Key-Value Map
   * @param {number=} ttlSeconds TTL
   * @return {number} 저장 개수
   */
  warmup: function (entries, ttlSeconds) {
    const input = entries || {};
    Object.keys(input).forEach(function (key) {
      CacheManager.put(key, input[key], ttlSeconds);
    });
    return Object.keys(input).length;
  },

  /**
   * 큰 Object를 여러 Cache 조각으로 분할 저장한다.
   *
   * @param {string} key Cache Key
   * @param {Object} value 저장 Object
   * @param {number=} ttlSeconds TTL
   * @return {number} 저장 조각 수
   */
  putLarge: function (key, value, ttlSeconds) {
    const input = value || {};
    const maxLength = Math.floor(PMS_CONFIG.CACHE.MAX_VALUE_LENGTH * 0.75);
    const parts = [];
    let part = {};
    Object.keys(input).forEach(function (entryKey) {
      const candidate = Object.assign({}, part);
      candidate[entryKey] = input[entryKey];
      if (JSON.stringify(candidate).length > maxLength &&
          Object.keys(part).length) {
        parts.push(part);
        part = {};
      }
      part[entryKey] = input[entryKey];
    });
    if (Object.keys(part).length || !parts.length) parts.push(part);
    parts.forEach(function (chunk, index) {
      CacheManager.put(
        key + ':PART:' + index,
        chunk,
        ttlSeconds || PMS_CONFIG.CACHE.INDEX_TTL_SECONDS
      );
    });
    CacheManager.put(
      key + ':META',
      { parts: parts.length },
      ttlSeconds || PMS_CONFIG.CACHE.INDEX_TTL_SECONDS
    );
    return parts.length;
  },

  /**
   * 분할 저장된 큰 Object를 복원한다.
   *
   * @param {string} key Cache Key
   * @return {Object|null} 복원 Object
   */
  getLarge: function (key) {
    const metadata = this.get(key + ':META');
    if (!metadata) return null;
    const result = {};
    for (let index = 0; index < metadata.parts; index += 1) {
      const part = this.get(key + ':PART:' + index);
      if (!part) return null;
      Object.assign(result, part);
    }
    return result;
  },

  /**
   * 분할 저장된 큰 Object Cache를 제거한다.
   *
   * @param {string} key Cache Key
   * @return {boolean} 삭제 성공
   */
  clearLarge: function (key) {
    const metadata = this.get(key + ':META');
    if (metadata) {
      for (let index = 0; index < metadata.parts; index += 1) {
        this.clearCache(key + ':PART:' + index);
      }
    }
    this.clearCache(key + ':META');
    return true;
  },
});

function buildFrameworkCacheKey_(key) {
  Validation.required(key, 'cacheKey');
  return PMS_CONFIG.CACHE.KEY_PREFIX + String(key).trim();
}
