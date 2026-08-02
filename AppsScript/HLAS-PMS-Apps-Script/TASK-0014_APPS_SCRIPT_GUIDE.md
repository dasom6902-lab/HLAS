# TASK-0014 Apps Script 반영 및 확인 순서

현재 실제 Apps Script 프로젝트에는 반영과 테스트가 완료되어 있습니다. 다른 사본에 적용할 때는 아래 순서를 사용합니다.

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 파일의 내용을 공식 저장소의 같은 이름 파일로 전부 교체합니다.
   - `Constants.gs`
   - `Config.gs`
   - `TaskAPI.gs`
   - `UI.gs`
3. Apps Script 왼쪽의 **+ → 스크립트**를 선택해 아래 파일을 생성합니다.
   - `NotificationService`
   - `SchedulerService`
   - `Tests_NotificationTest`
4. **+ → HTML**을 선택해 `Dialog_Notification`을 생성합니다.
5. 공식 저장소의 각 파일 코드를 붙여넣고 전체 저장합니다.
6. 함수 목록에서 `initializePMS`를 실행합니다.
7. 시간 트리거 권한이 요청되면 Google 계정을 선택하고 허용합니다.
8. 스프레드시트를 새로고침합니다.
9. `08_NOTIFICATION` 탭을 확인합니다.
10. `HLAS-PMS → Notification Center`를 실행합니다.
11. Apps Script에서 `runNotificationTests`를 실행합니다.
12. `[TASK-0014] 전체 테스트 PASS`를 확인합니다.

## 시간 트리거 등록

시간 트리거는 자동 등록되지 않습니다.

운영 적용을 결정한 뒤 Apps Script에서 다음 함수를 관리자가 직접 실행합니다.

- 등록: `registerSchedulerTriggers()`
- 해제: `removeSchedulerTriggers()`

등록 시:

- `runHourlyJobs()`는 매시간 실행
- `runDailyJobs()`는 매일 오전 8시 실행
