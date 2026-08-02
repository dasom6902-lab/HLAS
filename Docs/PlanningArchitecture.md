# HLAS Planning Module Foundation

버전: v1.0  
관련 TASK: TASK-0023  
상태: Implemented

## 1. 목적

공급 목표와 매장 목표를 연간·월간 단위의 표준 구조로 관리한다.
연도는 행의 `YEAR` 값으로 관리하므로 새 연도 추가 시 시트나 코드를
추가하지 않는다.

## 2. Architecture

```text
TargetRepository
    ↓
TargetService
    ↓
TargetAPI
```

- Repository: SheetRepository를 통한 저장·조회·수정
- Service: 달성률, 차이, 진행률, 월별 달성 계산
- API: CommonAPI 표준 응답 제공
- Validator: 연도·월·구분 중복, 필수값, 음수 금액 검증

## 3. Planning Entity

| Entity | Table | Unique Key |
|---|---|---|
| AnnualTarget | 17_ANNUAL_TARGET | YEAR + CATEGORY |
| MonthlyTarget | 18_MONTHLY_TARGET | YEAR + MONTH + CATEGORY |
| SupplyTarget | 19_SUPPLY_TARGET | YEAR + MONTH + ROUTE_CODE |
| StoreTarget | 20_STORE_TARGET | YEAR + MONTH + STORE_CODE |
| TargetHistory | 21_TARGET_HISTORY | HISTORY_ID |

## 4. Data Model

### AnnualTarget

- TARGET_ID
- YEAR
- CATEGORY
- TARGET_AMOUNT
- STATUS
- CREATED_AT
- UPDATED_AT

### MonthlyTarget

- TARGET_ID
- YEAR
- MONTH
- CATEGORY
- TARGET_AMOUNT
- STATUS
- CREATED_AT
- UPDATED_AT

### SupplyTarget

- TARGET_ID
- YEAR
- MONTH
- ROUTE_CODE
- TARGET_AMOUNT
- STATUS
- CREATED_AT
- UPDATED_AT

### StoreTarget

- TARGET_ID
- YEAR
- MONTH
- STORE_CODE
- TARGET_AMOUNT
- STATUS
- CREATED_AT
- UPDATED_AT

## 5. Validation

- 연간 목표: 동일 `YEAR + CATEGORY` 중복 금지
- 월간 목표: 동일 `YEAR + MONTH + CATEGORY` 중복 금지
- 공급 목표: `ROUTE_CODE` 필수
- 매장 목표: `STORE_CODE` 필수
- 월: 1~12 범위의 정수
- 목표 금액: 0 이상의 숫자
- 상태: DRAFT, ACTIVE, CLOSED

## 6. 계산 규칙

- 달성률 = 실적 ÷ 목표 × 100
- 차이 = 실적 - 목표
- 목표가 0이고 실적도 0이면 달성률 0%
- 목표가 0이고 실적이 있으면 달성률 100%
- 계산 결과는 소수점 둘째 자리까지 유지

## 7. 연도 확장

2027년 이후 목표는 기존 시트에 새 행으로 등록한다. `YEAR` 값만 추가하면
Repository, Service, API를 그대로 사용할 수 있다.

## 8. 기존 TASK 호환성

- TASK-0021의 MasterData 파일은 수정하지 않았다.
- TASK-0022의 Architecture Registry 파일은 수정하지 않았다.
- Config와 Constants에는 Planning 전용 항목만 추가했다.
- 기존 API와 결과값은 변경하지 않았다.
