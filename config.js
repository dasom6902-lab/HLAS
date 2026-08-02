/**
 * @fileoverview 한살림 부산 PMS 전역 공통 설정 파일 (Single Source of Truth)
 * @version 1.0.0
 */

/**
 * 프로젝트 전역에서 사용하는 상수를 정의한 객체입니다.
 * 하드코딩을 방지하고 시스템 전반의 일관성을 유지하기 위해 사용하며,
 * 불변성을 보장하기 위해 Deep Freeze 처리되어 있습니다.
 *
 * @type {Readonly<{
 *   PROJECT: Readonly<{NAME: string, VERSION: string, OWNER: string}>,
 *   SHEETS: Readonly<{LOG: string, DASHBOARD: string, SETTINGS: string}>,
 *   UI: Readonly<{TOAST_DURATION: number}>,
 *   LOG: Readonly<{PREFIX: string}>
 * }>}
 */
const CONFIG = (function () {
  /**
   * 중첩된 객체까지 완벽하게 변경 불가능(Read-only)으로 만드는 Deep Freeze 헬퍼 함수
   * @param {Object} obj - 동결할 객체
   * @returns {Object} 동결된 객체
   */
  const deepFreeze = (obj) => {
    Object.keys(obj).forEach((prop) => {
      if (
        typeof obj[prop] === 'object' &&
        obj[prop] !== null &&
        !Object.isFrozen(obj[prop])
      ) {
        deepFreeze(obj[prop]);
      }
    });
    return Object.freeze(obj);
  };

  const rawConfig = {
    /**
     * 프로젝트 기본 정보
     */
    PROJECT: {
      NAME: '한살림 부산 PMS',
      VERSION: '1.0.0',
      OWNER: '한살림 부산 물류팀'
    },

    /**
     * 표준 시트 이름 정의 (SheetUtils 호환용)
     */
    SHEETS: {
      LOG: 'LOG',
      DASHBOARD: '대시보드',
      SETTINGS: '설정'
    },

    /**
     * UI 관련 설정
     */
    UI: {
      TOAST_DURATION: 3 // Toast 메시지 기본 노출 시간(초)
    },

    /**
     * 로깅 관련 설정
     */
    LOG: {
      PREFIX: '[한살림 부산 PMS]'
    }
  };

  return deepFreeze(rawConfig);
})();