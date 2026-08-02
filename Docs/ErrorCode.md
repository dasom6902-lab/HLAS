# HLAS Error Codes

Version : 1.0.0-RC1

## Error Response Format

{
  ok:false,
  data:null,
  error:{
      code:"",
      message:"",
      field:"",
      details:null
  }
}

---

# Validation

| Code | Description |
|------|-------------|
| INVALID_PARAMETER | 입력값 오류 |
| REQUIRED_FIELD | 필수 입력 누락 |
| INVALID_FORMAT | 형식 오류 |
| INVALID_STATUS | 상태값 오류 |

---

# Repository

| Code | Description |
|------|-------------|
| DATA_NOT_FOUND | 데이터 없음 |
| DUPLICATE_DATA | 중복 데이터 |
| SHEET_NOT_FOUND | 시트 없음 |
| COLUMN_NOT_FOUND | 컬럼 없음 |

---

# Permission

| Code | Description |
|------|-------------|
| PERMISSION_DENIED | 권한 없음 |
| LOGIN_REQUIRED | 로그인 필요 |
| TOKEN_EXPIRED | Token 만료 |
| INVALID_API_KEY | API Key 오류 |

---

# Workflow

| Code | Description |
|------|-------------|
| INVALID_WORKFLOW | 잘못된 Workflow |
| APPROVAL_REQUIRED | 승인 필요 |
| INVALID_STATE | 상태 변경 불가 |

---

# Scheduler

| Code | Description |
|------|-------------|
| SCHEDULE_FAILED | Scheduler 실패 |
| JOB_ALREADY_RUNNING | 실행 중 |

---

# Backup

| Code | Description |
|------|-------------|
| BACKUP_FAILED | 백업 실패 |
| RESTORE_FAILED | 복구 실패 |

---

# System

| Code | Description |
|------|-------------|
| INTERNAL_ERROR | 내부 오류 |
| UNKNOWN_ERROR | 알 수 없는 오류 |
| RATE_LIMIT_EXCEEDED | 요청 제한 초과 |

---

## Error Handling Rules

- 모든 오류는 CommonAPI 형식을 따른다.
- message는 사용자에게 표시 가능한 내용으로 작성한다.
- details에는 Stack Trace를 저장하지 않는다.
- requestId를 통해 Audit Log와 연결한다.

---

Status : RC1 Ready