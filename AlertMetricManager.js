/**
 * @fileoverview HLAS-0048 Alert Operations Metric Manager
 * PropertiesService 기반 Alert Lifecycle/Archive/Failure 운영 Metric
 */

const AlertMetricManager = {
  VERSION: 'V1',
  PROPERTY_KEY: 'HLAS:ALERT:OPERATIONS_METRIC:V1',
  RECENT_EVENT_LIMIT: 40,
  FAILURE_WINDOW_MS: 60 * 60 * 1000,

  EVENTS: {
    ALERT_CREATED: 'ALERT_CREATED',
    STATE_CHANGED: 'STATE_CHANGED',
    HISTORY_APPENDED: 'HISTORY_APPENDED',
    ARCHIVE_COMPLETED: 'ARCHIVE_COMPLETED',
    ARCHIVE_ROLLED_BACK: 'ARCHIVE_ROLLED_BACK',
    OPERATION_FAILED: 'OPERATION_FAILED'
  },

  record: function(eventType, metadata) {
    const event = String(eventType || '').trim().toUpperCase();
    const allowed = Object.keys(this.EVENTS).map(function(key) {
      return AlertMetricManager.EVENTS[key];
    });

    if (allowed.indexOf(event) < 0) {
      throw new Error(`지원하지 않는 Alert Metric Event: ${event}`);
    }

    const lock = LockService.getScriptLock();

    if (!lock.tryLock(1000)) {
      throw new Error('Alert Metric Lock 획득 실패');
    }

    try {
      const state = this._readState();
      const data = metadata || {};
      const now = new Date();
      const durationMs = Math.max(Number(data.durationMs || 0), 0);

      state.totalEvents++;
      state.counts[event] = Number(state.counts[event] || 0) + 1;
      state.totalDurationMs += durationMs;
      state.maxDurationMs = Math.max(state.maxDurationMs, durationMs);

      if (event === this.EVENTS.ARCHIVE_COMPLETED) {
        state.archivedRows += Math.max(Number(data.archivedRows || 0), 0);
      }

      if (
        event === this.EVENTS.ARCHIVE_ROLLED_BACK ||
        event === this.EVENTS.OPERATION_FAILED
      ) {
        state.failureCount++;
        state.lastFailureAt = now.toISOString();
        state.lastFailureContext = String(
          data.context || data.error || ''
        ).slice(0, 300);
      }

      state.lastEvent = event;
      state.lastEventAt = now.toISOString();
      state.recentEvents.push({
        time: now.toISOString(),
        event: event,
        code: String(data.code || ''),
        alertId: String(data.alertId || ''),
        status: String(data.status || ''),
        durationMs: durationMs,
        archivedRows: Math.max(Number(data.archivedRows || 0), 0),
        context: String(data.context || '').slice(0, 200)
      });
      state.recentEvents = state.recentEvents.slice(
        -this.RECENT_EVENT_LIMIT
      );

      PropertiesService.getScriptProperties().setProperty(
        this.PROPERTY_KEY,
        JSON.stringify(state)
      );

      return true;
    } finally {
      lock.releaseLock();
    }
  },

  getSummary: function() {
    const state = this._readState();
    const recentFailure = state.lastFailureAt &&
      Date.now() - new Date(state.lastFailureAt).getTime() <=
        this.FAILURE_WINDOW_MS;

    return {
      version: state.version,
      totalEvents: state.totalEvents,
      counts: Object.assign({}, state.counts),
      archivedRows: state.archivedRows,
      failureCount: state.failureCount,
      failureRatePercent: state.totalEvents > 0
        ? Number((state.failureCount / state.totalEvents * 100).toFixed(2))
        : 0,
      averageDurationMs: state.totalEvents > 0
        ? Number((state.totalDurationMs / state.totalEvents).toFixed(2))
        : 0,
      maxDurationMs: state.maxDurationMs,
      lastEvent: state.lastEvent,
      lastEventAt: state.lastEventAt,
      lastFailureAt: state.lastFailureAt,
      lastFailureContext: state.lastFailureContext,
      recentFailure: Boolean(recentFailure),
      recentEvents: state.recentEvents.slice()
    };
  },

  getDashboardData: function() {
    const summary = this.getSummary();
    const counts = summary.counts;

    return {
      METRIC_STATUS: summary.recentFailure ? 'DEGRADED' : 'HEALTHY',
      METRIC_TOTAL_EVENTS: summary.totalEvents,
      METRIC_CREATED: Number(counts.ALERT_CREATED || 0),
      METRIC_STATE_CHANGED: Number(counts.STATE_CHANGED || 0),
      METRIC_HISTORY_APPENDED: Number(counts.HISTORY_APPENDED || 0),
      METRIC_ARCHIVE_COMPLETED: Number(counts.ARCHIVE_COMPLETED || 0),
      METRIC_ARCHIVE_ROLLED_BACK: Number(counts.ARCHIVE_ROLLED_BACK || 0),
      METRIC_ARCHIVED_ROWS: summary.archivedRows,
      METRIC_FAILURE_COUNT: summary.failureCount,
      METRIC_FAILURE_RATE_PERCENT: summary.failureRatePercent,
      METRIC_AVG_DURATION_MS: summary.averageDurationMs,
      METRIC_MAX_DURATION_MS: summary.maxDurationMs,
      METRIC_LAST_EVENT: summary.lastEvent,
      METRIC_LAST_EVENT_AT: summary.lastEventAt,
      METRIC_RECENT_FAILURE: summary.recentFailure
    };
  },

  _readState: function() {
    const empty = {
      version: this.VERSION,
      totalEvents: 0,
      counts: {},
      archivedRows: 0,
      failureCount: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      lastEvent: '',
      lastEventAt: '',
      lastFailureAt: '',
      lastFailureContext: '',
      recentEvents: []
    };
    const raw = PropertiesService
      .getScriptProperties()
      .getProperty(this.PROPERTY_KEY);

    if (!raw) {
      return empty;
    }

    try {
      const parsed = JSON.parse(raw);
      return Object.assign(empty, parsed, {
        counts: parsed.counts || {},
        recentEvents: Array.isArray(parsed.recentEvents)
          ? parsed.recentEvents
          : []
      });
    } catch (error) {
      return empty;
    }
  }
};
