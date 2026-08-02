# TASK-0004 — 실행 범위 및 순서

## 상태

범위 확정 / 구현 대기

## 목표

EPIC 관리 기능을 우선 구현하고 HLAS Core API 명세를 확정한 후,
승인된 명세를 기준으로 공통 모듈과 Project 리팩터링을 진행한다.

## 실행 순서

### 1단계 — EPIC 기능 구현

- EPIC 생성 메뉴
- HtmlService 입력 화면
- EPIC_ID 자동 생성
- `02_EPIC` 저장
- 필수값 검증
- CHANGELOG 기록

### 2단계 — HLAS Core API 명세 작성

- 공통 응답 형식
- 오류 응답 형식
- ID 생성 API
- 입력 검증 API
- 로그 기록 API
- Dialog 표시 API
- Project 및 향후 Feature/Function/Task 서비스 연결 규칙

### 3단계 — API 명세 승인

- 사용자 검토
- 수정사항 반영
- 승인 상태 기록

### 4단계 — 공통 모듈 구현

- `IdGenerator.gs`
- `Validation.gs`
- `LogService.gs`
- `DialogManager.gs`

### 5단계 — Project 기능 리팩터링

- 중복 ID 생성 로직 제거
- 중복 검증 로직 제거
- 중복 CHANGELOG 로직 제거
- 중복 HtmlService 호출 로직 제거
- 기존 Project 생성 동작 회귀 테스트

## 보류 원칙

HLAS Core API 명세 승인 전에는 공통 모듈을 구현하지 않는다.

