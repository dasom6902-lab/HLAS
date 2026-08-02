/**
 * @fileoverview HLAS Cache Invalidation Manager
 *
 * HLAS-0039 Inventory Event 기반 Cache 삭제 정책
 *
 * Architecture:
 * Manager Event
 * ↓
 * CacheInvalidationManager
 * ↓
 * CacheManager
 */
const CacheInvalidationManager = {
  /**
   * 기존 Public API 호환
   *
   * 기존 Inventory 변경은 Structure Change와 동일한 전체 정책을 유지한다.
   */
  onInventoryChanged: function() {
    return this.onInventoryStructureChanged();
  },

  /**
   * Quantity Change Event
   *
   * Inventory LIST와 Analytics만 삭제한다.
   */
  onInventoryQuantityChanged: function() {
    return this.invalidateInventoryQuantity();
  },

  /**
   * Structure Change Event
   *
   * Inventory, Analytics, KPI, Dashboard 전체를 삭제한다.
   */
  onInventoryStructureChanged: function() {
    return this.invalidateInventoryStructure();
  },

  /**
   * 기존 Public API 호환
   */
  invalidateInventory: function() {
    return this.invalidateInventoryStructure();
  },

  /**
   * Quantity Change Invalidation
   */
  invalidateInventoryQuantity: function() {
    return this.invalidate([
      {
        domain: 'INVENTORY',
        key: 'LIST'
      },
      {
        domain: 'INVENTORY',
        key: 'ANALYTICS'
      }
    ]);
  },

  /**
   * Structure Change Invalidation
   */
  invalidateInventoryStructure: function() {
    return this.invalidate([
      {
        domain: 'INVENTORY',
        key: 'LIST'
      },
      {
        domain: 'INVENTORY',
        key: 'ANALYTICS'
      },
      {
        domain: 'KPI',
        key: 'SUMMARY'
      },
      {
        domain: 'DASHBOARD',
        key: 'SUMMARY'
      }
    ]);
  },

  /**
   * KPI 변경 Event
   */
  onKPIChanged: function() {
    return this.invalidate([
      {
        domain: 'KPI',
        key: 'SUMMARY'
      },
      {
        domain: 'DASHBOARD',
        key: 'SUMMARY'
      }
    ]);
  },

  /**
   * Dashboard Refresh Event
   */
  onDashboardRefresh: function() {
    return this.invalidate([
      {
        domain: 'DASHBOARD',
        key: 'SUMMARY'
      }
    ]);
  },

  /**
   * Cache 삭제 실행
   */
  invalidate: function(targets) {
    if (typeof CacheManager === 'undefined') {
      return false;
    }

    targets.forEach(function(target) {
      CacheManager.remove(
        target.domain,
        target.key
      );
    });

    return true;
  }
};