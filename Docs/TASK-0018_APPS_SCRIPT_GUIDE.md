# TASK-0018 Apps Script 반영 안내

실제 Apps Script 프로젝트에는 이미 반영 및 테스트가 완료되었다.

수동 재반영 시:

1. `Constants.gs`, `Config.gs`, `UI.gs`를 공식 저장소 파일로 교체한다.
2. 스크립트 파일 `ApiGatewayService`, `ApiAuthService`, `WebhookService`, `IntegrationService`, `EventBusService`, `Tests_ApiIntegrationTest`를 생성한다.
3. HTML 파일 `Dialog_APIManager`를 생성한다.
4. 저장 후 `initializePMS()`를 실행한다.
5. 외부 서비스 연결 권한 요청이 나오면 권한을 검토하고 승인한다.
6. `runApiIntegrationTests()`를 실행한다.
7. 스프레드시트를 새로고침한다.
8. `HLAS-PMS → API Manager` 메뉴를 확인한다.

주의: 운영 Webhook URL과 API Key는 테스트 자료가 아닌 별도 승인된 운영 값만 사용한다.

