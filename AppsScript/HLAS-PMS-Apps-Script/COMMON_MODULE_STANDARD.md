# HLAS-PMS 공통 모듈 표준

## 적용 시점

구현을 잠시 보류한다.

TASK-0004에서 HLAS Core API 명세를 작성하고 사용자의 승인을 받은 후
공통 모듈을 구현하고 의무 적용한다.

## 목적

EPIC, FEATURE, FUNCTION, TASK 기능을 확장할 때 동일한 로직이 여러 파일에
중복되지 않도록 공통 기능을 독립 모듈로 분리한다.

## 공통 모듈

### IdGenerator.gs

- `PROJECT_ID` 생성
- `EPIC_ID` 생성
- `FEATURE_ID` 생성
- `FUNCTION_ID` 생성
- `TASK_ID` 생성
- 문서 잠금을 고려한 중복 방지
- 접두사와 자릿수를 설정으로 관리할 수 있는 구조

### Validation.gs

- 필수 입력값 검증
- 날짜 형식 검증
- 시작일과 종료예정일의 순서 검증
- 공통 문자열 정리
- 검증 실패 시 일관된 오류 메시지 반환

### LogService.gs

- `09_CHANGELOG` 기록
- 변경유형, 관련 ID, 작업자, 결과 기록
- 로그 ID 생성
- 각 업무 서비스에서 동일한 로그 작성 코드를 중복하지 않음

### DialogManager.gs

- HtmlService 대화상자 생성 및 표시
- 공통 너비와 높이 처리
- HTML 파일 존재 및 사용 조건 확인
- 업무별 UI 함수에서 대화상자 생성 코드를 중복하지 않음

## 서비스 구현 원칙

1. 업무 서비스는 업무 처리만 담당한다.
2. ID 생성은 `IdGenerator.gs`만 사용한다.
3. 입력 검증은 `Validation.gs`만 사용한다.
4. 변경 이력 기록은 `LogService.gs`만 사용한다.
5. HTML 대화상자 표시는 `DialogManager.gs`만 사용한다.
6. 공통 함수 이름에는 내부 함수 접미사 `_`를 적용할 수 있다.
7. UI, Service, 공통 모듈 간 의존 방향을 유지한다.

```text
UI
 ↓
DialogManager
 ↓
업무 Service
 ├─ Validation
 ├─ IdGenerator
 └─ LogService
```

## TASK-0004 적용 범위

1. EPIC 관리 기능 구현
2. HLAS Core API 명세 작성
3. API 명세 검토 및 사용자 승인
4. 승인된 명세를 기준으로 공통 모듈 구현
5. TASK-0003에서 작성한 프로젝트 관리 기능 리팩터링

API 명세 승인 전에는 아래 파일을 구현하지 않는다.

- `IdGenerator.gs`
- `Validation.gs`
- `LogService.gs`
- `DialogManager.gs`

승인 후 다음 항목을 분리한다.

- `ProjectService.gs`의 ID 생성과 날짜 검증
- `Code.gs`의 CHANGELOG 기록
- `UI.gs`의 HtmlService 대화상자 처리

## 향후 재사용 대상

- TASK-0005: EPIC 관리
- TASK-0006: FEATURE 관리
- TASK-0007: FUNCTION/TASK 관리
