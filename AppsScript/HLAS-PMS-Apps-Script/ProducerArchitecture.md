# Producer Master Architecture

## 1. 목적

ERP 생산자 정보를 HLAS의 표준 Producer Master로 관리하고, 향후 입고·약정·기금·상품·분석·목표관리 모듈이 동일한 생산자 키를 참조하도록 한다.

## 2. 계층 구조

```text
ProducerAPI
    ↓
ProducerService
    ↓
ProducerValidator
    ↓
ProducerRepository
    ↓
SheetRepository
```

`ProducerRepository`는 Master와 Extension 시트의 데이터를 결합한다. Service와 API는 `SpreadsheetApp`을 직접 사용하지 않는다.

## 3. 저장 구조

### 22_PRODUCER_MASTER

ERP 기준 필드를 저장한다.

- ProducerID
- ProducerName
- Region
- Community
- CommunityID
- BusinessType
- ProducerType
- TradeStatus
- MembershipStatus
- JoinDate
- Phone
- Address
- Bank
- Account
- ParcelCount
- ParcelArea
- MainProduct
- LastReceivingDate

### 23_PRODUCER_EXTENSION

PMS 전용 확장 필드를 저장한다.

- ProducerID
- ProducerAssociationMember
- AgreementParticipation
- FundEligible
- SupportGrade
- InternalMemo
- CreatedAt
- UpdatedAt
- IsActive
- DeletedAt

## 4. 핵심 정책

- `ProducerID`는 ERP 생산자번호이며 Producer Master의 PK이다.
- 중복 ProducerID는 저장할 수 없다.
- 삭제는 물리 삭제 대신 `IsActive=false`, `DeletedAt` 기록 방식의 Soft Delete를 사용한다.
- 조회 시 Master와 Extension을 ProducerID 기준으로 결합한다.
- 거래상태, 조합원 여부, 지원등급은 `HLAS_CONSTANTS`의 표준값으로 검증한다.
- 입고 실적 통계는 생산자번호를 기준으로 건수·수량·금액·최종 입고일을 계산한다.

## 5. 확장 기준

Receiving, Agreement, FundRule, FundHistory, Product, Analytics, Planning은 ProducerID를 FK로 사용한다. ERP 원본 필드와 PMS 전용 필드를 분리하여 ERP 동기화 시 내부 운영 정보를 보호한다.
