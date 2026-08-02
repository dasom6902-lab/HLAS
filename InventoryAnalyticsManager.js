/**
 * @fileoverview HLAS Inventory Analytics Manager
 *
 * HLAS-0039 Cache Performance Optimization
 *
 * Architecture:
 * KPIManager / DashboardManager
 * ↓
 * InventoryAnalyticsManager
 * ↓
 * CacheManager
 * ↓
 * InventoryManager
 * ↓
 * Spreadsheet
 */
const InventoryAnalyticsManager = {
  _inventoryCache: null,
  _analyticsCache: null,

  CACHE_DOMAIN: 'INVENTORY',
  CACHE_KEY: 'ANALYTICS',
  CACHE_TTL_SECONDS: 300,

  /**
   * Inventory Summary
   */
  getInventorySummary: function() {
    const analytics = this._loadAnalytics();
    return this._copyResult(analytics.summary);
  },

  /**
   * Stock Status
   */
  getStockStatus: function() {
    const analytics = this._loadAnalytics();
    return this._copyResult(analytics.stockStatus);
  },

  /**
   * Inventory KPI
   */
  getInventoryKPI: function() {
    const analytics = this._loadAnalytics();
    return this._copyResult(analytics.kpi);
  },

  /**
   * Analytics Cache 우선 조회
   *
   * Cache Hit: 저장된 Analytics 결과 반환
   * Cache Miss: Inventory를 1회 조회하여 전체 Analytics 계산 후 저장
   */
  _loadAnalytics: function() {
    let cached = null;

    if (typeof CacheManager !== 'undefined') {
      cached = CacheManager.get(
        this.CACHE_DOMAIN,
        this.CACHE_KEY
      );

      if (this._isAnalyticsCacheValid(cached)) {
        this._analyticsCache = cached;
        return cached;
      }

      if (cached !== null) {
        CacheManager.remove(
          this.CACHE_DOMAIN,
          this.CACHE_KEY
        );
      }
    } else if (this._isAnalyticsCacheValid(this._analyticsCache)) {
      return this._analyticsCache;
    }

    const data = this._loadInventoryData();
    const summary = this._calculateSummary(data);
    const stockStatus = this._calculateStockStatus(data);
    const analytics = {
      summary: summary,
      stockStatus: stockStatus,
      kpi: this._calculateKPIFromResults(
        summary,
        stockStatus
      )
    };

    this._analyticsCache = analytics;

    if (typeof CacheManager !== 'undefined') {
      CacheManager.set(
        this.CACHE_DOMAIN,
        this.CACHE_KEY,
        analytics,
        this.CACHE_TTL_SECONDS
      );
    }

    return analytics;
  },

  /**
   * Inventory Data Load
   *
   * Spreadsheet 직접 접근 없이 InventoryManager의 기존 Data Load API 사용
   */
  _loadInventoryData: function() {
    if (this._inventoryCache !== null) {
      return this._inventoryCache;
    }

    const data = [];

    if (
      typeof InventoryManager !== 'undefined' &&
      typeof InventoryManager._loadInventoryData === 'function'
    ) {
      const values = InventoryManager._loadInventoryData();

      for (let i = 1; i < values.length; i++) {
        data.push({
          quantity: values[i][2]
        });
      }
    }

    this._inventoryCache = data;
    return data;
  },

  /**
   * Summary 계산
   */
  _calculateSummary: function(data) {
    let totalQuantity = 0;
    let availableCount = 0;

    data.forEach(function(item) {
      const quantity = Number(item.quantity || 0);
      totalQuantity += quantity;

      if (quantity > 0) {
        availableCount++;
      }
    });

    return {
      TOTAL_ITEM: data.length,
      TOTAL_QTY: totalQuantity,
      AVAILABLE_ITEM: availableCount
    };
  },

  /**
   * Stock Status 계산
   */
  _calculateStockStatus: function(data) {
    let available = 0;
    let shortage = 0;

    data.forEach(function(item) {
      if (Number(item.quantity || 0) > 0) {
        available++;
      } else {
        shortage++;
      }
    });

    return {
      AVAILABLE: available,
      SHORTAGE: shortage
    };
  },

  /**
   * 기존 내부 API 호환용 KPI 계산
   */
  _calculateKPI: function(data) {
    const summary = this._calculateSummary(data);
    const stockStatus = this._calculateStockStatus(data);

    return this._calculateKPIFromResults(
      summary,
      stockStatus
    );
  },

  /**
   * 이미 계산된 결과로 KPI 구성
   */
  _calculateKPIFromResults: function(
    summary,
    stockStatus
  ) {
    return {
      TOTAL_ITEM: summary.TOTAL_ITEM,
      TOTAL_QTY: summary.TOTAL_QTY,
      AVAILABLE_RATE:
        summary.TOTAL_ITEM > 0
          ? summary.AVAILABLE_ITEM / summary.TOTAL_ITEM
          : 0,
      SHORTAGE: stockStatus.SHORTAGE
    };
  },

  /**
   * Cache Schema 검증
   */
  _isAnalyticsCacheValid: function(value) {
    return Boolean(
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.summary &&
      value.stockStatus &&
      value.kpi
    );
  },

  /**
   * 결과 객체 방어 복사
   */
  _copyResult: function(value) {
    return Object.assign({}, value);
  },

  /**
   * 동일 실행 내 Memory Cache만 초기화
   */
  _clearMemoryCache: function() {
    this._inventoryCache = null;
    this._analyticsCache = null;
  },

  /**
   * Cache Clear
   */
  clearCache: function() {
    this._clearMemoryCache();

    if (typeof CacheManager !== 'undefined') {
      CacheManager.remove(
        this.CACHE_DOMAIN,
        this.CACHE_KEY
      );
    }
  }
};