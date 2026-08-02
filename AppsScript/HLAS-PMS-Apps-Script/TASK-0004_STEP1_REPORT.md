# TASK-0004 1단계 — EPIC 기능 구현 보고

## 1. 추가 파일

### EpicService.gs

- 생성 목적: EPIC 업무 로직을 UI와 분리하여 관리하기 위해 생성
- 주요 기능:
  - 프로젝트 선택 목록 조회
  - EPIC 입력값 검증
  - 임시 EPIC_ID 자동 생성
  - `02_EPIC` 시트 저장
  - EPIC 목록 조회
  - PROJECT_ID 존재 여부 확인
  - CHANGELOG 기록 호출

### Dialog_Epic.html

- 생성 목적: 사용자가 시트를 직접 수정하지 않고 EPIC을 등록할 수 있도록 생성
- 주요 기능:
  - 프로젝트 선택
  - EPIC명, 설명, 우선순위, 담당자 입력
  - 시작일 및 종료예정일 입력
  - 필수 입력값 확인
  - 서버 저장 함수 호출
  - 성공 및 오류 메시지 표시

### Dialog_EpicList.html

- 생성 목적: 등록된 EPIC을 메뉴에서 조회할 수 있도록 생성
- 주요 기능:
  - EPIC 목록 조회
  - 프로젝트명과 PROJECT_ID 함께 표시
  - 상태, 우선순위, 담당자, 일정 표시
  - 목록 새로고침

### TASK-0004_STEP1_REPORT.md

- 생성 목적: TASK-0004 1단계의 구현 범위와 검증 결과를 기록하기 위해 생성
- 주요 기능:
  - 변경 파일 기록
  - 구현 기능 기록
  - 테스트 결과 기록
  - 향후 공통 모듈 분리 후보 기록

## 2. 수정 파일

### UI.gs

- 수정 이유: HLAS-PMS 메뉴에서 EPIC 생성 및 목록 조회 기능을 실행하기 위해 수정
- 변경 내용:
  - `EPIC 관리` 하위 메뉴 추가
  - `EPIC 생성` 메뉴 연결
  - `EPIC 목록 조회` 메뉴 연결
  - EPIC 생성 Dialog 표시 함수 추가
  - EPIC 목록 Dialog 표시 함수 추가
  - 도움말에 EPIC 기능 안내 추가

### Config.gs

- 수정 이유: TASK-0004 1단계 반영 버전을 표시하기 위해 수정
- 변경 내용:
  - PMS 버전을 `0.4.0`으로 변경

### README.md

- 수정 이유: 신규 Apps Script 및 HTML 파일의 설치 방법을 안내하기 위해 수정
- 변경 내용:
  - `EpicService.gs` 추가 안내
  - `Dialog_Epic.html` 추가 안내
  - `Dialog_EpicList.html` 추가 안내
  - Apps Script 편집기 파일 생성 절차 갱신

## 3. 구현 기능

- `HLAS-PMS > EPIC 관리 > EPIC 생성` 메뉴
- `HLAS-PMS > EPIC 관리 > EPIC 목록 조회` 메뉴
- 프로젝트 선택 목록 조회
- PROJECT_ID와 EPIC 연결
- PROJECT_ID 존재 여부 재검증
- EPIC명 필수 검증
- 임시 EPIC_ID 자동 생성
- 문서 잠금을 이용한 ID 중복 방지
- 시작일 및 종료예정일 형식 검증
- 종료예정일이 시작일보다 빠른 경우 저장 차단
- `02_EPIC` 시트 저장
- 상태 기본값 `진행중`
- 생성일시와 수정일시 자동 입력
- `09_CHANGELOG` 자동 기록
- 프로젝트명이 포함된 EPIC 목록 표시

## 4. 테스트 결과

### 정적 검토

- 메뉴와 실행 함수 연결: 통과
- `02_EPIC` 헤더 순서와 저장 배열 순서: 통과
- PROJECT_ID 연계 및 존재 여부 확인: 통과
- EPIC_ID 정규식 및 순차 증가 로직: 통과
- 문서 잠금 적용 위치: 통과
- 시작일과 종료예정일 검증: 통과
- HTML 클라이언트와 서버 함수 연결: 통과
- CHANGELOG 호출 인수: 통과

### 실행 테스트

- Google Apps Script 사용자 환경 실행: 대기
- 스프레드시트 메뉴 표시 확인: 대기
- EPIC 생성 및 저장 확인: 대기
- EPIC 목록 조회 확인: 대기
- CHANGELOG 생성 확인: 대기

## 5. 공통모듈 후보

### IdGenerator.gs

- `generateNextEpicId_()`
- `generateNextProjectId_()`
- 문서 잠금과 ID 발급의 결합 방식
- ID 접두사 및 자릿수 관리

### Validation.gs

- EPIC 필수값 검증
- PROJECT_ID 존재 여부 검증
- 날짜 형식 검증
- 시작일과 종료예정일 순서 검증
- Project 기능의 필수값 및 날짜 검증

### LogService.gs

- `appendChangeLog_()`
- 변경유형, 관련 ID, 작업자, 결과 기록
- 로그 ID 생성 방식

### DialogManager.gs

- `showEpicCreateDialog()`
- `showEpicListDialog()`
- `showProjectCreateDialog()`
- 시트 존재 여부 확인
- HTML 파일 생성과 Dialog 크기 지정
- 모달 Dialog 표시

## 6. 다음 단계에 미치는 영향

- HLAS Core API 명세에서 Project와 EPIC의 공통 처리 방식을 함께 정의해야 한다.
- ID 생성 API는 PROJECT_ID와 EPIC_ID를 모두 지원해야 한다.
- Validation API는 필수값, 참조 ID, 날짜 및 기간 검증을 지원해야 한다.
- Log API는 변경유형과 관련 객체 ID를 표준 인수로 받아야 한다.
- Dialog API는 생성 화면뿐 아니라 목록 조회 화면도 지원해야 한다.
- API 승인 후 `ProjectService.gs`와 `EpicService.gs`의 중복 로직을 공통 모듈로 이동해야 한다.
- TASK-0005 이후 FEATURE 구현은 Project → EPIC → FEATURE 참조 관계를 유지해야 한다.
- 실제 Apps Script 실행 테스트가 완료된 후 TASK-0004 1단계를 최종 완료 처리해야 한다.
