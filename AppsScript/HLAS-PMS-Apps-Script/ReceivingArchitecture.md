# Receiving Transaction Architecture

## 1. 목적

2022년 이후 입고·반품 데이터를 HLAS 표준 Transaction으로 관리하고 Producer, Product, Agreement, Fund, Analytics가 동일한 입고 원장을 참조할 수 있도록 한다.

## 2. 계층 구조

```text
ReceivingAPI
    ↓
ReceivingService
    ↓
ReceivingValidator
    ↓
ReceivingRepository
    ├─ SheetRepository
    ├─ ProducerRepository
    └─ MasterDataRepository
```

Service와 API는 Spreadsheet에 직접 접근하지 않는다. PMS Transaction은 `SheetRepository`, 운영 Product 참조는 `MasterDataRepository`를 사용한다.

## 3. 저장 구조

### 24_RECEIVING_TRANSACTION

입고·반품의 표준 원장 필드를 저장한다.

- ReceivingID
- ReceivingDate
- ProducerID
- ProductID
- ProductName
- CenterCode
- CenterName
- Quantity
- Unit
- UnitPrice
- Amount
- ReceivingType
- ReturnQuantity
- ReturnAmount
- Status
- Remark

### 25_RECEIVING_EXTENSION

PMS 운영 전용 필드를 저장한다.

- ReceivingID
- SettlementStatus
- FundApplicable
- AgreementApplicable
- InspectionStatus
- Memo
- CreatedAt / CreatedBy
- UpdatedAt / UpdatedBy
- SchemaVersion
- IsActive
- DeletedAt

## 4. 참조 및 변경 정책

- `ProducerID`는 `22_PRODUCER_MASTER`의 ProducerID와 연결한다.
- `ProductID`는 TASK-0021 운영 Product Master의 물품코드와 연결한다.
- ProducerID와 ProductID는 등록 후 변경할 수 없는 Immutable FK이다.
- 삭제는 `Status=DELETED`, `IsActive=false`, `DeletedAt`을 기록하는 Soft Delete 방식이다.
- 숫자형으로 인식되는 품번의 앞자리 0은 Product Master의 표준값으로 복원한다.

## 5. 금액 및 통계

- 입고금액 = Quantity × UnitPrice
- 반품금액 = ReturnQuantity × UnitPrice
- 순공급수량 = 입고수량 − 반품수량
- 순공급금액 = 입고금액 − 반품금액
- 생산자별·품목별 통계는 동일한 원장 데이터에서 계산한다.

## 6. 실제 데이터 연동 준비

2022년 이후 원본 자료를 다음 표준 필드로 매핑하면 저장할 수 있다.

| 원본 논리값 | 표준 필드 |
|---|---|
| 입고번호 | ReceivingID |
| 입고일 | ReceivingDate |
| 생산자번호 | ProducerID |
| 품번 | ProductID |
| 수량 | Quantity |
| 단가 | UnitPrice |
| 반품수량 | ReturnQuantity |
| 센터 | CenterCode |

대량 이관 전에는 Producer/Product FK 사전 점검, 중복 ReceivingID 검사, 날짜·수량·단가 검증을 수행해야 한다. 실제 원본 파일의 컬럼 매핑과 일괄 Import 실행은 후속 이관 TASK 범위이다.
