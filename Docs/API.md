# HLAS API

Version: v1 / 1.0.0-RC1

## 표준 응답

```json
{"ok":true,"data":{},"error":null,"meta":{"requestId":"","timestamp":"","version":""}}
```

오류 응답은 `error.code`, `message`, `field`, `details`를 포함한다.

## Domain API

- Project/Epic/Feature/Function/Task: 조회·생성·수정·삭제
- Workflow: 상태 변경, 이력, 승인·반려
- Analytics/KPI: 조직·프로젝트·사용자 KPI
- Import/Export/Backup
- Audit/Notification/Scheduler

## Open API

- Version: `v1`
- Entity: PROJECT, FEATURE, FUNCTION, TASK, USER, REPORT
- Method: GET, POST, PUT, DELETE
- 인증: API Key 또는 Bearer Token
- Rate Limit: Client별 시간당 100건

API Key 원문은 발급 시 한 번만 표시되며 저장 시 SHA-256 해시 처리한다.

## Event/Webhook

지원 이벤트:

- TASK_CREATED
- TASK_UPDATED
- WORKFLOW_CHANGED
- APPROVAL_COMPLETED
- BACKUP_COMPLETED
- REPORT_GENERATED

Webhook은 최대 3회 재시도하며 실패 시 Audit과 Notification을 남긴다.

