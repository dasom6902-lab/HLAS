# TASK-0008 구현 보고서

## 1. 추가 파일

### ParentValidator.gs
- 생성 목적: 부모 엔티티 존재 여부 검증을 공통화한다.
- 주요 기능: `validateParent(entityType, parentId)`로 EPIC, FEATURE, FUNCTION을 조회하고 존재하지 않으면 표준 `NotFoundError`를 발생시킨다.

### TaskAPI.gs
- 생성 목적: FUNCTION 하위 TASK 엔티티의 CRUD API를 제공한다.
- 주요 기능: 목록·단건 조회, 생성, 수정, 삭제, Dialog용 초기 데이터 제공, FUNCTION→FEATURE→EPIC 관계 검증, CHANGELOG 기록.

### Dialog_Task.html
- 생성 목적: TASK 등록·수정 화면을 제공한다.
- 주요 기능: FUNCTION 선택, TASK 정보 입력, 필수값 검증, 저장 결과 표시.

### Dialog_TaskList.html
- 생성 목적: TASK 목록 조회와 수정·삭제 진입 화면을 제공한다.
- 주요 기능: FUNCTION 필터, 새로고침, TASK 등록, 수정, 삭제.

### Tests_TaskTest.gs
- 생성 목적: TASK CRUD와 공통 모듈 및 기존 기능의 회귀 테스트를 실행한다.
- 주요 기능: `runTaskTests()`로 TASK 생성·조회·수정·목록·삭제, 부모 연결, ID 생성, 기존 기능을 검증한다.

## 2. 수정 파일

### Constants.gs
- 수정 이유: TASK 관련 시트명, 엔티티, ID 접두사, 필드명과 로그 타입을 공통 상수로 관리한다.
- 변경 내용: `TASK`, `TASK_FIELD`, TASK 생성·수정·삭제 로그 타입을 추가했다.

### IdGenerator.gs
- 수정 이유: TASK ID를 공통 생성기로 발급한다.
- 변경 내용: `TASK → TASK-0001` 규칙을 지원하도록 확장했다.

### FeatureAPI.gs
- 수정 이유: EPIC 부모 검증을 공통화한다.
- 변경 내용: 자체 부모 검증을 `validateParent(ENTITY.EPIC, epicId)` 호출로 교체했다.

### FunctionAPI.gs
- 수정 이유: FEATURE 부모 검증을 공통화한다.
- 변경 내용: 자체 부모 검증을 `validateParent(ENTITY.FEATURE, featureId)` 호출로 교체했다.

### UI.gs
- 수정 이유: HLAS-PMS 메뉴에서 TASK 등록·목록·수정 Dialog를 실행한다.
- 변경 내용: `TASK 관리` 하위 메뉴와 Dialog 실행 함수를 추가하고, 기존 준비중용 `createTask()` 이름 충돌을 제거했다.

### Config.gs
- 수정 이유: 배포 버전을 TASK-0008 기준으로 갱신한다.
- 변경 내용: 버전을 `0.8.0`으로 변경했다.

## 3. 구현 기능

- `getTaskList(functionId)`
- `getTask(id)`
- `createTask(data)`
- `updateTask(id, data)`
- `deleteTask(id)`
- `getTaskFormData(taskId)`
- `validateParent(entityType, parentId)`
- TASK ID 자동 생성
- FUNCTION→FEATURE→EPIC 연결 및 EPIC_ID 자동 저장
- TASK 등록·목록·수정·삭제 Dialog
- 생성·수정·삭제 CHANGELOG 기록
- 공통 응답 형식 `{ok, data, error, meta}` 적용

## 4. Apps Script 반영

- 실제 HLAS-PMS Apps Script 프로젝트에 신규 파일 5개와 수정 파일 6개를 반영했다.
- 스프레드시트 새로고침 후 `HLAS-PMS → TASK 관리` 메뉴 생성을 확인했다.
- TASK 등록과 TASK 목록 Dialog가 실제로 열리는 것을 확인했다.

## 5. 실행 테스트

| 테스트 | 결과 |
|---|---|
| TASK 생성 | PASS |
| TASK 수정 | PASS |
| TASK 삭제 | PASS |
| TASK 조회 | PASS |
| FUNCTION 연결 | PASS |
| ParentValidator | PASS |
| IdGenerator | PASS |
| 기존 PROJECT | PASS |
| 기존 EPIC | PASS |
| 기존 FEATURE | PASS |
| 기존 FUNCTION | PASS |
| TASK 등록 Dialog | PASS |
| TASK 목록 Dialog | PASS |

## 6. 오류 수정

- 기존 `UI.gs`의 준비중용 `createTask()`가 신규 API의 `createTask(data)`와 충돌할 수 있는 문제를 제거했다.
- FUNCTION이 없을 때 TASK 등록 저장 버튼을 비활성화하고 안내 문구를 표시하도록 방어 처리했다.

## 7. 재테스트

- `runTaskTests()` 전체 재실행 결과 모든 항목 PASS.
- TASK 메뉴, 등록 Dialog, 목록 Dialog 재확인 결과 PASS.
- 테스트 데이터는 테스트 종료 시 삭제되어 운영 데이터에 남지 않는다.

## 8. 공통모듈 개선사항

- ParentValidator가 EPIC, FEATURE, FUNCTION의 공통 부모 검증을 담당한다.
- 향후 PROJECT 또는 TASK를 부모로 갖는 엔티티가 추가되면 상수 매핑만 확장할 수 있다.
- UI Dialog의 공통 로딩·오류 표시 부분은 향후 DialogManager 후보이다.
- 엔티티별 행 매핑 코드는 향후 Mapper 계층 도입을 검토할 수 있다.

## 9. Release

- Version: `v0.8.0`
- Release: `HLAS-PMS-Task-v0.8.0.zip`
- 공식 저장 위치:
  - 소스: `F:\HLAS\AppsScript`
  - 보고서: `F:\HLAS\Docs`
  - 테스트: `F:\HLAS\Test`
  - 배포본: `F:\HLAS\Release`

TASK-0008 완료

Architecture Review를 요청합니다.

PASS 판정이 나오면 다음 TASK 진행 여부를 알려주세요.
