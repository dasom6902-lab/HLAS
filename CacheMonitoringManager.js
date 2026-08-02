/**
 * @fileoverview HLAS Cache Monitoring Manager
 * Cache Metric 분석, Alert 판정, Dashboard 요약 Module
 */

const CacheMonitoringManager = {

  TARGETS: [
    {domain: 'INVENTORY', key: 'LIST'},
    {domain: 'INVENTORY', key: 'ANALYTICS'},
    {domain: 'KPI', key: 'SUMMARY'},
    {domain: 'DASHBOARD', key: 'SUMMARY'}
  ],

  THRESHOLDS: {
    MIN_SAMPLE_SIZE: 10,
    WARN_MISS_RATE: 0.30,
    CRITICAL_MISS_RATE: 0.50,
    WARN_INVALIDATION_RATE: 0.40,
    ALERT_COOLDOWN_SECONDS: 900
  },

  ALERT_PREFIX: 'HLAS_CACHE_ALERT',

  getStatus: function(domain, key, thresholds) {
    try {
      const metric = CacheMetricManager.getMonitoringData(domain, key);
      return this.evaluate(metric, thresholds);
    } catch (error) {
      this._handleError(error, 'CacheMonitoringManager.getStatus');
      return this._createErrorStatus(domain, key);
    }
  },

  evaluate: function(metric, thresholds) {
    const policy = this._mergeThresholds(thresholds);
    const alerts = [];
    let health = 'HEALTHY';

    if (metric.sampleCount < policy.MIN_SAMPLE_SIZE) {
      health = 'INSUFFICIENT_DATA';
    } else {
      if (metric.missRate >= policy.CRITICAL_MISS_RATE) {
        health = 'CRITICAL';
        alerts.push(this._createAlert(
          'CACHE_MISS_RATE_CRITICAL',
          'CRITICAL',
          metric,
          `Cache Miss Rate ${(metric.missRate * 100).toFixed(1)}%`
        ));
      } else if (metric.missRate >= policy.WARN_MISS_RATE) {
        health = 'WARN';
        alerts.push(this._createAlert(
          'CACHE_MISS_RATE_WARN',
          'WARN',
          metric,
          `Cache Miss Rate ${(metric.missRate * 100).toFixed(1)}%`
        ));
      }

      if (
        metric.invalidationRate >= policy.WARN_INVALIDATION_RATE
      ) {
        if (health === 'HEALTHY') {
          health = 'WARN';
        }

        alerts.push(this._createAlert(
          'CACHE_INVALIDATION_RATE_WARN',
          'WARN',
          metric,
          `Cache Invalidation Rate ${(metric.invalidationRate * 100).toFixed(1)}%`
        ));
      }
    }

    return {
      domain: metric.domain,
      key: metric.key,
      health: health,
      hit: metric.hit,
      miss: metric.miss,
      create: metric.create,
      invalidate: metric.invalidate,
      sampleCount: metric.sampleCount,
      totalEventCount: metric.totalEventCount,
      hitRate: metric.hitRate,
      missRate: metric.missRate,
      invalidationRate: metric.invalidationRate,
      lastEvent: metric.lastEvent,
      alerts: alerts
    };
  },

  getTargetStatuses: function() {
    const manager = this;

    return this.TARGETS.map(function(target) {
      return manager.getStatus(target.domain, target.key);
    });
  },

  getAlertCandidates: function() {
    const alerts = [];

    this.getTargetStatuses().forEach(function(status) {
      status.alerts.forEach(function(alert) {
        alerts.push(alert);
      });
    });

    return alerts;
  },

  shouldTrigger: function(alert, now) {
    const timestamp = now instanceof Date
      ? now.getTime()
      : Date.now();
    const props = PropertiesService.getScriptProperties();
    const last = Number(
      props.getProperty(this._createAlertKey(alert)) || 0
    );
    const cooldown =
      this.THRESHOLDS.ALERT_COOLDOWN_SECONDS * 1000;

    return last === 0 || timestamp - last >= cooldown;
  },

  markTriggered: function(alert, now) {
    const timestamp = now instanceof Date
      ? now.getTime()
      : Date.now();

    PropertiesService
      .getScriptProperties()
      .setProperty(
        this._createAlertKey(alert),
        String(timestamp)
      );
  },

  clearTrigger: function(alert) {
    PropertiesService
      .getScriptProperties()
      .deleteProperty(
        this._createAlertKey(alert)
      );
  },

  getDashboardData: function() {
    const statuses = this.getTargetStatuses();
    const totals = statuses.reduce(function(result, status) {
      result.hit += status.hit;
      result.miss += status.miss;
      result.create += status.create;
      result.invalidate += status.invalidate;
      result.alertCount += status.alerts.length;

      if (status.health === 'CRITICAL') {
        result.health = 'CRITICAL';
      } else if (
        status.health === 'WARN' &&
        result.health !== 'CRITICAL'
      ) {
        result.health = 'WARN';
      }

      return result;
    }, {
      health: 'HEALTHY',
      hit: 0,
      miss: 0,
      create: 0,
      invalidate: 0,
      alertCount: 0
    });
    const sampleCount = totals.hit + totals.miss;

    return {
      HEALTH: totals.health,
      TARGET_COUNT: statuses.length,
      CACHE_HIT: totals.hit,
      CACHE_MISS: totals.miss,
      CACHE_CREATE: totals.create,
      CACHE_INVALIDATE: totals.invalidate,
      HIT_RATE_PERCENT: sampleCount > 0
        ? Number(((totals.hit / sampleCount) * 100).toFixed(1))
        : 0,
      ALERT_COUNT: totals.alertCount
    };
  },

  _mergeThresholds: function(thresholds) {
    const source = thresholds || {};

    return {
      MIN_SAMPLE_SIZE: source.MIN_SAMPLE_SIZE !== undefined
        ? source.MIN_SAMPLE_SIZE
        : this.THRESHOLDS.MIN_SAMPLE_SIZE,
      WARN_MISS_RATE: source.WARN_MISS_RATE !== undefined
        ? source.WARN_MISS_RATE
        : this.THRESHOLDS.WARN_MISS_RATE,
      CRITICAL_MISS_RATE: source.CRITICAL_MISS_RATE !== undefined
        ? source.CRITICAL_MISS_RATE
        : this.THRESHOLDS.CRITICAL_MISS_RATE,
      WARN_INVALIDATION_RATE:
        source.WARN_INVALIDATION_RATE !== undefined
          ? source.WARN_INVALIDATION_RATE
          : this.THRESHOLDS.WARN_INVALIDATION_RATE
    };
  },

  _createAlert: function(code, level, metric, message) {
    return {
      code: code,
      level: level,
      domain: metric.domain,
      key: metric.key,
      message: `${metric.domain}:${metric.key} ${message}`
    };
  },

  _createAlertKey: function(alert) {
    return [
      this.ALERT_PREFIX,
      alert.code,
      alert.domain,
      alert.key
    ].join('_');
  },

  _createErrorStatus: function(domain, key) {
    return {
      domain: String(domain || '').toUpperCase(),
      key: String(key || '').toUpperCase(),
      health: 'ERROR',
      hit: 0,
      miss: 0,
      create: 0,
      invalidate: 0,
      sampleCount: 0,
      totalEventCount: 0,
      hitRate: 0,
      missRate: 0,
      invalidationRate: 0,
      lastEvent: null,
      alerts: []
    };
  },

  _handleError: function(error, context) {
    if (
      typeof ErrorHandler !== 'undefined' &&
      typeof ErrorHandler.handle === 'function'
    ) {
      ErrorHandler.handle(error, context);
      return;
    }

    Logger.log(`[CacheMonitoringManager] ${context}: ${error.message}`);
  }
};

