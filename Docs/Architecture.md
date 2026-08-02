# HLAS Architecture

Version: 1.0.0-RC1

## 구성

- UI Layer: Apps Script 메뉴와 HTML Dialog
- Domain API: Project, Epic, Feature, Function, Task, Workflow, Analytics
- Core Layer: CommonAPI, Validation, CoreError, SheetRepository
- Platform Layer: Audit, Notification, Scheduler, Integration, Reliability
- Data Layer: Google Sheets와 Script Properties

## 주요 흐름

`UI → Domain API → Validation/Permission → Repository → Audit/Event/Notification`

외부 연동 흐름:

`API Gateway → Authentication → Rate Limit → Domain API → API Log`

이벤트 흐름:

`Domain/Workflow → EventBus → Webhook → External System`

운영 흐름:

`Scheduler → Health/Analytics/Notification → Audit`

## 데이터 원칙

- 시트 첫 번째 컬럼은 ID다.
- Repository는 헤더명을 기준으로 데이터를 읽고 쓴다.
- Secret은 Script Properties에 보관한다.
- 모든 공개 API는 `{ok,data,error,meta}`를 반환한다.
- 기존 CRUD API는 RC1에서 변경하지 않는다.

## 기술부채

- 초기 Project/Epic 코드 일부의 직접 Spreadsheet 접근은 v1.0 호환성 때문에 유지한다.
- Apps Script 실행시간과 Sheets 행 규모가 증가하면 Batch Repository와 외부 DB 검토가 필요하다.

