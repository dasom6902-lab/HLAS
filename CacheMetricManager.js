/**
 * @fileoverview HLAS Cache Metric Manager
 * Cache Metric 및 최근 Event 상태 저장 Module
 */

const CacheMetricManager = {

  PREFIX: 'HLAS_CACHE_METRIC',
  EVENT_SUFFIX: 'LAST_EVENT',

  recordHit: function(domain, key) {
    this._record(domain, key, 'HIT');
  },

  recordMiss: function(domain, key) {
    this._record(domain, key, 'MISS');
  },

  recordCreate: function(domain, key) {
    this._record(domain, key, 'CREATE');
  },

  recordInvalidate: function(domain, key) {
    this._record(domain, key, 'INVALIDATE');
  },

  _record: function(domain, key, type) {
    try {
      const normalizedDomain = String(domain || '').toUpperCase();
      const normalizedKey = String(key || '').toUpperCase();
      const normalizedType = String(type || '').toUpperCase();
      const metricKey = this._createKey(
        normalizedDomain,
        normalizedKey,
        normalizedType
      );
      const eventKey = this._createEventKey(
        normalizedDomain,
        normalizedKey
      );
      const props = PropertiesService.getScriptProperties();
      const current = Number(props.getProperty(metricKey) || 0);
      const values = {};

      values[metricKey] = String(current + 1);
      values[eventKey] = JSON.stringify({
        type: normalizedType,
        domain: normalizedDomain,
        key: normalizedKey,
        timestamp: new Date().toISOString()
      });

      props.setProperties(values, false);
      this._log(normalizedType, normalizedDomain, normalizedKey);
    } catch (error) {
      this._handleError(error, 'CacheMetricManager._record');
    }
  },

  getMetric: function(domain, key) {
    const props = PropertiesService.getScriptProperties().getProperties();

    return this._buildMetric(
      props,
      String(domain || '').toUpperCase(),
      String(key || '').toUpperCase()
    );
  },

  getEventState: function(domain, key) {
    try {
      const value = PropertiesService
        .getScriptProperties()
        .getProperty(
          this._createEventKey(domain, key)
        );

      return value ? JSON.parse(value) : null;
    } catch (error) {
      this._handleError(error, 'CacheMetricManager.getEventState');
      return null;
    }
  },

  getMonitoringData: function(domain, key) {
    try {
      const normalizedDomain = String(domain || '').toUpperCase();
      const normalizedKey = String(key || '').toUpperCase();
      const props = PropertiesService.getScriptProperties().getProperties();
      const metric = this._buildMetric(
        props,
        normalizedDomain,
        normalizedKey
      );
      const sampleCount = metric.hit + metric.miss;
      const totalEventCount =
        sampleCount + metric.create + metric.invalidate;
      const eventValue = props[
        this._createEventKey(normalizedDomain, normalizedKey)
      ];

      return {
        domain: normalizedDomain,
        key: normalizedKey,
        hit: metric.hit,
        miss: metric.miss,
        create: metric.create,
        invalidate: metric.invalidate,
        sampleCount: sampleCount,
        totalEventCount: totalEventCount,
        hitRate: sampleCount > 0
          ? metric.hit / sampleCount
          : 0,
        missRate: sampleCount > 0
          ? metric.miss / sampleCount
          : 0,
        invalidationRate: totalEventCount > 0
          ? metric.invalidate / totalEventCount
          : 0,
        lastEvent: eventValue
          ? JSON.parse(eventValue)
          : null
      };
    } catch (error) {
      this._handleError(error, 'CacheMetricManager.getMonitoringData');
      return {
        domain: String(domain || '').toUpperCase(),
        key: String(key || '').toUpperCase(),
        hit: 0,
        miss: 0,
        create: 0,
        invalidate: 0,
        sampleCount: 0,
        totalEventCount: 0,
        hitRate: 0,
        missRate: 0,
        invalidationRate: 0,
        lastEvent: null
      };
    }
  },

  _buildMetric: function(props, domain, key) {
    return {
      hit: Number(props[this._createKey(domain, key, 'HIT')] || 0),
      miss: Number(props[this._createKey(domain, key, 'MISS')] || 0),
      create: Number(props[this._createKey(domain, key, 'CREATE')] || 0),
      invalidate: Number(
        props[this._createKey(domain, key, 'INVALIDATE')] || 0
      )
    };
  },

  _createKey: function(domain, key, type) {
    return [
      this.PREFIX,
      String(domain || '').toUpperCase(),
      String(key || '').toUpperCase(),
      String(type || '').toUpperCase()
    ].join('_');
  },

  _createEventKey: function(domain, key) {
    return [
      this.PREFIX,
      String(domain || '').toUpperCase(),
      String(key || '').toUpperCase(),
      this.EVENT_SUFFIX
    ].join('_');
  },

  _log: function(event, domain, key) {
    Logger.log(
      `[CacheMetricManager] CACHE_${event} ${domain}:${key}`
    );
  },

  _handleError: function(error, context) {
    try {
      if (
        typeof ErrorHandler !== 'undefined' &&
        typeof ErrorHandler.handle === 'function'
      ) {
        ErrorHandler.handle(error, context);
        return;
      }
    } catch (handlerError) {
      Logger.log(
        `[CacheMetricManager] ErrorHandler 연계 실패: ${handlerError.message}`
      );
    }

    Logger.log(
      `[CacheMetricManager] ${context}: ${error.message}`
    );
  },

  clear: function(domain, key) {
    const props = PropertiesService.getScriptProperties();
    const manager = this;

    ['HIT', 'MISS', 'CREATE', 'INVALIDATE'].forEach(function(type) {
      props.deleteProperty(
        manager._createKey(domain, key, type)
      );
    });

    props.deleteProperty(
      this._createEventKey(domain, key)
    );
  }
};

