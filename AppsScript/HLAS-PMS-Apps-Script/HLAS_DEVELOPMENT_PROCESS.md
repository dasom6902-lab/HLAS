# HLAS 프로젝트 개발 프로세스

## 1. 역할

### ChatGPT — Technical Lead

- 시스템 설계
- TASK 설계
- 아키텍처 설계
- 개발 기준 수립
- 코드 리뷰
- PMS 구조 리뷰
- QA
- PASS / REVISE 판정
- 다음 TASK 승인

### Work — Developer

- 기능 구현
- Apps Script 반영
- 스프레드시트 반영
- 실행 테스트
- 오류 수정
- 재테스트
- 구현 보고

## 2. 개발 절차

```text
ChatGPT
  ↓
TASK 설계
  ↓
Work 구현
  ↓
Apps Script 반영
  ↓
실행 테스트
  ↓
오류 수정
  ↓
재테스트
  ↓
구현 보고
  ↓
ChatGPT Architecture Review
  ↓
PASS
  ↓
다음 TASK 승인
```

## 3. Work 구현 완료 보고 형식

### ① 추가 파일

- 파일명
- 생성 목적
- 주요 기능

### ② 수정 파일

- 파일명
- 수정 이유
- 변경 내용

### ③ 구현 기능

- 구현한 기능 목록

### ④ Apps Script 반영

- 반영 완료 여부
- 변경 사항
- 교체할 파일
- 새로 추가할 스크립트 및 HTML 파일
- 저장 및 실행 순서

### ⑤ 실행 테스트

정적 검토가 아니라 실제 Apps Script 환경에서 실행한다.

예시:

- 메뉴 생성
- PROJECT 생성
- EPIC 생성
- 조회
- 수정
- CHANGELOG
- 오류 처리

각 항목의 결과를 `PASS` 또는 `FAIL`로 기록한다.

### ⑥ 오류 수정

- 발견된 오류
- 원인
- 수정 내용

### ⑦ 재테스트

- 수정 항목별 재실행 결과
- 최종 PASS 여부

### ⑧ 공통모듈 후보

- 중복 코드
- 리팩터링 대상
- 향후 공통 API 후보

### ⑨ Release

- Version
- 변경 이력
- 공식 배포 파일

## 4. 완료 판정 원칙

정적 코드 검토만으로 완료를 보고하지 않는다.

다음 항목을 모두 수행한 후 구현 완료 보고를 작성한다.

- Apps Script 반영
- 스프레드시트 반영
- 실제 실행
- 오류 수정
- 재테스트

Work가 사용자의 Google 환경에 직접 반영하거나 실행할 수 없는 경우에는
해당 항목을 완료로 표시하지 않고 `사용자 실행 대기`로 명시한다.

## 5. Architecture Review

최종 승인 권한은 ChatGPT Technical Lead가 가진다.

- `PASS`: 다음 TASK 진행 가능
- `REVISE`: 수정 후 다시 테스트하고 Architecture Review 재요청

## 6. 다음 TASK 진행 제한

Work는 ChatGPT의 `PASS` 판정과 다음 TASK 승인 없이 임의로 다음 TASK를 진행하지 않는다.

모든 구현 보고 마지막에는 다음 문구를 포함한다.

```text
TASK-XXXX 완료

Architecture Review를 요청합니다.

PASS 판정이 나오면 다음 TASK 진행 여부를 알려주세요.
```

## 7. 개발 목표

HLAS 물류자동화 PMS의 다음 품질을 최우선으로 한다.

- 유지보수성
- 확장성
- 공통모듈화
- 코드 품질
- 추적 가능성
- 실제 운영 안정성

## 8. 코드 및 테스트 표준

이 기준은 TASK-0006부터 모든 신규 TASK에 적용한다.

### 8.1 Constants.gs

다음 값은 기능 코드에 직접 작성하지 않고 `Constants.gs`에서 중앙 관리한다.

- 시트명
- 상태값
- 로그 타입
- 기타 여러 기능에서 사용하는 공통 문자열

상수명은 `UPPER_SNAKE_CASE`를 사용하고, 엔티티 또는 용도별 객체로 묶어 관리한다.

### 8.2 JSDoc

모든 공개 함수(public function)는 JSDoc을 작성한다.

JSDoc에는 다음 내용을 포함한다.

- 기능 설명
- 매개변수(`@param`)
- 반환값(`@return` 또는 `@returns`)

매개변수나 반환값이 없는 경우에도 해당 사실을 명확히 표기한다.

### 8.3 테스트 구조

현재 `CoreModuleTest.gs`는 유지한다.

테스트가 증가하여 파일 분리가 필요해지면 다음 구조를 적용한다.

```text
Tests/
 ├── RepositoryTest.gs
 ├── ValidationTest.gs
 └── ApiTest.gs
```

Apps Script 편집기에서는 폴더를 직접 지원하지 않으므로 파일명을
`Tests_RepositoryTest.gs`, `Tests_ValidationTest.gs`, `Tests_ApiTest.gs`처럼
표시할 수 있다. 공식 저장소에서는 `Tests` 폴더 구조를 사용할 수 있다.

## 9. Architecture Review 판정 기록

- TASK-0005: `PASS`
- 재작업: 없음
- 상기 코드 및 테스트 표준은 TASK-0006부터 적용
