# HLAS v1.0 Apps Script 반영 안내

이번 작업은 실제 HLAS-PMS Apps Script 프로젝트에 반영하고 테스트까지 완료했다.
다른 프로젝트나 복구 환경에 수동 적용할 때는 아래 순서를 따른다.

1. Google 스프레드시트에서 `확장 프로그램 → Apps Script`를 연다.
2. 패키지의 `AppsScript` 폴더에 있는 기존 `.gs` 파일 내용을 같은 이름의 파일에 전부 교체한다.
3. 다음 신규 파일을 `+ → 스크립트`로 생성한다.
   - `ProjectAPI`
   - `EpicAPI`
   - `FeatureService`
   - `FunctionService`
   - `TaskService`
4. 각 신규 파일에 패키지의 동일한 `.gs` 전체 내용을 붙여넣는다.
5. HTML 파일은 변경하지 않는다.
6. 전체 파일을 저장한다.
7. `initializePMS()`를 한 번 실행한다.
8. 스프레드시트를 새로고침한다.
9. HLAS-PMS 메뉴와 기존 Dialog가 정상 표시되는지 확인한다.
10. 다음 테스트를 순서대로 실행한다.
    - `runCoreModuleTests`
    - `runFeatureTests`
    - `runFunctionTests`
    - `runTaskTests`
    - `runDeletePolicyTests`
    - `runSearchServiceTests`
    - `runPermissionTests`
    - `runWorkflowTests`
    - `runImportExportTests`
    - `runAnalyticsTests`
    - `runApiIntegrationTests`
    - `runPlatformReliabilityTests`

모든 테스트가 PASS한 뒤 운영 배포한다.
