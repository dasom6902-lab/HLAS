# HLAS v1.0 Architecture Refactoring Report

- 작업일: 2026-07-29
- 기준 버전: `v1.0.0-RC1`
- 목표: Core / Service / Repository / API / UI 5계층 통일

## 변경 결과

### Core

- `HLAS_CONSTANTS.FIELD.<ENTITY>` 단일 필드 상수 체계 적용
- `CommonAPI.success()`, `CommonAPI.error()`, `CommonAPI.execute()` 표준화
- `ValidationError`, `CoreError`, `DuplicateError`, `NotFoundError` 사용 통일
- `generateId()` 단일 ID 생성 경로 적용
- `CommonAPI.writeLog()` 단일 CHANGELOG 기록 경로 적용

### Repository

- Spreadsheet 데이터 접근을 `SheetRepository`로 제한
- 헤더 기반 Object insert/update 유지
- 초기 시트 구조 생성도 Repository에 위임
- Backup 복원을 위한 헤더 기반 `replaceAll()` 일괄 연산 추가
- Domain Service의 `SpreadsheetApp`, `getRange`, `appendRow`, `deleteRow` 직접 사용 제거

### Service

- `ProjectService.gs`
- `EpicService.gs`
- `FeatureService.gs`
- `FunctionService.gs`
- `TaskService.gs`

각 서비스는 CommonAPI 실행 경계 안에서 Validation, Repository, Audit,
CHANGELOG를 조합한다.

### API

- `ProjectAPI.gs`
- `EpicAPI.gs`
- `FeatureAPI.gs`
- `FunctionAPI.gs`
- `TaskAPI.gs`

기존 HTML이 호출하는 공개 함수명과 반환 호환성을 유지하고 내부 업무 처리는
Service에 위임한다.

### UI

- HTML 파일은 수정하지 않았다.
- Dialog 공개 함수명은 유지했다.
- UI의 시트 존재 확인과 시트 활성화는 Repository를 사용한다.
- `SpreadsheetApp.getUi()`는 UI 표시 목적으로만 유지한다.

## 제거한 구형 구조

- `PROJECT_FIELD`
- `EPIC_FIELD`
- `FUNCTION_FIELD`
- `TASK_FIELD`
- 기타 `*_FIELD`
- `generateNextProjectId_`
- `generateNextEpicId_`
- `appendChangeLog_`
- `CommonAPI.fail()`
- 운영 코드의 일반 `throw new Error()`

## 성능 개선

- Search와 Analytics의 1회 조회 후 메모리 처리 유지
- Backup 복원은 행별 삭제 방식 대신 Repository 일괄 교체 사용
- 불필요한 Spreadsheet flush 및 반복 Range 접근 제거
- Sheet header를 기준으로 Object와 행 데이터를 변환

## 호환성

- HTML 변경 없음
- 기존 외부 함수명 유지
- 기존 CRUD 결과와 Dialog 동작 유지
- 전체 Apps Script 회귀 테스트 PASS
