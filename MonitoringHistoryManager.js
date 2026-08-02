/**
 * @fileoverview HLAS-0050 Monitoring History Manager
 * History 저장 조정, Sampling, Trend 계산 및 Dashboard Projection을 담당한다.
 */

const MonitoringHistoryManager = {
  VERSION: 'V1',
  DEFAULT_SOURCE: 'DASHBOARD_REFRESH',
  RAW_PERIOD: 'RAW_5M',
  SAMPLE_INTERVAL_MS: 5 * 60 * 1000,
  MAX_QUERY_ROWS: 10000,

  PERIODS: {
    '1H': {
      windowMs: 60 * 60 * 1000,
      bucketMs: 5 * 60 * 1000,
      bucketCount: 12
    },
    '24H': {
      windowMs: 24 * 60 * 60 * 1000,
      bucketMs: 60 * 60 * 1000,
      bucketCount: 24
    },
    '7D': {
      windowMs: 7 * 24 * 60 * 60 * 1000,
      bucketMs: 24 * 60 * 60 * 1000,
      bucketCount: 7
    },
    '30D': {
      windowMs: 30 * 24 * 60 * 60 * 1000,
      bucketMs: 24 * 60 * 60 * 1000,
      bucketCount: 30
    }
  },

  DASHBOARD_TARGETS: [
    {domain: 'CACHE', key: 'HIT_RATE_PERCENT'},
    {domain: 'ALERT', key: 'OPEN_COUNT'},
    {domain: 'ALERT', key: 'METRIC_FAILURE_RATE_PERCENT'},
    {domain: 'KPI', key: 'INVENTORY_SHORTAGE'},
    {domain: 'PERFORMANCE', key: 'PREPARE_MS'}
  ],

  recordSnapshot: function(snapshot, options) {
    const config = options || {};
    const now = _normalizeMonitoringManagerDate_(
      config.time || new Date(),
      'Snapshot 시간'
    );
    const bucketStart = _getMonitoringBucketStart_(
      now,
      this.SAMPLE_INTERVAL_MS
    );

    try {
      const existing = MonitoringHistoryRepository.queryRange(
        new Date(bucketStart),
        now,
        {limit: this.MAX_QUERY_ROWS}
      );
      const prepared = _prepareMonitoringSnapshotRows_(
        snapshot,
        existing,
        config
      );
      const writeResult = MonitoringHistoryRepository.insertBatch(
        prepared.rows
      );

      return {
        inserted: writeResult.inserted,
        batches: writeResult.batches,
        duplicates: prepared.duplicates,
        rejected: prepared.rejected,
        records: prepared.rows
      };
    } catch (error) {
      _handleMonitoringHistoryError_(
        error,
        'MonitoringHistoryManager.recordSnapshot'
      );
      throw error;
    }
  },

  getHistory: function(period, filters, referenceTime) {
    const policy = _resolveMonitoringTrendPeriod_(period);
    const now = _normalizeMonitoringManagerDate_(
      referenceTime || new Date(),
      'History 기준 시간'
    );

    try {
      return MonitoringHistoryRepository.queryRange(
        new Date(now.getTime() - policy.windowMs),
        now,
        Object.assign(
          {limit: this.MAX_QUERY_ROWS},
          filters || {}
        )
      );
    } catch (error) {
      _handleMonitoringHistoryError_(
        error,
        'MonitoringHistoryManager.getHistory'
      );
      throw error;
    }
  },

  getTrendData: function(period, filters, referenceTime) {
    const now = _normalizeMonitoringManagerDate_(
      referenceTime || new Date(),
      'Trend 기준 시간'
    );
    const history = this.getHistory(period, filters, now);

    try {
      return _calculateMonitoringTrend_(
        history,
        period,
        filters || {},
        now
      );
    } catch (error) {
      _handleMonitoringHistoryError_(
        error,
        'MonitoringHistoryManager.getTrendData'
      );
      throw error;
    }
  },

  getDashboardData: function(snapshot, options) {
    const config = options || {};
    const now = _normalizeMonitoringManagerDate_(
      config.time || new Date(),
      'Dashboard Trend 기준 시간'
    );
    const maximumPolicy = this.PERIODS['30D'];
    const startedAt = Date.now();

    try {
      const history = MonitoringHistoryRepository.queryRange(
        new Date(now.getTime() - maximumPolicy.windowMs),
        now,
        {limit: this.MAX_QUERY_ROWS}
      );
      const queryMetric =
        MonitoringHistoryRepository.getLastOperationMetric() || {};
      const prepared = _prepareMonitoringSnapshotRows_(
        snapshot || {},
        history,
        Object.assign({}, config, {time: now})
      );
      const writeResult = MonitoringHistoryRepository.insertBatch(
        prepared.rows
      );
      const combined = history.concat(prepared.rows);
      const data = {
        STATUS: 'AVAILABLE',
        HISTORY_READ_CALLS: Number(queryMetric.readCalls || 0),
        HISTORY_ROWS_READ: history.length,
        QUERY_LIMIT: this.MAX_QUERY_ROWS,
        QUERY_TRUNCATED: Boolean(queryMetric.truncated),
        SNAPSHOT_INSERTED: writeResult.inserted,
        SNAPSHOT_WRITE_CALLS: writeResult.batches,
        SNAPSHOT_DUPLICATE: prepared.duplicates,
        SNAPSHOT_REJECTED: prepared.rejected,
        TREND_CALC_MS: 0
      };
      const calculationStartedAt = Date.now();

      this.DASHBOARD_TARGETS.forEach(function(target) {
        Object.keys(MonitoringHistoryManager.PERIODS).forEach(
          function(period) {
            const trend = _calculateMonitoringTrend_(
              combined,
              period,
              {
                domain: target.domain,
                key: target.key,
                source: config.source ||
                  MonitoringHistoryManager.DEFAULT_SOURCE
              },
              now
            );
            const series = trend.series[0];
            const prefix = [
              period,
              target.domain,
              target.key
            ].join('_');

            data[prefix + '_AVG'] = series.avg;
            data[prefix + '_MIN'] = series.min;
            data[prefix + '_MAX'] = series.max;
            data[prefix + '_LATEST'] = series.latest;
            data[prefix + '_SAMPLE_COUNT'] = series.sampleCount;
            data[prefix + '_STATUS'] = series.status;
            data[prefix + '_TREND_DIRECTION'] =
              series.trendDirection;
          }
        );
      });

      data.TREND_CALC_MS = Date.now() - calculationStartedAt;
      data.TOTAL_MS = Date.now() - startedAt;

      return data;
    } catch (error) {
      _handleMonitoringHistoryError_(
        error,
        'MonitoringHistoryManager.getDashboardData'
      );
      throw error;
    }
  },

  runRetention: function(referenceTime, options) {
    try {
      const result = MonitoringHistoryRepository.enforceRetention(
        referenceTime || new Date(),
        options || {}
      );

      _writeMonitoringHistoryLog_(
        'INFO',
        [
          'RETENTION_COMPLETED',
          'deleted=' + result.deletedRows,
          'moreRequired=' + result.moreRequired
        ].join(' ')
      );
      return result;
    } catch (error) {
      _handleMonitoringHistoryError_(
        error,
        'MonitoringHistoryManager.runRetention'
      );
      throw error;
    }
  }
};

function _prepareMonitoringSnapshotRows_(snapshot, history, options) {
  const config = options || {};
  const now = _normalizeMonitoringManagerDate_(
    config.time || new Date(),
    'Snapshot 시간'
  );
  const source = String(
    config.source || MonitoringHistoryManager.DEFAULT_SOURCE
  ).trim().toUpperCase();
  const candidates = _flattenMonitoringSnapshot_(
    snapshot,
    now,
    source
  );
  const existing = Array.isArray(history) ? history : [];
  const duplicateKeys = {};
  const latestStatus = {};
  const rows = [];
  let duplicates = 0;
  let rejected = 0;

  existing.forEach(function(record) {
    try {
      const normalized = _normalizeMonitoringManagerRecord_(record);
      const baseKey = _createMonitoringMetricBaseKey_(normalized);
      const bucketKey = _createMonitoringMetricBucketKey_(normalized);

      duplicateKeys[bucketKey] = true;
      if (
        !latestStatus[baseKey] ||
        normalized.time.getTime() > latestStatus[baseKey].time
      ) {
        latestStatus[baseKey] = {
          status: normalized.status,
          time: normalized.time.getTime()
        };
      }
    } catch (ignore) {
      // 기존 잘못된 Row는 신규 Snapshot 중복 판정에서 제외한다.
    }
  });

  candidates.forEach(function(candidate) {
    try {
      const normalized = _normalizeMonitoringManagerRecord_(candidate);
      const baseKey = _createMonitoringMetricBaseKey_(normalized);
      const bucketKey = _createMonitoringMetricBucketKey_(normalized);
      const previous = latestStatus[baseKey];
      const statusChanged = Boolean(
        previous &&
        normalized.status !== 'UNKNOWN' &&
        normalized.status !== previous.status
      );
      const forceStatusChange = Boolean(config.forceStatusChange);

      if (
        duplicateKeys[bucketKey] &&
        !statusChanged &&
        !forceStatusChange
      ) {
        duplicates++;
        return;
      }

      rows.push(normalized);
      duplicateKeys[bucketKey] = true;
      latestStatus[baseKey] = {
        status: normalized.status,
        time: normalized.time.getTime()
      };
    } catch (error) {
      rejected++;
      _handleMonitoringHistoryErrorSafely_(
        error,
        'MonitoringHistoryManager.invalidMetric'
      );
    }
  });

  return {
    rows: rows,
    duplicates: duplicates,
    rejected: rejected
  };
}

function _flattenMonitoringSnapshot_(snapshot, time, source) {
  if (Array.isArray(snapshot)) {
    return snapshot.map(function(record) {
      return Object.assign({}, record, {
        time: record.time || time,
        source: record.source || source,
        period: record.period || MonitoringHistoryManager.RAW_PERIOD,
        schemaVersion: record.schemaVersion ||
          MonitoringHistoryManager.VERSION
      });
    });
  }

  const result = [];
  const sourceData = snapshot && typeof snapshot === 'object'
    ? snapshot
    : {};

  Object.keys(sourceData).forEach(function(domain) {
    const data = sourceData[domain];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return;
    }

    const status = String(
      data.METRIC_STATUS || data.HEALTH || data.STATUS || 'UNKNOWN'
    ).trim().toUpperCase();

    Object.keys(data).forEach(function(key) {
      const value = data[key];

      if (!_isMonitoringMetricValue_(value)) {
        return;
      }

      result.push({
        time: time,
        metricDomain: domain,
        metricKey: key,
        metricValue: Number(value),
        status: status,
        source: source,
        period: MonitoringHistoryManager.RAW_PERIOD,
        schemaVersion: MonitoringHistoryManager.VERSION
      });
    });
  });

  return result;
}

function _calculateMonitoringTrend_(history, period, filters, referenceTime) {
  const policy = _resolveMonitoringTrendPeriod_(period);
  const normalizedPeriod = String(period || '').trim().toUpperCase();
  const now = _normalizeMonitoringManagerDate_(
    referenceTime || new Date(),
    'Trend 기준 시간'
  );
  const normalizedFilters = {
    domain: _normalizeOptionalMonitoringText_(filters.domain),
    key: _normalizeOptionalMonitoringText_(filters.key),
    source: _normalizeOptionalMonitoringText_(filters.source)
  };
  const endBucket = _getMonitoringBucketStart_(now, policy.bucketMs);
  const startBucket = endBucket -
    (policy.bucketCount - 1) * policy.bucketMs;
  const grouped = {};

  (Array.isArray(history) ? history : []).forEach(function(record) {
    let normalized;

    try {
      normalized = _normalizeMonitoringManagerRecord_(record);
    } catch (ignore) {
      return;
    }

    const timestamp = normalized.time.getTime();

    if (timestamp < startBucket || timestamp > now.getTime()) {
      return;
    }
    if (
      normalizedFilters.domain &&
      normalized.metricDomain !== normalizedFilters.domain
    ) {
      return;
    }
    if (
      normalizedFilters.key &&
      normalized.metricKey !== normalizedFilters.key
    ) {
      return;
    }
    if (
      normalizedFilters.source &&
      normalized.source !== normalizedFilters.source
    ) {
      return;
    }

    const groupKey = _createMonitoringMetricBaseKey_(normalized);

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        metricDomain: normalized.metricDomain,
        metricKey: normalized.metricKey,
        source: normalized.source,
        records: []
      };
    }
    grouped[groupKey].records.push(normalized);
  });

  if (
    Object.keys(grouped).length === 0 &&
    normalizedFilters.domain &&
    normalizedFilters.key
  ) {
    const emptyKey = [
      normalizedFilters.domain,
      normalizedFilters.key,
      normalizedFilters.source || MonitoringHistoryManager.DEFAULT_SOURCE
    ].join('|');

    grouped[emptyKey] = {
      metricDomain: normalizedFilters.domain,
      metricKey: normalizedFilters.key,
      source: normalizedFilters.source ||
        MonitoringHistoryManager.DEFAULT_SOURCE,
      records: []
    };
  }

  const series = Object.keys(grouped).sort().map(function(groupKey) {
    return _buildMonitoringTrendSeries_(
      grouped[groupKey],
      policy,
      startBucket
    );
  });

  return {
    period: normalizedPeriod,
    bucketMs: policy.bucketMs,
    bucketCount: policy.bucketCount,
    startTime: new Date(startBucket),
    endTime: now,
    series: series
  };
}

function _buildMonitoringTrendSeries_(group, policy, startBucket) {
  const buckets = [];

  for (let index = 0; index < policy.bucketCount; index++) {
    buckets.push({
      startTime: new Date(startBucket + index * policy.bucketMs),
      values: [],
      latestRecord: null
    });
  }

  group.records.sort(function(a, b) {
    return a.time.getTime() - b.time.getTime();
  });

  group.records.forEach(function(record) {
    const bucketStart = _getMonitoringBucketStart_(
      record.time,
      policy.bucketMs
    );
    const index = Math.floor(
      (bucketStart - startBucket) / policy.bucketMs
    );

    if (index < 0 || index >= buckets.length) {
      return;
    }

    buckets[index].values.push(record.metricValue);
    buckets[index].latestRecord = record;
  });

  const bucketResults = buckets.map(function(bucket) {
    if (bucket.values.length === 0) {
      return {
        startTime: bucket.startTime,
        avg: null,
        min: null,
        max: null,
        latest: null,
        sampleCount: 0,
        status: 'NO_DATA'
      };
    }

    return {
      startTime: bucket.startTime,
      avg: _roundMonitoringNumber_(
        _averageMonitoringValues_(bucket.values)
      ),
      min: Math.min.apply(null, bucket.values),
      max: Math.max.apply(null, bucket.values),
      latest: bucket.latestRecord.metricValue,
      sampleCount: bucket.values.length,
      status: bucket.latestRecord.status
    };
  });
  const allValues = group.records.map(function(record) {
    return record.metricValue;
  });
  const populatedBuckets = bucketResults.filter(function(bucket) {
    return bucket.sampleCount > 0;
  });
  const latestRecord = group.records.length > 0
    ? group.records[group.records.length - 1]
    : null;
  let direction = 'INSUFFICIENT_DATA';

  if (populatedBuckets.length >= 2) {
    const current = populatedBuckets[populatedBuckets.length - 1].avg;
    const previous = populatedBuckets[populatedBuckets.length - 2].avg;

    if (current > previous) {
      direction = 'UP';
    } else if (current < previous) {
      direction = 'DOWN';
    } else {
      direction = 'FLAT';
    }
  }

  return {
    metricDomain: group.metricDomain,
    metricKey: group.metricKey,
    source: group.source,
    avg: allValues.length > 0
      ? _roundMonitoringNumber_(_averageMonitoringValues_(allValues))
      : null,
    min: allValues.length > 0
      ? Math.min.apply(null, allValues)
      : null,
    max: allValues.length > 0
      ? Math.max.apply(null, allValues)
      : null,
    latest: latestRecord ? latestRecord.metricValue : null,
    sampleCount: allValues.length,
    status: latestRecord ? latestRecord.status : 'NO_DATA',
    trendDirection: direction,
    buckets: bucketResults
  };
}

function _resolveMonitoringTrendPeriod_(period) {
  const normalized = String(period || '').trim().toUpperCase();
  const policy = MonitoringHistoryManager.PERIODS[normalized];

  if (!policy) {
    throw new Error('지원하지 않는 Trend Period: ' + normalized);
  }

  return policy;
}

function _normalizeMonitoringManagerRecord_(record) {
  const source = record || {};
  const metricValue = Number(source.metricValue);
  const result = {
    time: _normalizeMonitoringManagerDate_(source.time, 'TIME'),
    metricDomain: _normalizeRequiredMonitoringText_(
      source.metricDomain,
      'METRIC_DOMAIN'
    ),
    metricKey: _normalizeRequiredMonitoringText_(
      source.metricKey,
      'METRIC_KEY'
    ),
    metricValue: metricValue,
    status: String(source.status || 'UNKNOWN').trim().toUpperCase(),
    source: _normalizeRequiredMonitoringText_(source.source, 'SOURCE'),
    period: String(
      source.period || MonitoringHistoryManager.RAW_PERIOD
    ).trim().toUpperCase(),
    schemaVersion: String(
      source.schemaVersion || MonitoringHistoryManager.VERSION
    ).trim().toUpperCase()
  };

  if (!Number.isFinite(metricValue)) {
    throw new Error(
      result.metricDomain + ':' + result.metricKey +
      ' METRIC_VALUE가 유효하지 않습니다.'
    );
  }
  if (result.schemaVersion !== MonitoringHistoryManager.VERSION) {
    throw new Error(
      '지원하지 않는 Monitoring History Schema: ' +
      result.schemaVersion
    );
  }

  return result;
}

function _createMonitoringMetricBaseKey_(record) {
  return [
    record.metricDomain,
    record.metricKey,
    record.source
  ].join('|');
}

function _createMonitoringMetricBucketKey_(record) {
  return [
    _createMonitoringMetricBaseKey_(record),
    _getMonitoringBucketStart_(
      record.time,
      MonitoringHistoryManager.SAMPLE_INTERVAL_MS
    )
  ].join('|');
}

function _getMonitoringBucketStart_(time, bucketMs) {
  const timestamp = time instanceof Date
    ? time.getTime()
    : new Date(time).getTime();

  if (Number.isNaN(timestamp)) {
    throw new Error('Bucket 시간이 유효하지 않습니다.');
  }

  return Math.floor(timestamp / bucketMs) * bucketMs;
}

function _normalizeMonitoringManagerDate_(value, field) {
  const result = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);

  if (Number.isNaN(result.getTime())) {
    throw new Error(field + ' 값이 유효하지 않습니다.');
  }

  return result;
}

function _normalizeRequiredMonitoringText_(value, field) {
  const normalized = String(value || '').trim().toUpperCase();

  if (!normalized) {
    throw new Error(field + ' 값이 필요합니다.');
  }

  return normalized;
}

function _normalizeOptionalMonitoringText_(value) {
  return value === undefined || value === null || value === ''
    ? ''
    : String(value).trim().toUpperCase();
}

function _isMonitoringMetricValue_(value) {
  if (typeof value === 'boolean' || value === '' || value === null) {
    return false;
  }

  return Number.isFinite(Number(value));
}

function _averageMonitoringValues_(values) {
  return values.reduce(function(total, value) {
    return total + Number(value);
  }, 0) / values.length;
}

function _roundMonitoringNumber_(value) {
  return Number(Number(value).toFixed(4));
}

function _handleMonitoringHistoryErrorSafely_(error, context) {
  try {
    _handleMonitoringHistoryError_(error, context);
  } catch (ignore) {
    Logger.log(
      '[MonitoringHistoryManager] ERROR_HANDLER_FAILURE context=' +
      context
    );
  }
}

function _handleMonitoringHistoryError_(error, context) {
  _writeMonitoringHistoryLog_(
    'ERROR',
    context + ' message=' + error.message
  );

  if (
    typeof ErrorHandler !== 'undefined' &&
    typeof ErrorHandler.handle === 'function'
  ) {
    ErrorHandler.handle(error, context);
  }
}

function _writeMonitoringHistoryLog_(level, message) {
  const normalizedLevel = String(level || 'INFO').trim().toUpperCase();

  Logger.log(
    '[MonitoringHistoryManager] ' + normalizedLevel + ' ' + message
  );

  try {
    if (normalizedLevel === 'ERROR' && typeof writeError === 'function') {
      writeError('MonitoringHistoryManager', message);
      return 1;
    }
    if (normalizedLevel === 'WARN' && typeof writeWarn === 'function') {
      writeWarn('MonitoringHistoryManager', message);
      return 1;
    }
    if (typeof writeInfo === 'function') {
      writeInfo('MonitoringHistoryManager', message);
      return 1;
    }
  } catch (logError) {
    Logger.log(
      '[MonitoringHistoryManager] LOG_FALLBACK message=' +
      logError.message
    );
  }

  return 0;
}
