# TASK-0013 구현 보고서

- 작업명: Audit Center & Activity Log
- 버전: v0.13.0
- 작업일: 2026-07-28
- 결과: 구현 및 실제 Apps Script 테스트 완료

## 1. 추가 파일

### AuditService.gs

- 생성 목적: CHANGELOG와 분리된 운영 감사 기록 관리
- 주요 기능:
  - `writeAudit(data)`
  - `getAuditList(options)`
  - 사용자·Role 자동 기록
  - 날짜·사용자·Action·Entity·Result 필터
  - 최신순·오래된순 정렬

### Dialog_Audit.html

- 생성 목적: Audit Center 검색·조회 화면 제공
- 주요 기능:
  - 날짜 범위 검색
  - 사용자 검색
  - Action, Entity, Result 필터
  - 최신순·오래된순 정렬
  - 감사 결과 상태 표시

### Tests_AuditServiceTest.gs

- 생성 목적: 감사 기록과 기존 기능 회귀 테스트
- 주요 기능:
  - CREATE, UPDATE, DELETE, ERROR 감사 생성
  - PERMISSION_DENIED 자동 기록 검증
  - 검색·필터·정렬 검증
  - PROJECT부터 Dashboard까지 회귀 테스트

## 2. 수정 파일

### Constants.gs

- 수정 이유: 감사 시트와 공통 코드의 하드코딩 방지
- 변경 내용:
  - `SHEETS.AUDIT`
  - `ENTITY.AUDIT`
  - `AUDIT_ACTION`
  - `AUDIT_RESULT`
  - `AUDIT_FIELD`

### Config.gs

- 수정 이유: PMS 초기화 시 감사 시트 자동 생성
- 변경 내용:
  - `07_AUDIT` 시트 및 10개 컬럼 추가
  - 버전 `0.13.0`

### PermissionService.gs

- 수정 이유: 권한 거부를 감사 기록에 자동 저장
- 변경 내용:
  - `assertPermission_()`에 Entity와 Entity ID 전달 지원
  - `PERMISSION_DENIED`, `DENIED` 감사 자동 기록

### ProjectService.gs / EpicService.gs

- 수정 이유: 생성·삭제 성공 및 권한 거부 감사 기록
- 변경 내용: CREATE·DELETE Audit 연동

### FeatureAPI.gs / FunctionAPI.gs / TaskAPI.gs

- 수정 이유: 모든 변경 작업의 운영 추적성 확보
- 변경 내용: CREATE·UPDATE·DELETE 성공 Audit와 권한 거부 Audit 연동

### UI.gs

- 수정 이유: 감사 조회 화면 제공
- 변경 내용:
  - `Audit Center` 메뉴 추가
  - `showAuditCenter()` 추가

## 3. 구현 기능

- CHANGELOG와 별도인 운영 감사 기록 체계
- UUID 기반 중복 없는 `AUDIT_ID`
- 실행 시간, 사용자 이메일, Role 자동 기록
- CREATE, UPDATE, DELETE, LOGIN, DASHBOARD, PERMISSION_DENIED, ERROR 지원
- SUCCESS, FAIL, DENIED 결과 지원
- Repository 1회 조회 후 메모리 필터·정렬
- 모든 엔티티의 CREATE·UPDATE·DELETE 성공 감사
- 모든 변경 API의 권한 거부 감사
- Audit Center 검색·조회 UI

## 4. Apps Script 반영

- 실제 Apps Script 프로젝트 반영 완료
- 신규 스크립트 2개와 HTML 1개 생성
- 수정 파일 전체 반영 및 Drive 저장 완료
- `initializePMS()` 실행 완료
- Google 스프레드시트에 `07_AUDIT` 탭 생성 확인
- 스프레드시트 `HLAS-PMS → Audit Center` 메뉴 실행 확인

## 5. 실행 테스트

| 테스트 | 결과 |
|---|---|
| CREATE Audit | PASS |
| UPDATE Audit | PASS |
| DELETE Audit | PASS |
| ERROR Audit | PASS |
| PERMISSION_DENIED 자동 Audit | PASS |
| Action/Entity/Result 검색 | PASS |
| 최신순 정렬 | PASS |
| 오래된순 정렬 | PASS |
| PROJECT 회귀 | PASS |
| EPIC 회귀 | PASS |
| FEATURE 회귀 | PASS |
| FUNCTION 회귀 | PASS |
| TASK 회귀 | PASS |
| Dashboard 회귀 | PASS |
| Audit Center 화면 로딩 | PASS |

## 6. 오류 수정

- 실행 중 기능 오류 없음
- 감사 상세정보가 객체인 경우 JSON 문자열로 안전하게 저장하도록 처리
- 감사 기록 자체의 실패가 원래 업무 오류를 덮어쓰지 않도록 표준 응답 방식 유지
- 테스트로 생성한 감사 데이터는 테스트 종료 시 정리하도록 구현

## 7. 재테스트

- `initializePMS()`: PASS
- `runAuditServiceTests()`: PASS
- 실행 로그 `[TASK-0013] 전체 테스트 PASS` 확인
- `07_AUDIT` 탭 확인: PASS
- `Audit Center` 메뉴 및 필터 화면 확인: PASS

## 8. 공통모듈 개선사항

- 다음 단계에서 `executeAuditedMutation_()` 같은 공통 실행 래퍼를 도입하면 오류 감사까지 더 일관되게 자동화할 수 있음
- LOGIN 감사는 향후 Google 계정 인증 이벤트와 연결 가능
- Dashboard 조회 감사는 운영량과 로그 증가율을 검토한 뒤 선택적으로 적용 권장
- Audit 보존기간과 Archive 정책을 별도 TASK로 정의할 필요가 있음

## 9. Release

- Release: `HLAS-PMS v0.13.0`
- 주요 변경: 운영 감사 서비스, 감사 시트, 권한 거부 추적, Audit Center
- 호환성: 기존 CHANGELOG 및 CRUD 데이터 구조 유지

TASK-0013 완료

Architecture Review를 요청합니다.

PASS 판정이 나오면 다음 TASK 진행 여부를 알려주세요.
