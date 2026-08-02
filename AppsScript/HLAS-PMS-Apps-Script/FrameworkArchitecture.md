# HLAS Core Framework Architecture — TASK-0025A

## 목적

기존 API와 TASK-0021~0025의 동작을 유지하면서 Import, Audit, 문자열 키, Cache/Index 기반을 확장한다.

## 계층 구조

```text
ImportAPI
  → ImportValidator
  → ImportMapper
  → ImportRepository
  → SheetRepository

Entity Service / Repository
  → AuditManager
  → DataTypeManager

Search / Import
  → IndexManager
  → CacheManager
```

기존 `ImportService.gs`와 `AuditService.gs`의 공개 함수는 호환성 보호를 위해 변경하지 않았다. 신규 Framework API는 `previewFrameworkImport`, `executeFrameworkImport`, `rollbackFrameworkImport`로 분리하였다.

## Import Framework

- 입력: CSV 문자열, Google Sheet의 2차원 값 또는 Object 배열
- XLSX: Apps Script에서 변환된 Object 배열을 입력받는 방식으로 지원
- 흐름: Parse → Mapping → Type normalization → Validation → Preview → Execute
- 실행 전 대상 시트 스냅샷을 Cache에 저장하여 Rollback 가능
- 지원 Entity: Producer, Product, Receiving, Agreement, Planning

## Audit Framework

표준 필드:

`CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, `SchemaVersion`, `IsActive`, `DeletedAt`, `DeletedBy`, `DeleteReason`

`AuditManager`는 신규 생성, 수정, Soft Delete, Restore 및 감사정보 조회를 제공한다. 기존 운영 이벤트 기록용 `AuditService`는 그대로 유지한다.

## String Key Standard

`DataTypeManager`는 ProductID, ERPProductID, Barcode, LotNo, ReceivingID, AgreementID, ProducerID를 문자열로 정규화한다. ProductID는 설정된 길이까지 선행 0을 보존한다.

## Cache / Index Framework

- 지원 Index: Producer, Product, Receiving, Agreement
- Cache TTL은 `HLAS_CONFIG.CACHE`에서 관리
- Apps Script Cache의 값 크기 제한을 고려하여 대형 Index를 여러 Segment로 분할 저장
- `createIndex`, `refreshIndex`, `findByKey`, `clearCache`, `warmup` 제공

## 호환성

- 기존 공개 API 이름과 반환값 변경 없음
- 기존 Repository 수정 없음
- 신규 파일과 Config/Constants 확장만 사용
- 기존 테스트 체인을 `runReceivingTests()`까지 실행하여 TASK-0021~0025 회귀 검증

