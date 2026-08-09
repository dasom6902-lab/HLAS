/**
 * @fileoverview
 * HLAS-0071 Revision Registry Service
 *
 * 역할:
 * - Business Key별 Revision 저장 및 조회
 * - GitHub Official Record 기준 Registry 복구
 * - Lock, 재검증, Regression 차단
 *
 * Public API 유지:
 * - get
 * - set
 * - key
 * - list
 */
const RevisionRegistryService = Object.freeze({
  RECOVERY_STATUS: Object.freeze({
    SYNCED: 'SYNCED',
    REPAIRED: 'REPAIRED',
    INITIALIZED: 'INITIALIZED',
    BLOCKED: 'BLOCKED',
    FAILED: 'FAILED'
  }),

  /**
   * Revision 조회
   *
   * @param {string} businessKey
   * @return {string|null}
   */
  get: function(businessKey) {
    const normalizedKey = String(businessKey || '').trim();

    if (!normalizedKey) {
      throw new Error('REVISION_KEY_REQUIRED');
    }

    const properties = PropertiesService.getScriptProperties();

    return properties.getProperty(this.key(normalizedKey)) || null;
  },

  /**
   * Revision 저장
   *
   * @param {string} businessKey
   * @param {string} revision
   * @return {Object}
   */
  set: function(businessKey, revision) {
    const normalizedKey = String(businessKey || '').trim();

    if (!normalizedKey) {
      throw new Error('REVISION_KEY_REQUIRED');
    }

    if (!revision) {
      throw new Error('REVISION_VALUE_REQUIRED');
    }

    const parsed = RevisionManager.parse(revision);
    const normalizedRevision =
      'v' + parsed.major + '.' + parsed.minor;
    const properties = PropertiesService.getScriptProperties();

    properties.setProperty(
      this.key(normalizedKey),
      normalizedRevision
    );

    return {
      status: 'SAVED',
      businessKey: normalizedKey,
      revision: normalizedRevision
    };
  },

  /**
   * Registry Key 변환
   *
   * @param {string} businessKey
   * @return {string}
   */
  key: function(businessKey) {
    return 'HLAS_REVISION_' + businessKey;
  },

  /**
   * 전체 Registry 조회
   *
   * 테스트 및 운영 점검용 기존 API.
   *
   * @return {Object}
   */
  list: function() {
    const properties = PropertiesService.getScriptProperties();
    const all = properties.getProperties();
    const result = {};

    Object.keys(all).forEach(function(key) {
      if (key.indexOf('HLAS_REVISION_') === 0) {
        result[key] = all[key];
      }
    });

    return result;
  },

  /**
   * GitHub Official Record Revision을 기준으로 Registry를 복구한다.
   *
   * 기존 Public API 계약에는 포함하지 않는 HLAS-0071 내부 Helper다.
   * 테스트 Lock 주입은 TEST:/MOCK: Business Key에서만 허용한다.
   *
   * @param {string} businessKey
   * @param {string|null} githubRevision
   * @param {Object=} options
   * @return {Object}
   */
  _recover: function(businessKey, githubRevision, options) {
    const started = Date.now();
    const normalizedKey = String(businessKey || '').trim();
    const normalizedGithub = String(githubRevision || '').trim();
    const status = this.RECOVERY_STATUS;
    let lock = null;
    let lockAcquired = false;
    let registryBefore = null;
    let registryAfter = null;

    if (!normalizedKey) {
      return this._result(
        status.FAILED,
        normalizedKey,
        normalizedGithub || null,
        null,
        null,
        'REVISION_KEY_REQUIRED',
        started
      );
    }

    try {
      registryBefore = this.get(normalizedKey);
    } catch (error) {
      return this._result(
        status.FAILED,
        normalizedKey,
        normalizedGithub || null,
        null,
        null,
        this._errorMessage(error),
        started
      );
    }

    if (!normalizedGithub) {
      return this._result(
        status.BLOCKED,
        normalizedKey,
        null,
        registryBefore,
        registryBefore,
        'GITHUB_REVISION_REQUIRED',
        started
      );
    }

    let githubParsed;

    try {
      githubParsed = RevisionManager.parse(normalizedGithub);
    } catch (error) {
      return this._result(
        status.FAILED,
        normalizedKey,
        normalizedGithub,
        registryBefore,
        registryBefore,
        this._errorMessage(error),
        started
      );
    }

    const canonicalGithub =
      'v' + githubParsed.major + '.' + githubParsed.minor;

    try {
      lock = this._resolveLock(normalizedKey, options || {});
      const timeoutMs = this._lockTimeout(options || {});
      lockAcquired = lock.tryLock(timeoutMs);

      if (!lockAcquired) {
        return this._result(
          status.FAILED,
          normalizedKey,
          canonicalGithub,
          registryBefore,
          registryBefore,
          'REVISION_RECOVERY_LOCK_FAILED',
          started
        );
      }

      // Lock 획득 후 Registry를 다시 읽어 동시 실행 변경을 반영한다.
      registryBefore = this.get(normalizedKey);

      if (!registryBefore) {
        this.set(normalizedKey, canonicalGithub);
        registryAfter = this.get(normalizedKey);

        if (registryAfter !== canonicalGithub) {
          throw new Error(
            'REVISION_RECOVERY_WRITE_VERIFICATION_FAILED'
          );
        }

        return this._result(
          status.INITIALIZED,
          normalizedKey,
          canonicalGithub,
          null,
          registryAfter,
          '',
          started
        );
      }

      // 저장 직전 Registry Revision Format도 다시 검증한다.
      RevisionManager.parse(registryBefore);

      const comparison = RevisionManager._compare(
        canonicalGithub,
        registryBefore
      );

      if (comparison === 0) {
        return this._result(
          status.SYNCED,
          normalizedKey,
          canonicalGithub,
          registryBefore,
          registryBefore,
          '',
          started
        );
      }

      if (comparison < 0) {
        return this._result(
          status.BLOCKED,
          normalizedKey,
          canonicalGithub,
          registryBefore,
          registryBefore,
          'REGISTRY_AHEAD_OF_GITHUB',
          started
        );
      }

      this.set(normalizedKey, canonicalGithub);
      registryAfter = this.get(normalizedKey);

      if (registryAfter !== canonicalGithub) {
        throw new Error(
          'REVISION_RECOVERY_WRITE_VERIFICATION_FAILED'
        );
      }

      return this._result(
        status.REPAIRED,
        normalizedKey,
        canonicalGithub,
        registryBefore,
        registryAfter,
        '',
        started
      );

    } catch (error) {
      registryAfter = this._safeGet(normalizedKey);

      return this._result(
        status.FAILED,
        normalizedKey,
        canonicalGithub,
        registryBefore,
        registryAfter,
        this._errorMessage(error),
        started
      );

    } finally {
      if (lockAcquired && lock) {
        try {
          lock.releaseLock();
        } catch (releaseError) {
          Logger.log(
            'HLAS-0071 LOCK_RELEASE_FAILED: ' +
            this._errorMessage(releaseError)
          );
        }
      }
    }
  },

  /**
   * TEST:/MOCK: Key에서만 Safe Test Lock 주입을 허용한다.
   *
   * @param {string} businessKey
   * @param {Object} options
   * @return {Object}
   */
  _resolveLock: function(businessKey, options) {
    if (
      /^(?:TEST|MOCK):/.test(businessKey) &&
      options.lock &&
      typeof options.lock.tryLock === 'function' &&
      typeof options.lock.releaseLock === 'function'
    ) {
      return options.lock;
    }

    return LockService.getScriptLock();
  },

  /**
   * @param {Object} options
   * @return {number}
   */
  _lockTimeout: function(options) {
    const timeout = Number(options.lockTimeoutMs);

    if (
      isFinite(timeout) &&
      timeout >= 0 &&
      timeout <= 30000
    ) {
      return timeout;
    }

    return 5000;
  },

  /**
   * @param {string} businessKey
   * @return {string|null}
   */
  _safeGet: function(businessKey) {
    try {
      return this.get(businessKey);
    } catch (error) {
      return null;
    }
  },

  /**
   * @param {Error|*} error
   * @return {string}
   */
  _errorMessage: function(error) {
    return error && error.message
      ? String(error.message)
      : String(error || 'UNKNOWN_ERROR');
  },

  /**
   * @return {Object}
   */
  _result: function(
    recoveryStatus,
    businessKey,
    githubRevision,
    registryBefore,
    registryAfter,
    error,
    started
  ) {
    return {
      status: recoveryStatus,
      businessKey: businessKey,
      githubRevision: githubRevision,
      registryBefore: registryBefore,
      registryAfter: registryAfter,
      error: error || '',
      elapsedMs: Date.now() - started
    };
  }
});
