# TASK-0014A Apps Script 반영 및 운영 안내

## 반영된 파일

### 신규

1. `NotificationChannel.gs`
2. `NotificationRuleService.gs`
3. `Tests_SchedulerStabilityTest.gs`

### 교체

1. `Constants.gs`
2. `Config.gs`
3. `NotificationService.gs`
4. `SchedulerService.gs`

## 수동 반영이 필요한 경우

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 `Constants.gs`, `Config.gs`, `NotificationService.gs`, `SchedulerService.gs` 내용을 공식 저장소의 코드로 전부 교체합니다.
3. **+ → 스크립트**를 선택해 아래 파일을 생성하고 코드를 붙여넣습니다.
   - `NotificationChannel`
   - `NotificationRuleService`
   - `Tests_SchedulerStabilityTest`
4. 전체 파일을 저장합니다.
5. 함수 목록에서 `runSchedulerStabilityTests`를 선택해 실행합니다.
6. 실행 로그에서 `[TASK-0014A] 안정화 테스트 PASS`를 확인합니다.
7. 함수 목록에서 `runNotificationTests`를 선택해 기존 회귀 테스트를 실행합니다.
8. 실행 로그에서 `[TASK-0014] 전체 테스트 PASS`를 확인합니다.

## Scheduler 운영 함수

- 등록: `registerSchedulerTriggers()`
- 제거: `removeSchedulerTriggers()`
- 상태 조회: `getSchedulerStatus()`

## 주의

- Trigger 등록은 기존 Scheduler Trigger를 제거한 뒤 시간별·일별 Trigger를 각각 1개 생성합니다.
- 외부 채널 발송은 아직 구현하지 않았습니다.
- Batch Notification은 인터페이스만 준비되어 있으며 표준 `NOT_IMPLEMENTED` 응답을 반환합니다.
