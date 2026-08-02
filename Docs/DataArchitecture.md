# HLAS Data Architecture Foundation

버전: v1.0  
관련 TASK: TASK-0022  
상태: Implemented

## 1. 목적

HLAS의 Master, Transaction, Analytics, Rule 데이터를 하나의 Registry와
Data Dictionary로 관리한다. TASK-0021의 Master Data 검증 기능은 변경하지
않으며, 이번 구조는 향후 기능이 참조할 수 있는 확장 계층으로만 동작한다.

## 2. Architecture Registry

| Table Type | Logical Tables |
|---|---|
| MASTER | PRODUCT_MASTER, PRODUCER_MASTER, AGREEMENT_MASTER, ROUTE_MASTER, COMMON_CODE |
| TRANSACTION | RECEIVING_HISTORY, RETURN_HISTORY, REGIONAL_ORDER_HISTORY, SHIPMENT_HISTORY, INVENTORY_HISTORY, FUND_HISTORY |
| ANALYTICS | AGE_STATISTICS, REGIONAL_STATISTICS |
| RULE | FUND_RULE |

## 3. Entity Registry

| Entity | Type | Logical Table |
|---|---|---|
| Product | MASTER | PRODUCT_MASTER |
| Producer | MASTER | PRODUCER_MASTER |
| Agreement | MASTER | AGREEMENT_MASTER |
| Receiving | TRANSACTION | RECEIVING_HISTORY |
| Return | TRANSACTION | RETURN_HISTORY |
| Order | TRANSACTION | REGIONAL_ORDER_HISTORY |
| Shipment | TRANSACTION | SHIPMENT_HISTORY |
| Inventory | TRANSACTION | INVENTORY_HISTORY |
| Route | MASTER | ROUTE_MASTER |
| FundRule | RULE | FUND_RULE |
| FundHistory | TRANSACTION | FUND_HISTORY |

## 4. 표준 핵심 키

| 업무명 | 표준 컬럼 | 자료형 | 설명 |
|---|---|---|---|
| 생산자번호 | 생산자번호 | String | ERP 기준 Producer Master PK |
| 품번 | 품번 | String | Item Master PK |
| 공급코스 | 공급코스 | String | Route Master PK |
| 주문일 | 주문일 | Date | 주문 Transaction 기준일 |
| 입고일 | 입고일 | Date | 입고 Transaction 기준일 |

## 5. 주요 관계

- Producer → Agreement: `Agreement.생산자번호`
- Producer → Product: `Product.생산자번호`(선택)
- Agreement → Receiving: `Receiving.약정번호`
- Product → Receiving: `Receiving.품번`
- Product → Order: `Order.품번`
- Route → Order: `Order.공급코스`
- Order → Shipment: `Shipment.주문번호`
- Product → Inventory: `Inventory.품번`
- FundRule → FundHistory: `FundHistory.기금규칙번호`

## 6. Validation 원칙

- 모든 Entity는 `EntityRegistry`에 등록되어야 한다.
- 모든 Entity는 `DataDictionary`에 정확히 하나의 PK를 가져야 한다.
- 모든 FK는 등록된 부모 Entity와 부모 컬럼을 참조해야 한다.
- 모든 Entity의 논리 테이블은 `ArchitectureRegistry`와 `PMS_CONFIG`에
  등록되어야 한다.
- 실제 Transaction 데이터를 검증할 때에는
  `RelationshipManager.validateForeignKeys()`에 조회 함수를 주입한다.

## 7. 확장 원칙

1. 새 Entity는 `HLAS_CONSTANTS.ENTITY_TYPE`에 먼저 등록한다.
2. 논리 테이블을 `PMS_CONFIG`의 해당 Table Type에 등록한다.
3. `EntityRegistry`에 Entity와 논리 테이블의 연결을 추가한다.
4. `DataDictionary`에 PK, FK, Type, Required, Description을 정의한다.
5. `ArchitectureValidator`와 자동 테스트를 통과한 후 사용한다.

## 8. TASK-0021 호환성

- `MasterDataRepository.gs`, `MasterDataService.gs`, `MasterDataAPI.gs`,
  `Tests_MasterDataTest.gs`는 수정하지 않았다.
- `PMS_CONFIG.masterData`, `HLAS_CONSTANTS.MASTER_DATA`,
  `HLAS_CONSTANTS.FIELD.MASTER_DATA`의 기존 정의와 동작을 유지한다.
- 이번 Registry는 기존 Master Data 검증을 호출하거나 변경하지 않는다.
