/**
 * @fileoverview HLAS-0050 Operational Monitoring Dashboard Enhancement Test
 */

function test_OperationalMonitoringDashboardEnhancement_HLAS0050() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const token = Utilities.getUuid().slice(0, 8);
  const historySheetName = 'HLAS0050_HISTORY_' + token;
  const retentionSheetName = 'HLAS0050_RETENTION_' + token;
  const originalSheetName = MonitoringHistoryRepository.SHEET_NAME;
  const originalValidatedId =
    MonitoringHistoryRepository._validatedSpreadsheetId;
  const originalDashboardWrite = _writeDashboardOutput;
  const originalDashboardTrend = MonitoringHistoryManager.getDashboardData;
  const originalInvalidHandler = _handleMonitoringHistoryErrorSafely_;
  const now = new Date();
  const sampleBucket = Math.floor(
    now.getTime() / MonitoringHistoryManager.SAMPLE_INTERVAL_MS
  ) * MonitoringHistoryManager.SAMPLE_INTERVAL_MS;
  const sampleTime = new Date(sampleBucket + 1000);
  const results = [];
  let capturedRows = [];
  let invalidMetricCalls = 0;
  let baselineMs = 0;
  let enhancedMs = 0;

  Logger.log('=== HLAS-0050 Monitoring History Test 시작 ===');

  try {
    MonitoringHistoryRepository.SHEET_NAME = historySheetName;
    MonitoringHistoryRepository._validatedSpreadsheetId = '';

    const initialized = MonitoringHistoryRepository.initialize();
    const historySheet = spreadsheet.getSheetByName(historySheetName);
    const headers = historySheet
      .getRange(1, 1, 1, 8)
      .getValues()[0];

    _assertHLAS0050_(
      initialized.created === true &&
      initialized.schemaVersion === 'V1' &&
      initialized.columns === 8,
      'MONITORING_HISTORY Sheet 초기화',
      results
    );
    _assertHLAS0050_(
      JSON.stringify(headers) === JSON.stringify([
        'TIME',
        'METRIC_DOMAIN',
        'METRIC_KEY',
        'METRIC_VALUE',
        'STATUS',
        'SOURCE',
        'PERIOD',
        'SCHEMA_VERSION'
      ]),
      'MONITORING_HISTORY_V1 Header',
      results
    );
    _assertHLAS0050_(
      MonitoringHistoryRepository.SCHEMA_VERSION === 'V1' &&
      MonitoringHistoryManager.VERSION === 'V1',
      'Schema Version V1',
      results
    );
    _assertHLAS0050_(
      MonitoringHistoryRepository.MAX_INSERT_BATCH === 500 &&
      MonitoringHistoryRepository.MAX_DELETE_BATCH === 1000 &&
      MonitoringHistoryRepository.MAX_QUERY_ROWS === 10000,
      'Batch 및 조회 Limit 정책',
      results
    );

    const seedRows = [
      _createHLAS0050Metric_(now, -29 * 24 * 60, 10, 'HEALTHY'),
      _createHLAS0050Metric_(now, -6 * 24 * 60, 20, 'HEALTHY'),
      _createHLAS0050Metric_(now, -23 * 60, 30, 'WARN'),
      _createHLAS0050Metric_(now, -50, 40, 'WARN'),
      _createHLAS0050Metric_(now, -10, 50, 'CRITICAL')
    ];
    const batchResult = MonitoringHistoryRepository.insertBatch(seedRows);

    _assertHLAS0050_(
      batchResult.inserted === 5 && batchResult.batches === 1,
      'History Batch Insert',
      results
    );

    const queried = MonitoringHistoryRepository.queryRange(
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now,
      {
        domain: 'TEST',
        key: 'TREND_VALUE',
        source: 'HLAS0050_TEST',
        limit: 10000
      }
    );
    const queryMetric =
      MonitoringHistoryRepository.getLastOperationMetric();

    _assertHLAS0050_(
      queried.length === 5 &&
      queryMetric.readCalls === 1 &&
      queryMetric.rowsRead <= 10000,
      '기간 제한 단일 History Read',
      results
    );

    const firstSnapshot = MonitoringHistoryManager.recordSnapshot([
      {
        time: sampleTime,
        metricDomain: 'SAMPLING',
        metricKey: 'VALUE',
        metricValue: 100,
        status: 'HEALTHY',
        source: 'HLAS0050_TEST'
      }
    ], {time: sampleTime});
    const duplicateSnapshot = MonitoringHistoryManager.recordSnapshot([
      {
        time: new Date(sampleTime.getTime() + 60000),
        metricDomain: 'SAMPLING',
        metricKey: 'VALUE',
        metricValue: 101,
        status: 'HEALTHY',
        source: 'HLAS0050_TEST'
      }
    ], {time: new Date(sampleTime.getTime() + 60000)});
    const stateChangeSnapshot = MonitoringHistoryManager.recordSnapshot([
      {
        time: new Date(sampleTime.getTime() + 120000),
        metricDomain: 'SAMPLING',
        metricKey: 'VALUE',
        metricValue: 102,
        status: 'CRITICAL',
        source: 'HLAS0050_TEST'
      }
    ], {time: new Date(sampleTime.getTime() + 120000)});

    _assertHLAS0050_(
      firstSnapshot.inserted === 1 &&
      duplicateSnapshot.inserted === 0 &&
      duplicateSnapshot.duplicates === 1,
      '5분 Sampling 중복 방지',
      results
    );
    _assertHLAS0050_(
      stateChangeSnapshot.inserted === 1,
      '상태 변경 Event 즉시 저장',
      results
    );

    const trendSeed = [
      {
        time: new Date(now.getTime() - 50 * 60 * 1000),
        metricDomain: 'TREND',
        metricKey: 'VALUE',
        metricValue: 10,
        status: 'HEALTHY',
        source: 'HLAS0050_TEST'
      },
      {
        time: new Date(now.getTime() - 10 * 60 * 1000),
        metricDomain: 'TREND',
        metricKey: 'VALUE',
        metricValue: 30,
        status: 'WARN',
        source: 'HLAS0050_TEST'
      }
    ];

    MonitoringHistoryRepository.insertBatch(trendSeed);

    const oneHour = MonitoringHistoryManager.getTrendData(
      '1H',
      {domain: 'TREND', key: 'VALUE', source: 'HLAS0050_TEST'},
      now
    );
    const oneHourSeries = oneHour.series[0];

    _assertHLAS0050_(
      oneHour.bucketCount === 12 &&
      oneHourSeries.buckets.length === 12 &&
      oneHourSeries.buckets.some(function(bucket) {
        return bucket.sampleCount === 0 && bucket.status === 'NO_DATA';
      }),
      '1시간 5분 Bucket 및 빈 Bucket',
      results
    );
    _assertHLAS0050_(
      oneHourSeries.avg === 20 &&
      oneHourSeries.min === 10 &&
      oneHourSeries.max === 30 &&
      oneHourSeries.latest === 30 &&
      oneHourSeries.sampleCount === 2 &&
      oneHourSeries.status === 'WARN' &&
      oneHourSeries.trendDirection === 'UP',
      'AVG/MIN/MAX/LATEST/STATUS/TREND_DIRECTION',
      results
    );

    const expectedPeriods = {
      '24H': {bucketMs: 60 * 60 * 1000, bucketCount: 24},
      '7D': {bucketMs: 24 * 60 * 60 * 1000, bucketCount: 7},
      '30D': {bucketMs: 24 * 60 * 60 * 1000, bucketCount: 30}
    };

    Object.keys(expectedPeriods).forEach(function(period) {
      const trend = MonitoringHistoryManager.getTrendData(
        period,
        {domain: 'TEST', key: 'TREND_VALUE', source: 'HLAS0050_TEST'},
        now
      );

      _assertHLAS0050_(
        trend.bucketMs === expectedPeriods[period].bucketMs &&
        trend.bucketCount === expectedPeriods[period].bucketCount &&
        trend.series[0].buckets.length === expectedPeriods[period].bucketCount,
        period + ' Trend 계약',
        results
      );
    });

    _handleMonitoringHistoryErrorSafely_ = function() {
      invalidMetricCalls++;
    };
    const invalidResult = MonitoringHistoryManager.recordSnapshot([
      {
        time: now,
        metricDomain: 'INVALID',
        metricKey: 'VALUE',
        metricValue: 'NOT_A_NUMBER',
        status: 'ERROR',
        source: 'HLAS0050_TEST'
      },
      {
        time: now,
        metricDomain: 'VALID',
        metricKey: 'VALUE',
        metricValue: 1,
        status: 'HEALTHY',
        source: 'HLAS0050_TEST'
      }
    ], {time: now});
    _handleMonitoringHistoryErrorSafely_ = originalInvalidHandler;

    _assertHLAS0050_(
      invalidResult.rejected === 1 &&
      invalidResult.inserted === 1 &&
      invalidMetricCalls === 1,
      '잘못된 Metric 격리',
      results
    );

    MonitoringHistoryRepository.SHEET_NAME = retentionSheetName;
    MonitoringHistoryRepository._validatedSpreadsheetId = '';
    MonitoringHistoryRepository.initialize();
    MonitoringHistoryRepository.insertBatch([
      {
        time: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
        metricDomain: 'RETENTION',
        metricKey: 'VALUE',
        metricValue: 1,
        status: 'HEALTHY',
        source: 'HLAS0050_TEST'
      },
      {
        time: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000),
        metricDomain: 'RETENTION',
        metricKey: 'VALUE',
        metricValue: 2,
        status: 'HEALTHY',
        source: 'HLAS0050_TEST'
      }
    ]);
    const ageRetention = MonitoringHistoryManager.runRetention(now);

    _assertHLAS0050_(
      ageRetention.deletedRows === 1 &&
      ageRetention.retentionDays === 30,
      'Raw History 30일 Retention',
      results
    );

    const rowLimitSeed = [];

    for (let index = 0; index < 7; index++) {
      rowLimitSeed.push({
        time: new Date(now.getTime() - (7 - index) * 60000),
        metricDomain: 'ROW_LIMIT',
        metricKey: 'VALUE_' + index,
        metricValue: index,
        status: 'HEALTHY',
        source: 'HLAS0050_TEST'
      });
    }
    MonitoringHistoryRepository.insertBatch(rowLimitSeed);

    const countRetention = MonitoringHistoryManager.runRetention(
      now,
      {maxRows: 5}
    );

    _assertHLAS0050_(
      MonitoringHistoryRepository.MAX_DATA_ROWS === 50000 &&
      countRetention.excessRows > 0 &&
      countRetention.deletedRows > 0 &&
      countRetention.deletedRows <= 1000,
      '50,000행 제한 및 1,000행 Delete Batch',
      results
    );

    MonitoringHistoryRepository.SHEET_NAME = historySheetName;
    MonitoringHistoryRepository._validatedSpreadsheetId = '';
    _writeDashboardOutput = function(sheet, rows) {
      capturedRows = rows.map(function(row) {
        return row.slice();
      });
      return {writeCalls: 1, staleClearCalls: 0};
    };

    MonitoringHistoryManager.getDashboardData = function() {
      return {
        STATUS: 'AVAILABLE',
        HISTORY_READ_CALLS: 0,
        SNAPSHOT_WRITE_CALLS: 0,
        BASELINE: true
      };
    };
    DashboardManager.refresh();
    baselineMs = DashboardManager._lastRefreshMetric.totalMs;

    MonitoringHistoryManager.getDashboardData = originalDashboardTrend;
    const trendStartedAt = Date.now();
    const dashboardTrend = MonitoringHistoryManager.getDashboardData(
      {
        KPI: {STATUS: 'AVAILABLE', INVENTORY_SHORTAGE: 0},
        CACHE: {HEALTH: 'HEALTHY', HIT_RATE_PERCENT: 90},
        ALERT: {
          STATUS: 'AVAILABLE',
          OPEN_COUNT: 1,
          METRIC_FAILURE_RATE_PERCENT: 0
        },
        PERFORMANCE: {STATUS: 'HEALTHY', PREPARE_MS: 100}
      },
      {time: now}
    );
    const trendDurationMs = Date.now() - trendStartedAt;

    DashboardManager.refresh();
    enhancedMs = DashboardManager._lastRefreshMetric.totalMs;
    const dashboardMetric = DashboardManager._lastRefreshMetric;

    _assertHLAS0050_(
      dashboardTrend.STATUS === 'AVAILABLE' &&
      dashboardTrend.HISTORY_READ_CALLS <= 1 &&
      trendDurationMs <= 3000,
      '최근 24시간 포함 Trend 조회·계산 3초 이내',
      results
    );
    _assertHLAS0050_(
      capturedRows.every(function(row) {
        return row.length === 3;
      }) &&
      capturedRows.some(function(row) {
        return row[0] === 'TREND';
      }),
      'Dashboard TREND 표시 및 3열 Schema',
      results
    );
    _assertHLAS0050_(
      dashboardMetric.success === true &&
      dashboardMetric.dashboardWriteCalls === 1 &&
      dashboardMetric.historyReadCalls <= 1,
      'Dashboard Batch Write 1회 / History Read 최대 1회',
      results
    );

    MonitoringHistoryManager.getDashboardData = function() {
      throw new Error('HLAS0050_TREND_PARTIAL_FAILURE');
    };
    DashboardManager.refresh();
    const partialMetric = DashboardManager._lastRefreshMetric;

    _assertHLAS0050_(
      partialMetric.success === true &&
      partialMetric.failedStages.indexOf('TREND') >= 0 &&
      capturedRows.some(function(row) {
        return row[0] === 'TREND' &&
          row[1] === 'STATUS' &&
          row[2] === 'ERROR';
      }),
      'Trend Partial Failure 격리',
      results
    );

    const increasePercent = baselineMs > 0
      ? Number(((enhancedMs - baselineMs) / baselineMs * 100).toFixed(2))
      : 0;
    const targetMet = increasePercent <= 20;

    _assertHLAS0050_(
      typeof increasePercent === 'number' && Number.isFinite(increasePercent),
      'Dashboard Refresh Before/After 측정',
      results
    );

    const summary = {
      pass: results.filter(function(item) {
        return item.pass;
      }).length,
      total: results.length,
      result: results,
      performance: {
        trendDurationMs: trendDurationMs,
        dashboardBaselineMs: baselineMs,
        dashboardEnhancedMs: enhancedMs,
        dashboardIncreasePercent: increasePercent,
        dashboardIncreaseTargetPercent: 20,
        dashboardIncreaseTargetMet: targetMet,
        historyReadCalls: dashboardMetric.historyReadCalls,
        historyWriteCalls: dashboardMetric.historyWriteCalls,
        dashboardWriteCalls: dashboardMetric.dashboardWriteCalls
      }
    };

    Logger.log(JSON.stringify(summary));
    return summary;
  } finally {
    MonitoringHistoryRepository.SHEET_NAME = originalSheetName;
    MonitoringHistoryRepository._validatedSpreadsheetId =
      originalValidatedId;
    MonitoringHistoryManager.getDashboardData = originalDashboardTrend;
    _handleMonitoringHistoryErrorSafely_ = originalInvalidHandler;
    _writeDashboardOutput = originalDashboardWrite;
    _deleteHLAS0050Sheet_(spreadsheet, historySheetName);
    _deleteHLAS0050Sheet_(spreadsheet, retentionSheetName);
    Logger.log('=== HLAS-0050 Monitoring History Test 완료 ===');
  }
}

function _createHLAS0050Metric_(referenceTime, offsetMinutes, value, status) {
  return {
    time: new Date(referenceTime.getTime() + offsetMinutes * 60 * 1000),
    metricDomain: 'TEST',
    metricKey: 'TREND_VALUE',
    metricValue: value,
    status: status,
    source: 'HLAS0050_TEST',
    period: 'RAW_5M',
    schemaVersion: 'V1'
  };
}

function _deleteHLAS0050Sheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (sheet) {
    spreadsheet.deleteSheet(sheet);
  }
}

function _assertHLAS0050_(condition, message, results) {
  const item = {
    pass: Boolean(condition),
    message: message
  };

  results.push(item);
  Logger.log((item.pass ? 'PASS' : 'FAIL') + ': ' + message);

  if (!item.pass) {
    throw new Error('HLAS-0050 Test 실패: ' + message);
  }
}
