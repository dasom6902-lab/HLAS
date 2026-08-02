# TASK-0021 구현 보고서

## Master Data 구조

- 대상 운영본: `주문공급집계표 운용본`
- 대상 시트: `기초`
- 헤더 행: 2행
- 데이터 시작 행: 3행
- 현행 컬럼:
  - 물품코드
  - 물품명
  - 금액
  - 저장상태
  - 저장상태+집품순서
  - 물류지
  - 집품순서
- 실데이터: 1,978건
- 기준 식별자: 물품코드(문자열)
- 접근 방식: `MasterDataRepository`에서 한 번 읽고 메모리에서 검증

생산자·코스·공급구분·사용여부는 현행 기초시트의 독립 컬럼이 아니다. 기존 수식과 결과를 보호하기 위해 물리 컬럼을 추가하지 않고 확장 논리 필드로 정의했다.

## 개선 사항

### 추가 파일

- `MasterDataRepository.gs`
  - 외부 물류 운영본 접근 전담
  - 기초시트·주문내역 1회 조회
  - 헤더 기반 객체 변환
  - 실행 단위 Spreadsheet 캐시
- `MasterDataService.gs`
  - 구조 조회
  - 필수값·중복·코드·참조 검증
  - 업무 의존성 조회
  - 통합 Review
- `MasterDataAPI.gs`
  - `reviewMasterData()`
  - `getMasterDataStructure()`
  - `validateMasterData()`
  - `getMasterDataDependencies()`
- `Tests_MasterDataTest.gs`
  - 읽기 전용 통합·회귀 테스트
- `MasterData.md`
  - 컬럼 정의
  - 참조 관계
  - Validation 규칙
  - 확장 기준

### 수정 파일

- `Constants.gs`
  - `HLAS_CONSTANTS.MASTER_DATA`
  - `HLAS_CONSTANTS.FIELD.MASTER_DATA`
- `Config.gs`
  - 운영본 ID와 기초·주문내역 읽기 범위
  - Script Property `HLAS_MASTER_SPREADSHEET_ID` 확장 지원

### 구조 원칙

- 기존 API와 HTML은 변경하지 않았다.
- 운영 시트 데이터와 수식은 변경하지 않았다.
- Service/API에서 `SpreadsheetApp`을 직접 사용하지 않는다.
- 외부 Spreadsheet 접근은 `MasterDataRepository`에 한정했다.
- 공개 함수에 JSDoc을 작성했다.
- API 반환은 CommonAPI 표준을 따른다.

## Validation 결과

실제 Google Sheets를 읽기 전용으로 검증했다.

| 항목 | 결과 |
|---|---:|
| Master Data 건수 | 1,978 |
| 필수값 누락 | 0 |
| 중복 물품코드 | 0 |
| 중복 저장상태+집품순서 | 0 |
| 저장상태 허용값 오류 | 0 |
| 집품순서 오류 | 0 |
| 주문내역 건수 | 493 |
| 주문내역 고유 물품 | 83 |
| 기초에 없는 주문 물품코드 | 0 |
| 물품명 불일치 | 0 |
| 저장상태 불일치 | 0 |
| 현재 주문 미참조 Master 물품 | 1,895 |

현재 주문 미참조 건수는 일일 주문자료 기준의 정보이며 사용중단 또는 삭제 대상으로 판정하지 않는다.

## Apps Script 반영

- 프로젝트: `한살림 물류자동화 PMS`
- Constants/Config 갱신: 완료
- 신규 스크립트 파일 생성: 완료
- 임시 `제목 없음.gs` 제거: 완료
- 구문 오류 확인: 없음
- `runMasterDataTests()` 실제 실행: 완료
- 실행 로그: 시작 / 완료

## Documentation

- `MasterData.md`
- `TASK-0021_IMPLEMENTATION_REPORT.md`
- `TASK-0021_TEST_RESULTS.md`
- `TASK-0021_APPS_SCRIPT_GUIDE.md`

## Release

- Release: `HLAS-PMS-MasterData-v1.0.0-RC1`
- 변경 유형: 운영 안정성 및 데이터 표준화
- API 변경: 없음
- UI 변경: 없음
- 운영 데이터 변경: 없음

