# TASK-0009 구현 보고서

## 1. 추가 파일

### DeletePolicy.gs
- 생성 목적: 엔티티 계층의 참조 무결성 삭제 정책을 한 곳에서 관리한다.
- 주요 기능:
  - `canDeleteProject(projectId)`
  - `canDeleteEpic(epicId)`
  - `canDeleteFeature(featureId)`
  - `canDeleteFunction(functionId)`
  - 삭제 제한 시 `REFERENTIAL_INTEGRITY` 표준 오류 변환

### Tests_DeletePolicyTest.gs
- 생성 목적: 전체 엔티티 계층의 삭제 제한과 회귀 테스트를 실제 실행한다.
- 주요 기능: PROJECT→EPIC→FEATURE→FUNCTION→TASK 테스트 계층 생성, 상위 삭제 제한, 하위부터 정상 삭제, CHANGELOG 정책 및 기존 기능 검증.

## 2. 수정 파일

### Constants.gs
- 수정 이유: 삭제 정책과 로그에서 사용하는 공통 문자열을 상수화한다.
- 변경 내용: PROJECT·EPIC 필드 상수와 삭제 로그 타입을 추가했다.

### ProjectService.gs
- 수정 이유: PROJECT 삭제 전에 EPIC 존재 여부를 검사한다.
- 변경 내용: Core 표준 응답을 사용하는 `deleteProject(id)`를 추가했다.

### EpicService.gs
- 수정 이유: EPIC 삭제 전에 FEATURE 존재 여부를 검사한다.
- 변경 내용: Core 표준 응답을 사용하는 `deleteEpic(id)`을 추가했다.

### FeatureAPI.gs
- 수정 이유: FEATURE 삭제 전에 FUNCTION 존재 여부를 검사한다.
- 변경 내용: `canDeleteFeature()` 정책 검사를 삭제 직전에 적용했다.

### FunctionAPI.gs
- 수정 이유: FUNCTION 삭제 전에 TASK 존재 여부를 검사한다.
- 변경 내용: `canDeleteFunction()` 정책 검사를 삭제 직전에 적용했다.

### Dialog_FeatureList.html
- 수정 이유: 삭제 제한 오류를 Dialog에서 명확하게 표시한다.
- 변경 내용: CommonAPI 오류 메시지를 경고 Dialog로 표시한다.

### Dialog_FunctionList.html
- 수정 이유: 삭제 제한 오류를 Dialog에서 명확하게 표시한다.
- 변경 내용: CommonAPI 오류 메시지를 경고 Dialog로 표시한다.

### Config.gs
- 수정 이유: TASK-0009 릴리스 버전을 반영한다.
- 변경 내용: 버전을 `0.9.0`으로 변경했다.

## 3. 구현 기능

- PROJECT: 하위 EPIC 존재 시 삭제 제한
- EPIC: 하위 FEATURE 존재 시 삭제 제한
- FEATURE: 하위 FUNCTION 존재 시 삭제 제한
- FUNCTION: 하위 TASK 존재 시 삭제 제한
- TASK: 항상 삭제 가능
- 삭제 제한 응답:

```javascript
{
  ok: false,
  data: null,
  error: {
    code: 'REFERENTIAL_INTEGRITY',
    message: '하위 ...이 존재합니다.'
  },
  meta: {}
}
```

- 삭제 성공한 경우에만 CHANGELOG 기록
- 삭제 실패 시 원본 데이터 유지

## 4. Apps Script 반영

- HLAS-PMS 실제 Apps Script 프로젝트에 신규 파일 2개와 수정 파일 8개를 반영했다.
- `runDeletePolicyTests()`를 실제 실행했다.
- 실제 스프레드시트의 PROJECT, EPIC, FEATURE, FUNCTION, TASK 시트를 사용해 검증했다.

## 5. 실행 테스트

| 테스트 | 결과 |
|---|---|
| PROJECT 삭제 제한 | PASS |
| EPIC 삭제 제한 | PASS |
| FEATURE 삭제 제한 | PASS |
| FUNCTION 삭제 제한 | PASS |
| 삭제 실패 CHANGELOG 미기록 | PASS |
| TASK 삭제 가능 | PASS |
| FUNCTION 하위 삭제 후 삭제 | PASS |
| FEATURE 하위 삭제 후 삭제 | PASS |
| EPIC 하위 삭제 후 삭제 | PASS |
| PROJECT 하위 삭제 후 삭제 | PASS |
| 기존 PROJECT | PASS |
| 기존 EPIC | PASS |
| 기존 FEATURE | PASS |
| 기존 FUNCTION | PASS |
| 기존 TASK | PASS |

## 6. 오류 수정

- 기존 FEATURE와 FUNCTION 삭제가 하위 데이터 존재 여부를 확인하지 않고 물리 삭제하던 문제를 수정했다.
- PROJECT와 EPIC에 Core 표준 삭제 API가 없던 부분을 보완했다.
- 삭제 제한 오류가 목록 영역을 덮어쓰는 대신 경고 Dialog로 표시되도록 개선했다.

## 7. 재테스트

- `runDeletePolicyTests()` 전체 재실행 결과 PASS.
- 테스트 종료 후 생성한 테스트 계층이 모두 삭제된 것을 확인했다.
- 삭제 실패 후 원본 데이터와 CHANGELOG 건수가 유지되는 것을 확인했다.

## 8. 공통모듈 개선사항

- DeletePolicy는 Repository 기반으로 구현되어 SpreadsheetApp에 직접 접근하지 않는다.
- 삭제 정책 실패는 `ValidationError`의 `REFERENTIAL_INTEGRITY` 코드로 통일했다.
- 향후 엔티티가 늘어나면 부모·자식 매핑 테이블 기반의 단일 `canDelete(entityType, id)` API로 확장할 수 있다.
- ProjectService와 EpicService의 생성 기능은 아직 Legacy 응답 형식이므로 향후 Core API 전환 대상이다.

## 9. Release

- Version: `v0.9.0`
- Release: `HLAS-PMS-DeletePolicy-v0.9.0.zip`
- 공식 저장 위치:
  - 소스: `F:\HLAS\AppsScript`
  - 보고서: `F:\HLAS\Docs`
  - 테스트: `F:\HLAS\Test`
  - 배포본: `F:\HLAS\Release`

TASK-0009 완료

Architecture Review를 요청합니다.

PASS 판정이 나오면 다음 TASK 진행 여부를 알려주세요.
