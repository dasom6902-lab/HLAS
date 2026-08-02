# TASK-0026 Agreement Architecture

## 구조

```text
AgreementAPI
  → AgreementService
  → AgreementRepository
  → SheetRepository

AgreementService
  → AgreementCalculator
  → ReceivingRepository

AgreementRepository
  → AgreementValidator
  → AgreementExtension
  → AuditManager
  → DataTypeManager
  → IndexManager / CacheManager
```

## 데이터

- `27_AGREEMENT_MASTER`: 약정 표준 데이터
- `28_AGREEMENT_EXTENSION`: PMS 운영 및 Audit 데이터
- PK: `AgreementID`
- FK: `ProducerID`, `ProductID`
- 실적 연결: `ProducerID + ProductID + AgreementYear`

## 계산

- 이행률 = 순입고수량 ÷ 약정수량 × 100
- 잔여수량 = max(0, 약정수량 - 순입고수량)
- 잔여금액 = 약정금액 × 잔여수량 ÷ 약정수량
- Fund Base = 순입고금액 × 적용률

입고 실적은 정상 입고수량과 금액에서 반품수량과 반품금액을 차감한다.

## 호환성

TASK-0021~0025A 파일과 공개 API는 변경하지 않았다. Config와 Constants는 신규 Agreement 항목만 확장하였다.

