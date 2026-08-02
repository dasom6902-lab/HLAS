# HLAS v1.0.0-RC1 Release Note

## 범위

HLAS-PMS 기반 기능을 Release Candidate 수준으로 통합했다.

## 포함 기능

- Project → Epic → Feature → Function → Task
- Search, Dashboard, RBAC, Audit, Notification
- Scheduler, Import/Export/Backup
- Workflow/Approval
- Analytics/KPI/Report
- Integration/Open API/Webhook/EventBus
- Platform Reliability

## RC1 Hardening

- API/Architecture 호환성 유지
- Secret 저장과 로그 마스킹 검토
- Health/Retry/Circuit/Recovery 검증
- 설치·운영·개발·사용자 문서 작성
- 전체 Regression 수행

## 알려진 제한

- Google Apps Script 실행시간과 Sheets 용량 제한을 따른다.
- OAuth2와 외부 데이터베이스는 후속 버전 범위다.
- RC1 승인 전 운영 핵심 데이터에 적용하지 않는다.

