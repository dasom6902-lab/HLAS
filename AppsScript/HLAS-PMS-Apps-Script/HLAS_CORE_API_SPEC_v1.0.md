# HLAS Core API 명세 v1.0

## 1. 문서 정보

- 문서명: HLAS Core API 명세
- 버전: 1.0
- 상태: Architecture Review 요청
- 적용 대상: HLAS-PMS
- 적용 범위: PROJECT, EPIC, FEATURE, FUNCTION, TASK

## 2. 목적

HLAS-PMS의 각 업무 기능이 동일한 생성, 조회, 수정, 삭제, 검증, 로그 규칙을
사용하도록 표준 인터페이스를 정의한다.

이번 명세 승인 전에는 공통 모듈을 구현하거나 기존 Project 및 EPIC 기능을
리팩터링하지 않는다.

## 3. 설계 원칙

1. UI는 시트를 직접 읽거나 수정하지 않는다.
2. HTML은 Apps Script의 전역 Endpoint 함수만 호출한다.
3. Endpoint는 Domain API를 호출하고 응답을 표준 형식으로 변환한다.
4. Domain API는 업무 규칙과 처리 순서를 담당한다.
5. 공통 ID, 검증, 로그, Dialog 처리는 Common Core를 사용한다.
6. 시트명과 컬럼 위치를 업무 코드에 하드코딩하지 않는다.
7. 삭제는 기본적으로 Soft Delete 또는 상태 변경을 사용한다.
8. 생성과 수정은 문서 잠금이 필요한 범위를 명확히 지정한다.
9. API 내부 오류는 표준 오류 코드로 변환한다.
10. 기존 기능은 API 승인 전까지 변경하지 않는다.

## 4. 권장 파일 구조

```text
AppsScript/
├─ Core/
│  ├─ CommonAPI.gs
│  ├─ ProjectAPI.gs
│  ├─ EpicAPI.gs
│  ├─ FeatureAPI.gs
│  ├─ FunctionAPI.gs
│  └─ TaskAPI.gs
│
├─ Common/
│  ├─ IdGenerator.gs
│  ├─ Validation.gs
│  ├─ LogService.gs
│  ├─ DialogManager.gs
│  ├─ SheetRepository.gs
│  └─ CoreError.gs
│
├─ Endpoints/
│  ├─ ProjectEndpoints.gs
│  ├─ EpicEndpoints.gs
│  ├─ FeatureEndpoints.gs
│  ├─ FunctionEndpoints.gs
│  └─ TaskEndpoints.gs
│
├─ UI.gs
└─ Config.gs
```

Google Apps Script 편집기는 실제 폴더를 지원하지 않으므로 파일명 접두사를
사용할 수 있다.

```text
Core_ProjectAPI.gs
Core_EpicAPI.gs
Common_IdGenerator.gs
Endpoint_Project.gs
```

## 5. 호출 구조

```text
Google Sheets Menu
        ↓
UI.gs / DialogManager
        ↓
HTML Dialog
        ↓ google.script.run
전역 Endpoint 함수
        ↓
Domain API
        ├─ Validation
        ├─ IdGenerator
        ├─ SheetRepository
        └─ LogService
                ↓
          Google Sheets
```

## 6. Apps Script Endpoint 제약

HTML의 `google.script.run`은 전역 서버 함수를 호출한다.

따라서 `ProjectAPI.create()`와 같은 객체 메서드를 HTML에서 직접 호출하지
않고 다음 전역 Endpoint를 둔다.

```javascript
function apiProjectCreate(request) {
  return executeApi_(function () {
    return ProjectAPI.create(request);
  });
}
```

내부 서비스는 `ProjectAPI.create()` 형식을 사용하고, HTML은
`apiProjectCreate()`를 호출한다.

## 7. 표준 요청 형식

```javascript
{
  data: {},
  context: {
    requestId: '선택',
    userEmail: '선택',
    source: 'DIALOG | MENU | SYSTEM'
  }
}
```

초기 구현에서는 `data`만 전달할 수 있으나 Core API 내부에서 표준 요청으로
정규화한다.

## 8. 표준 응답 형식

### 성공

```javascript
{
  ok: true,
  data: {},
  error: null,
  meta: {
    requestId: 'REQ-...',
    timestamp: 'ISO-8601',
    version: '0.4.0'
  }
}
```

### 실패

```javascript
{
  ok: false,
  data: null,
  error: {
    code: 'VALIDATION_REQUIRED',
    message: '프로젝트명을 입력해 주세요.',
    field: 'projectName',
    details: null
  },
  meta: {
    requestId: 'REQ-...',
    timestamp: 'ISO-8601',
    version: '0.4.0'
  }
}
```

## 9. 공통 CRUD 인터페이스

각 Domain API는 가능한 범위에서 다음 인터페이스를 제공한다.

| 함수 | 역할 |
|---|---|
| `create(input)` | 새 데이터 생성 |
| `update(id, input)` | 기존 데이터 수정 |
| `remove(id)` | 삭제 또는 상태 변경 |
| `getById(id)` | ID 기준 단건 조회 |
| `getAll(query)` | 조건에 맞는 목록 조회 |
| `validate(input, mode)` | 생성 또는 수정 검증 |

`delete`는 JavaScript 예약어는 아니지만 삭제 정책을 명확히 하기 위해
Core API에서는 `remove()`를 사용한다.

## 10. CommonAPI

### 역할

- 표준 요청 정규화
- 표준 성공 및 실패 응답 생성
- Endpoint 예외 처리
- 요청 ID 발급
- 공통 실행 시간 기록

### 함수

| 함수 | 입력 | 출력 | 역할 |
|---|---|---|---|
| `normalizeRequest(request)` | 요청 | 표준 요청 | 누락된 context 보완 |
| `success(data, meta)` | 데이터 | 표준 성공 응답 | 응답 구조 통일 |
| `failure(error, meta)` | 오류 | 표준 실패 응답 | 오류 구조 통일 |
| `execute(handler, request)` | 실행 함수 | 표준 응답 | 예외 포착 및 변환 |
| `createRequestId()` | 없음 | 문자열 | 요청 추적 ID 생성 |

## 11. ProjectAPI

### 데이터 모델

```javascript
{
  projectId: 'PRJ-0001',
  projectName: '',
  description: '',
  status: '진행중',
  currentVersion: '',
  owner: '',
  startDate: '',
  plannedEndDate: '',
  createdAt: '',
  updatedAt: ''
}
```

### 함수

| 함수 | 역할 |
|---|---|
| `create(input)` | 프로젝트 생성 |
| `update(projectId, input)` | 프로젝트 수정 |
| `remove(projectId)` | 프로젝트 종료 또는 삭제 상태 처리 |
| `getById(projectId)` | 프로젝트 단건 조회 |
| `getAll(query)` | 프로젝트 목록 조회 |
| `getOptions(query)` | Dialog 선택 목록 반환 |
| `validate(input, mode)` | 프로젝트명 및 날짜 검증 |
| `exists(projectId)` | PROJECT_ID 존재 여부 확인 |

### Endpoint

- `apiProjectCreate(request)`
- `apiProjectUpdate(request)`
- `apiProjectRemove(request)`
- `apiProjectGetById(request)`
- `apiProjectGetAll(request)`
- `apiProjectGetOptions(request)`

## 12. EpicAPI

### 데이터 모델

```javascript
{
  epicId: 'EPIC-0001',
  projectId: 'PRJ-0001',
  epicName: '',
  description: '',
  status: '진행중',
  priority: '보통',
  owner: '',
  startDate: '',
  plannedEndDate: '',
  createdAt: '',
  updatedAt: ''
}
```

### 함수

| 함수 | 역할 |
|---|---|
| `create(input)` | EPIC 생성 |
| `update(epicId, input)` | EPIC 수정 |
| `remove(epicId)` | EPIC 삭제 상태 처리 |
| `getById(epicId)` | EPIC 단건 조회 |
| `getAll(query)` | EPIC 목록 조회 |
| `getByProject(projectId)` | 프로젝트별 EPIC 목록 조회 |
| `validate(input, mode)` | 필수값, PROJECT_ID, 날짜 검증 |
| `exists(epicId)` | EPIC_ID 존재 여부 확인 |

### Endpoint

- `apiEpicCreate(request)`
- `apiEpicUpdate(request)`
- `apiEpicRemove(request)`
- `apiEpicGetById(request)`
- `apiEpicGetAll(request)`
- `apiEpicGetByProject(request)`

## 13. FeatureAPI

### 데이터 모델

```javascript
{
  featureId: 'FEAT-0001',
  epicId: 'EPIC-0001',
  featureName: '',
  description: '',
  status: '진행중',
  priority: '보통',
  owner: '',
  createdAt: '',
  updatedAt: ''
}
```

### 함수

- `create(input)`
- `update(featureId, input)`
- `remove(featureId)`
- `getById(featureId)`
- `getAll(query)`
- `getByEpic(epicId)`
- `validate(input, mode)`
- `exists(featureId)`

### Endpoint

- `apiFeatureCreate(request)`
- `apiFeatureUpdate(request)`
- `apiFeatureRemove(request)`
- `apiFeatureGetById(request)`
- `apiFeatureGetAll(request)`
- `apiFeatureGetByEpic(request)`

## 14. FunctionAPI

### 데이터 모델

```javascript
{
  functionId: 'FUNC-0001',
  featureId: 'FEAT-0001',
  functionName: '',
  description: '',
  inputDefinition: '',
  outputDefinition: '',
  relatedSheets: '',
  status: '진행중',
  owner: '',
  createdAt: '',
  updatedAt: ''
}
```

### 함수

- `create(input)`
- `update(functionId, input)`
- `remove(functionId)`
- `getById(functionId)`
- `getAll(query)`
- `getByFeature(featureId)`
- `validate(input, mode)`
- `exists(functionId)`

### Endpoint

- `apiFunctionCreate(request)`
- `apiFunctionUpdate(request)`
- `apiFunctionRemove(request)`
- `apiFunctionGetById(request)`
- `apiFunctionGetAll(request)`
- `apiFunctionGetByFeature(request)`

## 15. TaskAPI

### 데이터 모델

```javascript
{
  taskId: 'TASK-0001',
  functionId: 'FUNC-0001',
  epicId: 'EPIC-0001',
  taskName: '',
  description: '',
  status: '대기',
  priority: '보통',
  owner: '',
  startDate: '',
  plannedEndDate: '',
  completedDate: '',
  progress: 0,
  createdAt: '',
  updatedAt: ''
}
```

### 함수

- `create(input)`
- `update(taskId, input)`
- `remove(taskId)`
- `getById(taskId)`
- `getAll(query)`
- `getByFunction(functionId)`
- `getByEpic(epicId)`
- `changeStatus(taskId, status)`
- `updateProgress(taskId, progress)`
- `validate(input, mode)`
- `exists(taskId)`

### Endpoint

- `apiTaskCreate(request)`
- `apiTaskUpdate(request)`
- `apiTaskRemove(request)`
- `apiTaskGetById(request)`
- `apiTaskGetAll(request)`
- `apiTaskGetByFunction(request)`
- `apiTaskGetByEpic(request)`
- `apiTaskChangeStatus(request)`
- `apiTaskUpdateProgress(request)`

## 16. 공통 모듈 인터페이스 후보

### IdGenerator

```javascript
IdGenerator.next({
  entity: 'PROJECT',
  prefix: 'PRJ',
  digits: 4,
  sheetName: '01_PROJECT',
  idColumn: 'PROJECT_ID'
});
```

지원 대상:

- PROJECT
- EPIC
- FEATURE
- FUNCTION
- TASK
- CHANGELOG

### Validation

```javascript
Validation.required(value, fieldName);
Validation.date(value, fieldName);
Validation.dateRange(startDate, endDate);
Validation.referenceExists(entity, id);
Validation.oneOf(value, allowedValues, fieldName);
Validation.progress(value);
```

### LogService

```javascript
LogService.write({
  changeType: 'EPIC_CREATE',
  message: 'EPIC 생성: Core API 설계',
  relatedId: 'EPIC-0001',
  result: '성공',
  actor: ''
});
```

### DialogManager

```javascript
DialogManager.show({
  fileName: 'Dialog_Epic',
  title: 'EPIC 생성',
  width: 540,
  height: 620,
  requiredSheets: ['01_PROJECT', '02_EPIC']
});
```

### SheetRepository

```javascript
SheetRepository.getAll(schema);
SheetRepository.getById(schema, id);
SheetRepository.append(schema, record);
SheetRepository.update(schema, id, record);
SheetRepository.exists(schema, id);
```

## 17. 네이밍 규칙

### 파일명

| 대상 | 형식 | 예시 |
|---|---|---|
| Domain API | PascalCase + API | `ProjectAPI.gs` |
| Endpoint | PascalCase + Endpoints | `ProjectEndpoints.gs` |
| Service | PascalCase + Service | `LogService.gs` |
| 공통 기능 | PascalCase | `Validation.gs` |
| Dialog | Dialog_ + PascalCase | `Dialog_Epic.html` |

### 함수명

- 공개 함수: `camelCase`
- 내부 전용 함수: `camelCase_`
- Endpoint: `api` + Entity + Action
- Boolean 함수: `is`, `has`, `exists` 접두사 사용

예시:

```javascript
apiProjectCreate()
generateNextId_()
exists()
isValidDate_()
```

### 변수명

- `camelCase`
- 축약어 남용 금지
- ID는 `projectId`, `epicId` 형식 사용
- 시트 객체는 `projectSheet`, `epicSheet` 형식 사용

### 상수명

- `UPPER_SNAKE_CASE`

```javascript
const DEFAULT_STATUS = '진행중';
const PROJECT_SHEET_NAME = '01_PROJECT';
```

### 시트 접근

업무 파일에서 시트명을 문자열로 직접 작성하지 않는다.

```javascript
PMS_CONFIG.sheetNames.PROJECT
PMS_CONFIG.sheetNames.EPIC
```

스키마도 Config에서 관리한다.

```javascript
PMS_CONFIG.schemas.PROJECT
PMS_CONFIG.schemas.EPIC
```

## 18. 오류 코드 후보

| 코드 | 의미 |
|---|---|
| `VALIDATION_REQUIRED` | 필수값 누락 |
| `VALIDATION_DATE` | 날짜 형식 오류 |
| `VALIDATION_DATE_RANGE` | 시작일/종료일 순서 오류 |
| `REFERENCE_NOT_FOUND` | 참조 ID 없음 |
| `ENTITY_NOT_FOUND` | 조회 대상 없음 |
| `DUPLICATE_ID` | ID 중복 |
| `SHEET_NOT_FOUND` | 필수 시트 없음 |
| `LOCK_TIMEOUT` | 문서 잠금 실패 |
| `INTERNAL_ERROR` | 미분류 내부 오류 |

## 19. 의존성 검토

### 현재 ProjectService.gs

현재 포함된 책임:

- 입력 검증
- 날짜 변환
- PROJECT_ID 생성
- 시트 저장
- CHANGELOG 기록

승인 후 분리 대상:

- ID 생성 → `IdGenerator`
- 검증 및 날짜 → `Validation`
- 시트 처리 → `SheetRepository`
- 로그 → `LogService`
- 업무 흐름 → `ProjectAPI`

### 현재 EpicService.gs

현재 포함된 책임:

- 프로젝트 선택 목록
- 입력 검증
- 참조 확인
- 날짜 검증
- EPIC_ID 생성
- EPIC 저장 및 조회
- CHANGELOG 기록

승인 후 분리 대상:

- ID 생성 → `IdGenerator`
- 필수값, 날짜, 참조 검증 → `Validation`
- 저장 및 조회 → `SheetRepository`
- 로그 → `LogService`
- 업무 흐름 → `EpicAPI`

### 현재 UI.gs

현재 각 Dialog에서 반복되는 책임:

- 필수 시트 확인
- HTML 파일 생성
- 너비 및 높이 설정
- 모달 표시

승인 후 `DialogManager`로 분리한다.

### 현재 Code.gs

현재 `appendChangeLog_()`가 초기화와 업무 기능에서 함께 사용된다.

승인 후 `LogService.write()`로 이동하고 초기화도 동일 API를 사용한다.

## 20. 필요한 수정 제안

API 승인 후 다음 순서로 수정한다.

1. Config에 `sheetNames`와 `schemas` 추가
2. `CoreError.gs`와 표준 응답 구조 구현
3. `IdGenerator.gs` 구현
4. `Validation.gs` 구현
5. `LogService.gs` 구현
6. `DialogManager.gs` 구현
7. `SheetRepository.gs` 구현
8. Project 기능 리팩터링
9. Project 회귀 테스트
10. Epic 기능 리팩터링
11. Epic 회귀 테스트
12. FeatureAPI 구현 시작

## 21. 승인 필요 항목

Architecture Review에서 다음 항목을 확정해야 한다.

1. 내부 객체 API + 전역 Endpoint 이중 구조
2. 표준 응답의 `ok/data/error/meta` 형식
3. 삭제 함수명 `remove()`
4. ID 형식과 자릿수
5. Soft Delete 정책
6. 시트 스키마의 Config 중앙 관리
7. SheetRepository 포함 여부
8. 오류 코드 체계

