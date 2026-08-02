# SupplyHistory2026 Migration Source

## 목적

`26년 공급현황.zip`을 2026년 공급 이력 보완용 공식 Migration Source로 등록한다.
이 Source는 `주문공급집계표 운용본`에 없는 데이터만 추가하며 기존 데이터는 수정하거나 삭제하지 않는다.

## Source Profile

| 항목 | 값 |
|---|---|
| Name | `SupplyHistory2026` |
| Entity | `RECEIVING` |
| Source Type | `EXCEL` |
| Import Format | `XLSX` |
| Role | `SUPPLEMENT_SOURCE` |
| Priority | `SECONDARY` |
| Primary Source | `ORDER_SUPPLY_SUMMARY` |

## 원본 분석

- 파일 수: 121개 XLSX
- 데이터 기간: 2026-01-02 ~ 2026-06-30
- 전체 행: 65,228행
- 공통 Sheet: `Sheet 1`
- 공급일련번호·조합원번호·물품코드 누락: 0건
- 원본 내부 `공급일련번호 + 물품코드` 중복 후보: 429행
- 날짜·조합원·물품·수량·금액 완전 중복 후보: 21행

## 중복 판정

1. 운용본의 `ReceivingID` 및 대체 Key를 먼저 조회한다.
2. 공급일련번호는 여러 물품에서 반복될 수 있으므로 `공급일련번호 + 물품코드`를 기본 Key로 사용한다.
3. 충돌 시 결과수량과 결과금액을 추가 비교한다.
4. 대체 Key는 `공급일 + 조합원번호 + 물품코드 + 결과수량 + 결과금액`이다.
5. 운용본과 일치하는 행은 제외하고 신규 보완 행만 Import한다.
6. 보완 실행 결과에 Update가 발생하면 전체 실행을 Rollback한다.

## 파일명 날짜 보정

| 원본 파일명 | 적용 날짜 코드 |
|---|---|
| 020106.xlsx | 260106 |
| 020108.xlsx | 260108 |
| 030114.xlsx | 260114 |
| 2604036.xlsx | 260406 |
| 2606010.xlsx | 260610 |

Preview는 `operatingRows`, `supplementRows`, `duplicateRows`, `finalImportRows`를 반환한다.
Migration Log는 `SupplementSource`, `AppliedRows`, `SkippedRows`, `DuplicateRows`를 기록한다.
