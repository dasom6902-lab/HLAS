/**
 * @fileoverview HLAS-0081 Monitoring History retention scheduler integration.
 * Production trigger installation is intentionally not performed by this task.
 */

const MonitoringHistoryScheduler = {
  HANDLER_NAME: 'runMonitoringHistoryRetentionScheduled',
  INVOCATION_TYPE: 'SCHEDULED',

  inspectRetentionTriggers: function(dependencies) {
    const deps = _resolveMonitoringHistorySchedulerDeps_(dependencies);
    const triggers = deps.scriptApp.getProjectTriggers();
    const normalized = triggers.map(function(trigger) {
      const handler = String(trigger.getHandlerFunction() || '');
      return {
        handlerFunction: handler,
        triggerType: _safeSchedulerTriggerValue_(trigger, 'getTriggerSource'),
        eventType: _safeSchedulerTriggerValue_(trigger, 'getEventType'),
        uniqueId: _safeSchedulerTriggerValue_(trigger, 'getUniqueId'),
        retentionRelated: handler === MonitoringHistoryScheduler.HANDLER_NAME
      };
    });
    return {
      totalCount: normalized.length,
      matchingCount: normalized.filter(function(item) {
        return item.retentionRelated;
      }).length,
      triggers: normalized
    };
  },

  verifyRetentionTrigger: function(dependencies) {
    const inventory = this.inspectRetentionTriggers(dependencies);
    return {
      status: inventory.matchingCount === 0
        ? 'NOT_INSTALLED'
        : inventory.matchingCount === 1
          ? 'VERIFIED'
          : 'DUPLICATE_TRIGGER_STATE',
      matchingCount: inventory.matchingCount,
      inventory: inventory
    };
  },

  installRetentionTrigger: function(cadenceConfig, dependencies) {
    const deps = _resolveMonitoringHistorySchedulerDeps_(dependencies);
    const before = this.inspectRetentionTriggers(deps);
    if (before.matchingCount > 1) {
      throw new Error('DUPLICATE_TRIGGER_STATE');
    }
    if (before.matchingCount === 1) {
      const requestedMode = _classifyMonitoringHistoryDeploymentMode_(cadenceConfig);
      if (requestedMode === 'UNSUPPORTED') {
        throw new Error('UNSUPPORTED_DEPLOYMENT_MODE');
      }
      if (requestedMode === 'PRODUCTION') {
        throw new Error('CONFIGURATION_VERIFICATION_REQUIRED');
      }
      return {status: 'ALREADY_INSTALLED', created: false, inventory: before};
    }
    const config = _validateMonitoringHistoryCadence_(cadenceConfig);
    if (config.productionApproved !== true) {
      throw new Error('PRODUCTION_TRIGGER_INSTALLATION_NOT_APPROVED');
    }
    const builder = deps.scriptApp.newTrigger(this.HANDLER_NAME).timeBased();
    _applyMonitoringHistoryCadence_(builder, config);
    builder.create();
    const after = this.inspectRetentionTriggers(deps);
    if (after.matchingCount !== 1) {
      throw new Error('TRIGGER_POST_INSTALL_VERIFICATION_FAILED');
    }
    return {
      status: 'INSTALLED',
      created: true,
      appliedConfig: _buildMonitoringHistoryAppliedConfig_(this.HANDLER_NAME, config),
      inventory: after
    };
  },

  uninstallRetentionTrigger: function(options, dependencies) {
    const config = options || {};
    if (config.explicitApproval !== true) {
      throw new Error('TARGET_UNINSTALL_APPROVAL_REQUIRED');
    }
    const deps = _resolveMonitoringHistorySchedulerDeps_(dependencies);
    const triggers = deps.scriptApp.getProjectTriggers();
    const matching = triggers.filter(function(trigger) {
      return trigger.getHandlerFunction() === MonitoringHistoryScheduler.HANDLER_NAME;
    });
    if (matching.length > 1) throw new Error('DUPLICATE_TRIGGER_STATE');
    if (matching.length === 1) deps.scriptApp.deleteTrigger(matching[0]);
    const after = this.inspectRetentionTriggers(deps);
    return {
      status: after.matchingCount === 0 ? 'UNINSTALLED' : 'UNINSTALL_FAILED',
      deleted: matching.length,
      inventory: after
    };
  },

  execute: function(referenceTime, options, dependencies) {
    const deps = _resolveMonitoringHistorySchedulerDeps_(dependencies);
    const started = deps.now();
    const executionId = deps.uuid();
    const base = {
      executionId: executionId,
      handlerName: this.HANDLER_NAME,
      invocationType: this.INVOCATION_TYPE,
      startTime: started.toISOString()
    };
    deps.log('INFO', Object.assign({}, base, {status: 'STARTED'}));
    try {
      const result = deps.manager.runRetention(referenceTime || started, options || {});
      const ended = deps.now();
      const evidence = Object.assign({}, base, {
        endTime: ended.toISOString(),
        status: 'SUCCESS',
        duration: ended.getTime() - started.getTime(),
        deletedRows: Number(result.deletedRows || 0),
        expiredRows: Number(result.expiredRows || 0),
        excessRows: Number(result.excessRows || 0),
        moreRequired: Boolean(result.moreRequired),
        maxRows: result.maxRows,
        retentionDays: result.retentionDays,
        deleteBatchLimit: result.deleteBatchLimit
      });
      deps.log('INFO', evidence);
      return evidence;
    } catch (error) {
      const ended = deps.now();
      const evidence = Object.assign({}, base, {
        endTime: ended.toISOString(),
        status: 'FAILED',
        duration: ended.getTime() - started.getTime(),
        errorCategory: _categorizeMonitoringSchedulerError_(error),
        sanitizedErrorMessage: _sanitizeMonitoringSchedulerMessage_(error && error.message)
      });
      deps.log('ERROR', evidence);
      throw error;
    }
  }
};

function runMonitoringHistoryRetentionScheduled() {
  return MonitoringHistoryScheduler.execute(new Date(), {});
}

function _resolveMonitoringHistorySchedulerDeps_(overrides) {
  const input = overrides || {};
  return {
    scriptApp: input.scriptApp || (typeof ScriptApp !== 'undefined' ? ScriptApp : null),
    manager: input.manager || MonitoringHistoryManager,
    now: input.now || function() { return new Date(); },
    uuid: input.uuid || function() { return Utilities.getUuid(); },
    log: input.log || function(level, evidence) {
      Logger.log('[MonitoringHistoryScheduler] ' + level + ' ' + JSON.stringify(evidence));
    }
  };
}

function _safeSchedulerTriggerValue_(trigger, method) {
  try {
    return typeof trigger[method] === 'function' ? String(trigger[method]()) : '';
  } catch (ignore) {
    return '';
  }
}

function _validateMonitoringHistoryCadence_(config) {
  if (!config || typeof config !== 'object') throw new Error('EXPLICIT_CADENCE_REQUIRED');
  const unit = String(config.unit || '').toUpperCase();
  const interval = Number(config.interval);
  if (['MINUTES', 'HOURS', 'DAYS', 'WEEKS'].indexOf(unit) < 0 || !Number.isInteger(interval) || interval < 1) {
    throw new Error('INVALID_EXPLICIT_CADENCE');
  }
  const mode = _classifyMonitoringHistoryDeploymentMode_(config);
  if (mode === 'UNSUPPORTED') throw new Error('UNSUPPORTED_DEPLOYMENT_MODE');
  const normalized = Object.assign({}, config, {
    unit: unit,
    interval: interval,
    configurationMode: mode
  });
  if (mode === 'PRODUCTION') {
    if (normalized.productionApproved !== true) {
      throw new Error('PRODUCTION_APPROVAL_REQUIRED');
    }
    if (unit !== 'DAYS') throw new Error('INVALID_PRODUCTION_UNIT');
    if (interval !== 1) throw new Error('INVALID_PRODUCTION_INTERVAL');
    const atHour = Number(normalized.atHour);
    if (!Number.isInteger(atHour) || atHour < 0 || atHour > 23) {
      throw new Error('INVALID_PRODUCTION_AT_HOUR');
    }
    if (atHour !== 3) throw new Error('UNAPPROVED_PRODUCTION_AT_HOUR');
    if (normalized.timezone !== 'Asia/Seoul') {
      throw new Error('INVALID_PRODUCTION_TIMEZONE');
    }
    normalized.atHour = 3;
    normalized.timezone = 'Asia/Seoul';
    normalized.deploymentMode = 'PRODUCTION';
  }
  return normalized;
}

function _applyMonitoringHistoryCadence_(builder, config) {
  if (config.unit === 'MINUTES') builder.everyMinutes(config.interval);
  if (config.unit === 'HOURS') builder.everyHours(config.interval);
  if (config.unit === 'DAYS') {
    if (config.configurationMode === 'PRODUCTION') builder.atHour(config.atHour);
    builder.everyDays(config.interval);
    if (config.configurationMode === 'PRODUCTION') builder.inTimezone(config.timezone);
  }
  if (config.unit === 'WEEKS') builder.everyWeeks(config.interval);
  return builder;
}

function _classifyMonitoringHistoryDeploymentMode_(config) {
  if (!config || config.deploymentMode === undefined || config.deploymentMode === null) {
    return 'LEGACY_COMPATIBILITY';
  }
  const mode = String(config.deploymentMode).trim().toUpperCase();
  return mode === 'PRODUCTION' ? 'PRODUCTION' : 'UNSUPPORTED';
}

function _buildMonitoringHistoryAppliedConfig_(handler, config) {
  const applied = {
    configurationMode: config.configurationMode,
    handler: handler,
    unit: config.unit,
    interval: config.interval
  };
  if (config.configurationMode === 'PRODUCTION') {
    applied.atHour = config.atHour;
    applied.timezone = config.timezone;
  }
  return applied;
}

function _sanitizeMonitoringSchedulerMessage_(message) {
  return String(message || 'Runtime failure')
    .replace(/(token|secret|password|credential|authorization)\s*[=:]\s*\S+/gi, '$1=[REDACTED]')
    .slice(0, 500);
}

function _categorizeMonitoringSchedulerError_(error) {
  const message = String(error && error.message || '').toUpperCase();
  if (message.indexOf('LOCK') >= 0) return 'CONCURRENCY';
  if (message.indexOf('AUTH') >= 0 || message.indexOf('PERMISSION') >= 0) return 'AUTHORIZATION';
  return 'RETENTION_RUNTIME';
}
