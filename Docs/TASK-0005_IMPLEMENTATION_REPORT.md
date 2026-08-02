# TASK-0005 구현 보고서

- 작업명: Core 공통모듈 구현 (Phase 1)
- 작업일: 2026-07-28
- 기준 명세: HLAS Core API 명세 v1.0
- 릴리스: HLAS Core Common Modules v0.1.0

## 1. 추가 파일

### CoreError.gs

- 생성 목적: Core API 전역에서 사용하는 표준 오류 객체 제공
- 주요 기능:
  - `CoreError`
  - `ValidationError`
  - `NotFoundError`
  - `DuplicateError`
  - `SystemError`
  - 오류의 표준 객체 변환

### SheetRepository.gs

- 생성 목적: Google Sheets 데이터 접근을 Repository 계층으로 통합
- 주요 기능:
  - `getSheet(sheetName)`
  - `findAll(sheetName)`
  - `findById(sheetName, id)`
  - `insert(sheetName, rowData)`
  - `update(sheetName, id, rowData)`
  - `delete(sheetName, id)`
  - 헤더명 기반 행/객체 변환
  - Core 테스트용 임시 시트 생성 및 정리

### Validation.gs

- 생성 목적: 엔티티별 중복 검증 코드를 공통화
- 주요 기능:
  - `required()`
  - `maxLength()`
  - `minLength()`
  - `uniqueId()`
  - `validStatus()`
  - `validDate()`
  - `dateRange()`

### CommonAPI.gs

- 생성 목적: PROJECT, EPIC, FEATURE, FUNCTION, TASK API가 공유할 표준 응답과 실행 흐름 제공
- 주요 기능:
  - `success()`
  - `fail()`
  - `validate()`
  - `writeLog()`
  - `execute()`
  - `{ok, data, error, meta}` 응답 형식 통일

### CoreModuleTest.gs

- 생성 목적: Apps Script 환경에서 공통 모듈을 실제 실행 검증
- 주요 기능:
  - 오류 객체 테스트
  - Validation 테스트
  - Repository CRUD 테스트
  - CommonAPI 응답 테스트
  - 임시 테스트 시트 자동 삭제

## 2. 수정 파일

없음.

기존 `ProjectService.gs`, `EpicService.gs`, `UI.gs`, `Config.gs`는 변경하지 않았다.

## 3. 구현 기능

- Google Sheets 접근을 `SheetRepository`로 캡슐화
- 컬럼 위치가 아닌 헤더명을 기준으로 데이터 처리
- ID 컬럼을 첫 번째 헤더로 자동 판별하는 공통 CRUD
- 표준 Validation 오류 발생
- 표준 Core 오류 계층 및 직렬화
- Core API 성공·실패 응답 형식 통일
- `09_CHANGELOG` 헤더에 맞춘 공통 로그 기록
- 예외를 표준 실패 응답으로 변환하는 실행 래퍼
- 독립적인 Core 회귀 테스트 함수 제공

## 4. Apps Script 반영

- 반영 상태: 완료
- 대상: `한살림 물류자동화 PMS`에 연결된 Apps Script 프로젝트
- 추가 반영 파일:
  - `CoreError.gs`
  - `SheetRepository.gs`
  - `Validation.gs`
  - `CommonAPI.gs`
  - `CoreModuleTest.gs`
- 실행 함수: `runCoreModuleTests()`

## 5. 실행 테스트

| 확인 항목 | 결과 | 확인 내용 |
|---|---|---|
| Repository 정상 동작 | PASS | 임시 시트에서 insert/find/update/delete 실행 |
| Validation 정상 동작 | PASS | 정상값 통과 및 필수값 오류 확인 |
| CommonAPI 응답 형식 | PASS | 성공·실패 응답 구조 확인 |
| Error 객체 생성 | PASS | 표준 오류 상속 및 오류 코드 확인 |
| 기존 Project 영향 | PASS | 메뉴에서 프로젝트 생성 Dialog 실제 실행 |
| 기존 Epic 영향 | PASS | 메뉴에서 EPIC 목록 Dialog 실제 실행 |

Apps Script 실행 로그:

```text
[PASS] Error 객체 생성
[PASS] Validation 정상 동작
[PASS] Repository 정상 동작
[PASS] CommonAPI 응답 형식
실행 완료
```

## 6. 오류 수정

- 발견 오류: 없음
- 테스트 데이터가 운영 시트에 남지 않도록 `finally`에서 임시 시트를 삭제하도록 구성
- 기존 기능과의 이름 충돌을 피하기 위해 Core 모듈은 각 전역 객체 및 오류 클래스로 분리

## 7. 재테스트

- Core 모듈 전체 테스트: PASS
- PROJECT 메뉴 및 Dialog 회귀 테스트: PASS
- EPIC 메뉴 및 목록 Dialog 회귀 테스트: PASS
- 운영 시트 구조 유지: PASS

## 8. 공통모듈 후보

다음 Phase에서 추가할 후보:

- `IdGenerator.gs`: 엔티티별 ID 발급과 동시 실행 Lock
- `LogService.gs`: CHANGELOG 및 감사 로그 정책의 독립 서비스화
- `DialogManager.gs`: HtmlService Dialog 생성·표시 공통화
- `DateTimeService.gs`: 시간대와 표시 형식 통일
- `EntitySchema.gs`: 엔티티별 ID 컬럼·필수값·상태 정의

## 9. Release

- 릴리스명: `HLAS-PMS-Core-v0.1.0`
- 범위: Core 공통모듈 Phase 1
- 호환성: 기존 PROJECT/EPIC 기능 변경 없음
- 공식 저장 위치:
  - 소스: `F:\HLAS\AppsScript`
  - 문서: `F:\HLAS\Docs`
  - 테스트: `F:\HLAS\Test`
  - 배포본: `F:\HLAS\Release`

---

TASK-0005 완료

Architecture Review를 요청합니다.

PASS 판정이 나오면 다음 TASK 진행 여부를 알려주세요.
