# TASK-0012 구현 보고서

- 작업명: Role & Permission Framework (RBAC)
- 버전: v0.12.0
- 작업일: 2026-07-28
- 결과: 구현 및 실제 Apps Script 테스트 완료

## 1. 추가 파일

### PermissionService.gs

- 생성 목적: 역할별 권한 판정과 API 접근 차단을 공통 처리
- 주요 기능:
  - `hasPermission(userRole, permission)`
  - `getPermissionContext()`
  - 비공개 권한 강제 함수 `assertPermission_()`

### RoleService.gs

- 생성 목적: 현재 실행 사용자의 역할과 이메일 조회
- 주요 기능:
  - `getCurrentRole()`
  - `getCurrentUser()`
  - `06_USER` 활성 사용자 조회
  - Script Property 기반 테스트 역할 및 기본 역할 지원

### Tests_PermissionTest.gs

- 생성 목적: 역할 행렬, 메뉴 권한, CRUD 차단, Dashboard, 회귀 테스트
- 주요 기능:
  - `runPermissionTests()`
  - ADMIN/MANAGER/USER/VIEWER 권한 검증
  - USER 삭제 및 VIEWER 생성 차단 검증

## 2. 수정 파일

### Constants.gs

- 수정 이유: 역할·권한·사용자 상태·사용자 컬럼을 공통 상수로 관리
- 변경 내용: `SHEETS.USER`, `ROLE`, `PERMISSION`, `USER_STATUS`, `USER_FIELD` 추가

### Config.gs

- 수정 이유: 사용자 역할 관리용 시트 자동 생성
- 변경 내용: `06_USER` 시트 정의와 일곱 개 컬럼 추가, 버전 `0.12.0`

### ProjectService.gs / EpicService.gs

- 수정 이유: 생성·삭제 동작에 역할 권한 적용
- 변경 내용: CREATE 및 DELETE 실행 전 공통 권한 검사

### FeatureAPI.gs / FunctionAPI.gs / TaskAPI.gs

- 수정 이유: 모든 변경 API에 RBAC 적용
- 변경 내용: CREATE, UPDATE, DELETE 실행 전 공통 권한 검사

### DashboardService.gs

- 수정 이유: Dashboard 접근 권한 적용
- 변경 내용: 집계 실행 전 DASHBOARD 권한 검사

### UI.gs

- 수정 이유: 사용자 역할에 따라 메뉴를 다르게 표시
- 변경 내용:
  - VIEWER는 생성 메뉴 미표시
  - USER는 생성 메뉴 표시, 삭제 권한 없음
  - DASHBOARD 권한 보유 시 KPI Dashboard 표시
  - UPDATE 권한 보유 시 PMS 초기화 표시

### Dialog_FeatureList.html / Dialog_FunctionList.html / Dialog_TaskList.html

- 수정 이유: 화면에서도 권한 없는 작업을 사전에 차단
- 변경 내용:
  - CREATE 권한 없으면 생성 버튼 숨김
  - DELETE 권한 없으면 삭제 버튼 비활성

## 3. 구현 기능

- ADMIN: READ, CREATE, UPDATE, DELETE, DASHBOARD
- MANAGER: READ, CREATE, UPDATE, DELETE, DASHBOARD
- USER: READ, CREATE, UPDATE, DASHBOARD
- VIEWER: READ, DASHBOARD
- `06_USER` 시트의 활성 이메일을 기준으로 역할 조회
- Script Property `HLAS_TEST_ROLE`을 통한 테스트 역할 전환
- Script Property `DEFAULT_ROLE` 지원
- 기존 사용자 호환을 위한 초기 기본 역할 ADMIN
- 권한 거부 시 `PERMISSION_DENIED` 표준 오류 반환
- 메뉴와 목록 Dialog에 권한 반영

## 4. Apps Script 반영

- 반영 완료
- Google Apps Script 프로젝트에 신규 파일 3개 추가
- 수정 파일 전체 반영 및 Drive 저장 완료
- `initializePMS()` 실행 완료
- Google 스프레드시트에 `06_USER` 탭 생성 확인

## 5. 실행 테스트

| 테스트 | 결과 |
|---|---|
| ADMIN 권한 행렬 | PASS |
| MANAGER 권한 행렬 | PASS |
| USER 권한 행렬 | PASS |
| VIEWER 권한 행렬 | PASS |
| 메뉴 표시 권한 | PASS |
| Dashboard 접근 | PASS |
| VIEWER CREATE 차단 | PASS |
| USER CREATE/UPDATE | PASS |
| USER DELETE 차단 | PASS |
| MANAGER DELETE | PASS |
| PROJECT 회귀 | PASS |
| EPIC 회귀 | PASS |
| FEATURE 회귀 | PASS |
| FUNCTION 회귀 | PASS |
| TASK 회귀 | PASS |

## 6. 오류 수정

- 테스트 중 기능 오류 없음
- 권한 테스트용 데이터는 테스트 종료 시 정리하도록 구현
- 초기 설치 전 `06_USER` 시트가 없더라도 기본 역할로 안전하게 동작하도록 예외 처리

## 7. 재테스트

- `initializePMS()` 실행: PASS
- `runPermissionTests()` 전체 실행: PASS
- 실행 로그의 `[TASK-0012] 전체 테스트 PASS` 확인
- 스프레드시트 새로고침 후 `06_USER` 및 `HLAS-PMS` 메뉴 확인: PASS

## 8. 공통모듈 개선사항

- 향후 사용자 관리 CRUD는 별도 `UserAPI.gs`로 분리 가능
- 운영 전 `DEFAULT_ROLE`을 VIEWER 또는 USER로 낮추는 보안 정책 검토 필요
- Google Workspace 계정 연동 시 `RoleService` 내부 조회부만 교체 가능
- 삭제 버튼이 있는 모든 신규 Dialog는 `getPermissionContext()`를 공통 사용

## 9. Release

- Release: `HLAS-PMS v0.12.0`
- 주요 변경: 역할 기반 권한 프레임워크, 사용자 시트, API 보호, 메뉴·Dialog 권한 처리
- 호환성: 기존 PROJECT/EPIC/FEATURE/FUNCTION/TASK 데이터 구조 유지

TASK-0012 완료

Architecture Review를 요청합니다.

PASS 판정이 나오면 다음 TASK 진행 여부를 알려주세요.
