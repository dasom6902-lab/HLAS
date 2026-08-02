# TASK-0019 Apps Script 반영 안내

실제 Apps Script 프로젝트에는 반영 및 테스트가 완료되었다.

수동 재반영 시:

1. `Constants.gs`, `Config.gs`, `UI.gs`를 공식 저장소 파일로 교체한다.
2. 스크립트 파일 `HealthCheckService`, `PerformanceService`, `RetryService`, `CircuitBreakerService`, `RecoveryService`, `FeatureFlagService`, `MaintenanceService`, `Tests_PlatformReliabilityTest`를 생성한다.
3. HTML 파일 `Dialog_SystemHealth`를 생성한다.
4. 전체 저장 후 `initializePMS()`를 실행한다.
5. `runPlatformReliabilityTests()`를 실행한다.
6. 스프레드시트를 새로고침한다.
7. `HLAS-PMS → System Health` 메뉴를 확인한다.

