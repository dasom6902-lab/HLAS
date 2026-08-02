# TASK-0011 Apps Script 반영 순서

1. 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. `UI.gs`, `Config.gs`를 배포본 내용으로 교체합니다.
3. **+ → 스크립트**에서 `DashboardService`, `Tests_DashboardTest`를 생성합니다.
4. **+ → HTML**에서 `Dialog_Dashboard`를 생성합니다.
5. 각 배포 파일의 전체 코드를 붙여넣고 저장합니다.
6. `runDashboardTests()`를 실행하여 전체 PASS를 확인합니다.
7. 스프레드시트를 새로고침합니다.
8. **HLAS-PMS → KPI Dashboard**를 선택합니다.
9. KPI 카드, 상태·우선순위 요약과 Project Progress를 확인합니다.
