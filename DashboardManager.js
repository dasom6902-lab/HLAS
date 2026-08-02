/**
 * @fileoverview HLAS Dashboard Manager
 * 운영 Dashboard 데이터 집계 Module
 * HLAS-0050 Operational Monitoring Dashboard Enhancement
 */

const DashboardManager = {

  _lastRefreshMetric: null,

  refresh: function() {
    const startedAt = Date.now();
    const refreshId = _createDashboardRefreshId();
    const stageState = {
      failures: [],
      logWriteCalls: 0
    };
    let statusReadMs = 0;
    let kpiMs = 0;
    let monitoringMs = 0;
    let trendMs = 0;
    let historyReadCalls = 0;
    let historyWriteCalls = 0;
    let statusReadCalls = 0;
    let writeMetric = {
      writeCalls: 0,
      staleClearCalls: 0
    };

    try {
      const context = _createDashboardRefreshContext();
      const statusStartedAt = Date.now();
      const statusBundle = _getDashboardStatusSummariesBatch(
        context.spreadsheet
      );

      statusReadMs = Date.now() - statusStartedAt;
      statusReadCalls = statusBundle.readCalls;

      const kpiStartedAt = Date.now();
      const kpiBundle = _collectDashboardStage(
        'KPI',
        function() {
          return _getDashboardKPIBundle();
        },
        function() {
          const previousKpi = _getDashboardCategoryFallback(
            context,
            'KPI',
            {}
          );

          return {
            inventory: _getDashboardCategoryFallback(
              context,
              'INVENTORY',
              {TOTAL_ITEM: 0}
            ),
            monitoring: Object.assign(
              {},
              previousKpi,
              {STATUS: 'ERROR'}
            )
          };
        },
        stageState,
        refreshId
      );

      kpiMs = Date.now() - kpiStartedAt;

      const monitoringStartedAt = Date.now();
      const cache = _collectDashboardStage(
        'CACHE',
        function() {
          return DashboardManager.getCacheMonitoringSummary();
        },
        function() {
          return Object.assign(
            {},
            _getDashboardCategoryFallback(
              context,
              'CACHE',
              {
                HEALTH: 'ERROR',
                TARGET_COUNT: 0,
                CACHE_HIT: 0,
                CACHE_MISS: 0,
                CACHE_CREATE: 0,
                CACHE_INVALIDATE: 0,
                HIT_RATE_PERCENT: 0,
                ALERT_COUNT: 0
              }
            ),
            {HEALTH: 'ERROR'}
          );
        },
        stageState,
        refreshId
      );
      const alert = _collectDashboardStage(
        'ALERT',
        function() {
          return _getDashboardAlertSummary();
        },
        function() {
          return Object.assign(
            {},
            _getDashboardCategoryFallback(
              context,
              'ALERT',
              {
                STATUS: 'ERROR',
                TOTAL_COUNT: 0,
                OPEN_COUNT: 0,
                CRITICAL_COUNT: 0,
                WARN_COUNT: 0,
                LAST_CODE: '',
                LAST_LEVEL: ''
              }
            ),
            {STATUS: 'ERROR'}
          );
        },
        stageState,
        refreshId
      );
      const error = this.getErrorSummary();

      monitoringMs = Date.now() - monitoringStartedAt;

      const performance = {
        STATUS: stageState.failures.length > 0
          ? 'DEGRADED'
          : 'HEALTHY',
        REFRESH_ID: refreshId,
        PARTIAL_FAILURE_COUNT: stageState.failures.length,
        PREPARE_MS: Date.now() - startedAt,
        STATUS_READ_MS: statusReadMs,
        KPI_MS: kpiMs,
        MONITORING_MS: monitoringMs,
        STATUS_READ_CALLS: statusReadCalls,
        SCHEMA_COLUMNS: 3
      };
      const trendStartedAt = Date.now();
      const trend = _collectDashboardStage(
        'TREND',
        function() {
          return _getDashboardTrendSummary({
            KPI: kpiBundle.monitoring,
            CACHE: cache,
            ALERT: alert,
            PERFORMANCE: performance
          });
        },
        function() {
          return Object.assign(
            {},
            _getDashboardCategoryFallback(
              context,
              'TREND',
              {
                STATUS: 'ERROR',
                HISTORY_READ_CALLS: 0,
                SNAPSHOT_WRITE_CALLS: 0
              }
            ),
            {STATUS: 'ERROR'}
          );
        },
        stageState,
        refreshId
      );

      trendMs = Date.now() - trendStartedAt;
      monitoringMs = Date.now() - monitoringStartedAt;
      historyReadCalls = Number(trend.HISTORY_READ_CALLS || 0);
      historyWriteCalls = Number(trend.SNAPSHOT_WRITE_CALLS || 0);
      performance.STATUS = stageState.failures.length > 0
        ? 'DEGRADED'
        : 'HEALTHY';
      performance.PARTIAL_FAILURE_COUNT = stageState.failures.length;
      performance.PREPARE_MS = Date.now() - startedAt;
      performance.MONITORING_MS = monitoringMs;
      performance.TREND_MS = trendMs;
      performance.HISTORY_READ_CALLS = historyReadCalls;
      performance.HISTORY_WRITE_CALLS = historyWriteCalls;

      const rows = _buildDashboardOutput({
        order: statusBundle.order,
        picking: statusBundle.picking,
        inventory: kpiBundle.inventory,
        shipment: this.getShipmentSummary(),
        kpi: kpiBundle.monitoring,
        cache: cache,
        alert: alert,
        trend: _getDashboardTrendDisplayData_(trend),
        performance: performance,
        error: error
      });
      const writeStartedAt = Date.now();

      writeMetric = _writeDashboardOutput(
        context.dashboardSheet,
        rows
      );

      const metric = {
        success: true,
        refreshId: refreshId,
        totalMs: Date.now() - startedAt,
        statusReadMs: statusReadMs,
        kpiMs: kpiMs,
        monitoringMs: monitoringMs,
        trendMs: trendMs,
        writeMs: Date.now() - writeStartedAt,
        statusReadCalls: statusReadCalls,
        historyReadCalls: historyReadCalls,
        historyWriteCalls: historyWriteCalls,
        dashboardWriteCalls: writeMetric.writeCalls,
        staleClearCalls: writeMetric.staleClearCalls,
        partialFailureCount: stageState.failures.length,
        failedStages: stageState.failures.map(function(item) {
          return item.stage;
        }),
        logWriteCalls: stageState.logWriteCalls,
        rowCount: rows.length,
        schemaColumns: 3,
        error: null
      };

      this._lastRefreshMetric = metric;
      metric.logWriteCalls += _writeDashboardOperationalLog(
        'INFO',
        [
          'REFRESH_SUCCESS',
          `id=${refreshId}`,
          `totalMs=${metric.totalMs}`,
          `partialFailures=${metric.partialFailureCount}`,
          `rows=${metric.rowCount}`
        ].join(' ')
      );
    } catch (error) {
      const metric = {
        success: false,
        refreshId: refreshId,
        totalMs: Date.now() - startedAt,
        statusReadMs: statusReadMs,
        kpiMs: kpiMs,
        monitoringMs: monitoringMs,
        trendMs: trendMs,
        writeMs: 0,
        statusReadCalls: statusReadCalls,
        historyReadCalls: historyReadCalls,
        historyWriteCalls: historyWriteCalls,
        dashboardWriteCalls: writeMetric.writeCalls,
        staleClearCalls: writeMetric.staleClearCalls,
        partialFailureCount: stageState.failures.length,
        failedStages: stageState.failures.map(function(item) {
          return item.stage;
        }),
        logWriteCalls: stageState.logWriteCalls,
        rowCount: 0,
        schemaColumns: 3,
        error: error.message
      };

      this._lastRefreshMetric = metric;
      metric.logWriteCalls += _handleDashboardRefreshError(
        error,
        refreshId
      );
      throw error;
    }
  },

  getOrderSummary: function() {
    return _getStatusSummary(DOMAIN_SHEETS.ORDER, 7);
  },

  getPickingSummary: function() {
    return _getStatusSummary(PICKING_SHEETS.PICKING, 6);
  },

  getInventorySummary: function() {
    if (
      typeof KPIManager === 'undefined' &&
      typeof InventoryAnalyticsManager === 'undefined'
    ) {
      return {TOTAL_ITEM: 0};
    }

    return typeof KPIManager !== 'undefined'
      ? KPIManager.getInventoryKPI()
      : InventoryAnalyticsManager.getInventorySummary();
  },

  getShipmentSummary: function() {
    if (typeof ShipmentManager === 'undefined') {
      return {TOTAL: 0};
    }

    return {TOTAL: 'CHECK'};
  },

  getCacheMonitoringSummary: function() {
    if (typeof CacheMonitoringManager === 'undefined') {
      return {
        HEALTH: 'UNAVAILABLE',
        TARGET_COUNT: 0,
        CACHE_HIT: 0,
        CACHE_MISS: 0,
        CACHE_CREATE: 0,
        CACHE_INVALIDATE: 0,
        HIT_RATE_PERCENT: 0,
        ALERT_COUNT: 0
      };
    }

    return CacheMonitoringManager.getDashboardData();
  },

  getErrorSummary: function() {
    return {ERROR: 'MONITOR'};
  }
};

function _createDashboardRefreshContext() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  return {
    spreadsheet: spreadsheet,
    dashboardSheet: _getDashboardSheet(spreadsheet)
  };
}

function _getDashboardStatusSummariesBatch(spreadsheet) {
  const targets = [
    {
      key: 'order',
      sheetName: DOMAIN_SHEETS.ORDER,
      statusColumn: 7
    },
    {
      key: 'picking',
      sheetName: PICKING_SHEETS.PICKING,
      statusColumn: 6
    }
  ];
  const result = {
    order: {TOTAL: 0},
    picking: {TOTAL: 0},
    readCalls: 0
  };
  const availableTargets = [];
  const ranges = [];

  targets.forEach(function(target) {
    const sheet = spreadsheet.getSheetByName(target.sheetName);

    if (!sheet) {
      return;
    }

    const escapedSheetName = target.sheetName.replace(/'/g, "''");
    const usedRange = sheet.getDataRange().getA1Notation();

    availableTargets.push(target);
    ranges.push(`'${escapedSheetName}'!${usedRange}`);
  });

  if (ranges.length === 0) {
    return result;
  }

  if (
    typeof Sheets !== 'undefined' &&
    Sheets.Spreadsheets &&
    Sheets.Spreadsheets.Values &&
    typeof Sheets.Spreadsheets.Values.batchGet === 'function'
  ) {
    const response = Sheets.Spreadsheets.Values.batchGet(
      spreadsheet.getId(),
      {
        ranges: ranges,
        majorDimension: 'ROWS'
      }
    );
    const valueRanges = response.valueRanges || [];

    availableTargets.forEach(function(target, index) {
      const values = valueRanges[index] && valueRanges[index].values
        ? valueRanges[index].values
        : [];

      result[target.key] = _buildStatusSummaryFromValues(
        values,
        target.statusColumn
      );
    });
    result.readCalls = 1;

    return result;
  }

  availableTargets.forEach(function(target) {
    const sheet = spreadsheet.getSheetByName(target.sheetName);
    const values = sheet.getDataRange().getValues();

    result[target.key] = _buildStatusSummaryFromValues(
      values,
      target.statusColumn
    );
    result.readCalls++;
  });

  return result;
}

function _getDashboardKPIBundle() {
  if (typeof KPIManager === 'undefined') {
    return {
      inventory: DashboardManager.getInventorySummary(),
      monitoring: {STATUS: 'UNAVAILABLE'}
    };
  }

  const summary = typeof KPIManager.getSummary === 'function'
    ? KPIManager.getSummary()
    : {
        inventory: KPIManager.getInventoryKPI(),
        operational: {}
      };

  return {
    inventory: summary.inventory || {},
    monitoring: _flattenDashboardKPI(summary)
  };
}

function _flattenDashboardKPI(summary) {
  const result = {STATUS: 'AVAILABLE'};

  ['inventory', 'operational'].forEach(function(section) {
    const data = summary && summary[section]
      ? summary[section]
      : {};

    Object.keys(data).forEach(function(key) {
      const value = data[key];
      result[`${section.toUpperCase()}_${key}`] =
        value !== null && typeof value === 'object'
          ? JSON.stringify(value)
          : value;
    });
  });

  return result;
}

function _getDashboardAlertSummary() {
  if (
    typeof AlertManager === 'undefined' ||
    typeof AlertManager.getAlerts !== 'function'
  ) {
    return {
      STATUS: 'UNAVAILABLE',
      TOTAL_COUNT: 0,
      OPEN_COUNT: 0,
      CRITICAL_COUNT: 0,
      WARN_COUNT: 0,
      LAST_CODE: '',
      LAST_LEVEL: ''
    };
  }

  const alerts = AlertManager.getAlerts() || [];
  const summary = alerts.reduce(function(result, alert) {
    const status = String(alert.status || '').toUpperCase();
    const level = String(alert.level || '').toUpperCase();

    if (status === 'OPEN') {
      result.OPEN_COUNT++;
    }

    if (level === 'CRITICAL') {
      result.CRITICAL_COUNT++;
    } else if (level === 'WARN') {
      result.WARN_COUNT++;
    }

    return result;
  }, {
    OPEN_COUNT: 0,
    CRITICAL_COUNT: 0,
    WARN_COUNT: 0
  });
  const lastAlert = alerts.length > 0
    ? alerts[alerts.length - 1]
    : null;

  const alertSummary = {
    STATUS: 'AVAILABLE',
    TOTAL_COUNT: alerts.length,
    OPEN_COUNT: summary.OPEN_COUNT,
    CRITICAL_COUNT: summary.CRITICAL_COUNT,
    WARN_COUNT: summary.WARN_COUNT,
    LAST_CODE: lastAlert ? lastAlert.code : '',
    LAST_LEVEL: lastAlert ? lastAlert.level : ''
  };

  if (
    typeof AlertMetricManager !== 'undefined' &&
    typeof AlertMetricManager.getDashboardData === 'function'
  ) {
    return Object.assign(
      alertSummary,
      AlertMetricManager.getDashboardData()
    );
  }

  return alertSummary;
}

function _getDashboardTrendSummary(snapshot) {
  if (
    typeof MonitoringHistoryManager === 'undefined' ||
    typeof MonitoringHistoryManager.getDashboardData !== 'function'
  ) {
    return {
      STATUS: 'UNAVAILABLE',
      HISTORY_READ_CALLS: 0,
      HISTORY_ROWS_READ: 0,
      SNAPSHOT_INSERTED: 0,
      SNAPSHOT_WRITE_CALLS: 0,
      SNAPSHOT_DUPLICATE: 0,
      SNAPSHOT_REJECTED: 0
    };
  }

  return MonitoringHistoryManager.getDashboardData(snapshot);
}

function _collectDashboardStage(
  stage,
  callback,
  fallback,
  stageState,
  refreshId
) {
  try {
    return callback();
  } catch (error) {
    stageState.failures.push({
      stage: stage,
      message: error.message
    });
    stageState.logWriteCalls += _writeDashboardOperationalLog(
      'WARN',
      [
        'REFRESH_PARTIAL_FAILURE',
        `id=${refreshId}`,
        `stage=${stage}`,
        `message=${error.message}`
      ].join(' ')
    );

    return fallback(error);
  }
}

function _getDashboardCategoryFallback(
  context,
  category,
  defaultData
) {
  const categories = _readPreviousDashboardCategories(context);
  const previous = categories[category];

  return previous
    ? Object.assign({}, previous)
    : Object.assign({}, defaultData);
}

function _readPreviousDashboardCategories(context) {
  if (context.previousCategories) {
    return context.previousCategories;
  }

  const values = context.dashboardSheet.getDataRange().getValues();
  const categories = {};

  for (let i = 2; i < values.length; i++) {
    const category = values[i][0];
    const key = values[i][1];

    if (!category || !key) {
      continue;
    }

    if (!categories[category]) {
      categories[category] = {};
    }

    categories[category][key] = values[i][2];
  }

  context.previousCategories = categories;

  return categories;
}

function _getStatusSummary(sheetName, statusColumn) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    return {TOTAL: 0};
  }

  return _buildStatusSummaryFromValues(
    sheet.getDataRange().getValues(),
    statusColumn
  );
}

function _buildStatusSummaryFromValues(values, statusColumn) {
  const result = {
    TOTAL: Math.max(values.length - 1, 0)
  };

  for (let i = 1; i < values.length; i++) {
    const status = values[i][statusColumn - 1];
    result[status] = (result[status] || 0) + 1;
  }

  return result;
}

function _getDashboardSheet(spreadsheet) {
  const activeSpreadsheet = spreadsheet ||
    SpreadsheetApp.getActiveSpreadsheet();
  let sheet = activeSpreadsheet.getSheetByName('DASHBOARD');

  if (!sheet) {
    sheet = activeSpreadsheet.insertSheet('DASHBOARD');
  }

  return sheet;
}

function _buildDashboardOutput(data) {
  const rows = [];

  rows.push(['HLAS Operational Dashboard', '', '']);
  rows.push(['구분', '항목', '값']);

  _buildDashboardRows(rows, 'ORDER', data.order);
  _buildDashboardRows(rows, 'PICKING', data.picking);
  _buildDashboardRows(rows, 'INVENTORY', data.inventory);
  _buildDashboardRows(rows, 'SHIPMENT', data.shipment);
  _buildDashboardRows(rows, 'KPI', data.kpi);
  _buildDashboardRows(rows, 'CACHE', data.cache);
  _buildDashboardRows(rows, 'ALERT', data.alert);
  _buildDashboardRows(rows, 'TREND', data.trend);
  _buildDashboardRows(rows, 'PERFORMANCE', data.performance);
  _buildDashboardRows(rows, 'ERROR', data.error);

  return _normalizeDashboardRows(rows);
}

function _getDashboardTrendDisplayData_(trend) {
  const source = trend || {};
  const metadataKeys = {
    HISTORY_READ_CALLS: true,
    HISTORY_ROWS_READ: true,
    QUERY_LIMIT: true,
    QUERY_TRUNCATED: true,
    SNAPSHOT_INSERTED: true,
    SNAPSHOT_WRITE_CALLS: true,
    SNAPSHOT_DUPLICATE: true,
    SNAPSHOT_REJECTED: true,
    TREND_CALC_MS: true,
    TOTAL_MS: true
  };
  const result = {};

  Object.keys(source).forEach(function(key) {
    if (!metadataKeys[key]) {
      result[key] = source[key];
    }
  });

  return result;
}

function _writeDashboardOutput(sheet, rows) {
  const previousLastRow = sheet.getLastRow();
  let staleClearCalls = 0;

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);

  if (previousLastRow > rows.length) {
    sheet
      .getRange(rows.length + 1, 1, previousLastRow - rows.length, 3)
      .clearContent();
    staleClearCalls = 1;
  }

  return {
    writeCalls: 1,
    staleClearCalls: staleClearCalls
  };
}

function _buildDashboardRows(rows, category, data) {
  Object.keys(data).forEach(function(key) {
    rows.push([category, key, data[key]]);
  });
}

function _normalizeDashboardRows(rows) {
  return rows.map(function(row) {
    const result = row.slice();

    while (result.length < 3) {
      result.push('');
    }

    if (result.length > 3) {
      result.splice(3);
    }

    return result;
  });
}

function _createDashboardRefreshId() {
  const timestamp = Date.now().toString(36);
  const uuid = typeof Utilities !== 'undefined' &&
    typeof Utilities.getUuid === 'function'
    ? Utilities.getUuid().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

  return `${timestamp}-${uuid}`;
}

function _handleDashboardRefreshError(error, refreshId) {
  const logWriteCalls = _writeDashboardOperationalLog(
    'ERROR',
    [
      'REFRESH_FAILED',
      `id=${refreshId}`,
      `message=${error.message}`
    ].join(' ')
  );

  try {
    if (
      typeof ErrorHandler !== 'undefined' &&
      typeof ErrorHandler.handle === 'function'
    ) {
      ErrorHandler.handle(
        error,
        `DashboardManager.refresh:${refreshId}`
      );
    }
  } catch (handlerError) {
    Logger.log(
      `[DashboardManager] ERROR_HANDLER_FAILURE ` +
      `id=${refreshId} message=${handlerError.message}`
    );
  }

  return logWriteCalls;
}

function _writeDashboardOperationalLog(level, message) {
  const normalizedLevel = String(level || 'INFO').toUpperCase();

  Logger.log(
    `[DashboardManager] ${normalizedLevel} ${message}`
  );

  try {
    if (
      normalizedLevel === 'ERROR' &&
      typeof writeError === 'function'
    ) {
      writeError('DashboardManager', message);
      return 1;
    }

    if (
      normalizedLevel === 'WARN' &&
      typeof writeWarn === 'function'
    ) {
      writeWarn('DashboardManager', message);
      return 1;
    }

    if (typeof writeInfo === 'function') {
      writeInfo('DashboardManager', message);
      return 1;
    }
  } catch (logError) {
    Logger.log(
      `[DashboardManager] LOG_FALLBACK ` +
      `level=${normalizedLevel} message=${logError.message}`
    );
  }

  return 0;
}
