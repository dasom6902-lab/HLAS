/**
 * ============================================================================
 * HLAS Constants
 * ----------------------------------------------------------------------------
 * HLAS-PMS 공통 상수
 *
 * 모든 시트명, 컬럼명, 상태값, 이벤트, 권한, 설정값은
 * 이 객체를 통해 접근한다.
 *
 * Version : 1.0.0
 * ============================================================================
 */

const HLAS_CONSTANTS = Object.freeze({

  /* ========================================================================
   * System
   * ====================================================================== */

  VERSION: Object.freeze({
    SYSTEM: '1.0.0',
    API: 'v1'
  }),

  /* ========================================================================
   * Sheet
   * ====================================================================== */

  SHEETS: Object.freeze({

    PROJECT: '01_PROJECT',

    EPIC: '02_EPIC',

    FEATURE: '03_FEATURE',

    FUNCTION: '04_FUNCTION',

    TASK: '05_TASK',

    CHANGELOG: '09_CHANGELOG',

    CONFIG: '98_CONFIG',

    AUDIT: '99_AUDIT'

  }),

  /* ========================================================================
   * Entity
   * ====================================================================== */

  ENTITY: Object.freeze({

    PROJECT: 'PROJECT',

    EPIC: 'EPIC',

    FEATURE: 'FEATURE',

    FUNCTION: 'FUNCTION',

    TASK: 'TASK'

  }),

  /* ========================================================================
   * Role
   * ====================================================================== */

  ROLE: Object.freeze({

    ADMIN: 'ADMIN',

    MANAGER: 'MANAGER',

    USER: 'USER',

    VIEWER: 'VIEWER'

  }),

  /* ========================================================================
   * Permission
   * ====================================================================== */

  PERMISSION: Object.freeze({

    READ: 'READ',

    CREATE: 'CREATE',

    UPDATE: 'UPDATE',

    DELETE: 'DELETE',

    APPROVE: 'APPROVE',

    EXPORT: 'EXPORT'

  }),

  /* ========================================================================
   * Action
   * ====================================================================== */

  ACTION: Object.freeze({

    CREATE: 'CREATE',

    UPDATE: 'UPDATE',

    DELETE: 'DELETE',

    APPROVE: 'APPROVE',

    REJECT: 'REJECT',

    IMPORT: 'IMPORT',

    EXPORT: 'EXPORT',

    LOGIN: 'LOGIN'

  }),

  /* ========================================================================
   * Event
   * ====================================================================== */

  EVENT: Object.freeze({

    TASK_CREATED: 'TASK_CREATED',

    TASK_UPDATED: 'TASK_UPDATED',

    WORKFLOW_CHANGED: 'WORKFLOW_CHANGED',

    APPROVAL_COMPLETED: 'APPROVAL_COMPLETED',

    BACKUP_COMPLETED: 'BACKUP_COMPLETED',

    REPORT_GENERATED: 'REPORT_GENERATED'

  }),

  /* ========================================================================
   * Status
   * ====================================================================== */

  STATUS: Object.freeze({

    WAITING: '대기',

    IN_PROGRESS: '진행중',

    REVIEW: '검토중',

    APPROVAL: '승인대기',

    COMPLETED: '완료',

    ON_HOLD: '보류',

    CANCELLED: '취소',

    VALUES: Object.freeze([
      '대기',
      '진행중',
      '검토중',
      '승인대기',
      '완료',
      '보류',
      '취소'
    ])

  }),

  /* ========================================================================
   * Priority
   * ====================================================================== */

  PRIORITY: Object.freeze({

    URGENT: '긴급',

    HIGH: '높음',

    NORMAL: '보통',

    LOW: '낮음',

    VALUES: Object.freeze([
      '긴급',
      '높음',
      '보통',
      '낮음'
    ])

  }),

  /* ========================================================================
   * Search
   * ====================================================================== */

  SEARCH: Object.freeze({

    ASC: 'asc',

    DESC: 'desc',

    SORT_ORDERS: Object.freeze(['asc', 'desc'])

  }),

  /* ========================================================================
   * ID
   * ====================================================================== */

  ID: Object.freeze({

    PROJECT_PREFIX: 'PROJ-',

    EPIC_PREFIX: 'EPIC-',

    FEATURE_PREFIX: 'FEAT-',

    FUNCTION_PREFIX: 'FUNC-',

    TASK_PREFIX: 'TASK-',

    PAD_LENGTH: 4

  }),

  /* ========================================================================
   * Common Fields
   * ====================================================================== */

  FIELD: Object.freeze({

    COMMON: Object.freeze({

      STATUS: '상태',

      OWNER: '담당자',

      DESCRIPTION: '설명',

      CREATED_AT: '생성일시',

      UPDATED_AT: '수정일시'

    }),

    PROJECT: Object.freeze({

      PROJECT_ID: 'PROJECT_ID',

      PROJECT_NAME: '프로젝트명'

    }),

    EPIC: Object.freeze({

      EPIC_ID: 'EPIC_ID',

      PROJECT_ID: 'PROJECT_ID',

      EPIC_NAME: 'EPIC명'

    }),

    FEATURE: Object.freeze({

      FEATURE_ID: 'FEATURE_ID',

      EPIC_ID: 'EPIC_ID',

      FEATURE_NAME: 'FEATURE명',

      PRIORITY: '우선순위'

    }),

    FUNCTION: Object.freeze({

      FUNCTION_ID: 'FUNCTION_ID',

      FEATURE_ID: 'FEATURE_ID',

      FUNCTION_NAME: '기능명',

      INPUT_DEFINITION: '입력',

      OUTPUT_DEFINITION: '출력',

      RELATED_SHEETS: '관련시트'

    }),

    TASK: Object.freeze({

      TASK_ID: 'TASK_ID',

      FUNCTION_ID: 'FUNCTION_ID',

      TASK_NAME: '작업명',

      START_DATE: '시작일',

      PLANNED_END_DATE: '완료예정일',

      COMPLETED_DATE: '완료일',

      PROGRESS: '진행률'

    })

  }),

  /* ========================================================================
   * Configuration
   * ====================================================================== */

  CONFIG: Object.freeze({

    CACHE_MINUTES: 30,

    MAX_RETRY: 3,

    PAGE_SIZE: 100,

    DEFAULT_TIMEZONE: 'Asia/Seoul'

  })

});