# TASK-0017 Apps Script 반영 안내

이번 TASK는 실제 Apps Script 프로젝트에 반영 및 테스트까지 완료되었다.

수동 반영이 필요한 경우:

1. Google 스프레드시트에서 `확장 프로그램 → Apps Script`를 연다.
2. 기존 `Constants.gs`, `Config.gs`, `DashboardService.gs`, `SchedulerService.gs`, `UI.gs`, `Dialog_Dashboard.html`을 공식 저장소 파일로 교체한다.
3. 스크립트 파일 `AnalyticsService`, `KPIService`, `ReportService`, `Tests_AnalyticsTest`를 생성한다.
4. HTML 파일 `Dialog_Report`를 생성한다.
5. 전체 파일을 저장한다.
6. `initializePMS()`를 한 번 실행한다.
7. `runAnalyticsTests()`를 실행한다.
8. 스프레드시트를 새로고침한다.
9. `HLAS-PMS → KPI Dashboard`, `Analytics Center`, `Report Center` 메뉴를 확인한다.

