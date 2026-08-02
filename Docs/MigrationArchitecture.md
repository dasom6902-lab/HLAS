# TASK-0027 Data Migration Architecture

## 목적

2022년 이후 Excel·Google Sheet 운영 데이터를 기존 데이터를 훼손하지 않고 PMS 표준 Entity로 이관한다.

## 계층 구조

```text
MigrationAPI
    ↓
MigrationService
    ├─ MigrationValidator
    ├─ MigrationMapper
    ├─ MigrationProfile
    ↓
MigrationRepository
    ↓
ImportRepository
    ↓
SheetRepository
```

Migration Engine은 기존 Import Framework를 확장해 사용하며 Spreadsheet에 직접 접근하지 않는다.

## 표준 절차

```text
Source
  ↓
Preview
  ↓
Column Mapping
  ↓
DataTypeManager 정규화
  ↓
Validation / Duplicate Detection
  ↓
Execute
  ↓
Migration Log
  ↓
Rollback Snapshot
```

## 지원 Entity

| Entity | 표준 Key | 대상 |
|---|---|---|
| Producer | ProducerID | 22_PRODUCER_MASTER |
| Product | ProductID | 26_PRODUCT_IMPORT_STAGING |
| Receiving | ReceivingID | 24_RECEIVING_TRANSACTION |
| Agreement | AgreementID | 27_AGREEMENT_MASTER |
| Planning | TARGET_ID | 17_ANNUAL_TARGET |

## 안전성

- Execute 전에 Preview와 Validation을 강제한다.
- Source 내부 중복 Key를 차단한다.
- String Key는 `DataTypeManager`로 정규화한다.
- Execute 직전 Import Framework Snapshot을 생성한다.
- Rollback은 Snapshot이 존재하는 경우에만 허용한다.
- 실행 성공·실패와 Rollback을 Audit에 기록한다.
- 운영 데이터 삭제는 수행하지 않는다.

## 확장 기준

신규 Entity는 `MigrationProfile`에 Profile을 추가하고 Config/Constants에 등록한다. API 인터페이스는 유지한다.

## 2026 공급현황 보완 Source

`SupplyHistory2026`은 `RECEIVING` Entity의 Secondary/Supplement Source다.
`ORDER_SUPPLY_SUMMARY` 운용본을 1회 조회하고 메모리에서 중복을 분류한다.
운용본과 일치하는 행은 제외하고 신규 행만 Repository로 전달한다.
실행 결과에 Update가 발생하면 즉시 Rollback하여 기존 운영 데이터 덮어쓰기를 차단한다.
