# TASK-0013 Apps Script 반영 및 확인 순서

현재 실제 Apps Script 프로젝트에는 반영과 테스트가 완료되어 있습니다. 다른 사본에 적용할 때는 아래 순서를 사용합니다.

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 파일의 내용을 공식 저장소의 같은 이름 파일로 전부 교체합니다.
   - `Constants.gs`
   - `Config.gs`
   - `PermissionService.gs`
   - `UI.gs`
   - `ProjectService.gs`
   - `EpicService.gs`
   - `FeatureAPI.gs`
   - `FunctionAPI.gs`
   - `TaskAPI.gs`
3. Apps Script 왼쪽의 **+ → 스크립트**를 선택해 아래 파일을 생성하고 코드를 붙여넣습니다.
   - `AuditService`
   - `Tests_AuditServiceTest`
4. 다시 **+ → HTML**을 선택해 아래 파일을 생성하고 코드를 붙여넣습니다.
   - `Dialog_Audit`
5. 전체 파일을 저장합니다.
6. 함수 목록에서 `initializePMS`를 선택하여 한 번 실행합니다.
7. 스프레드시트로 돌아가 새로고침합니다.
8. `07_AUDIT` 탭을 확인합니다.
9. `HLAS-PMS → Audit Center`를 실행해 검색 화면을 확인합니다.
10. Apps Script에서 `Tests_AuditServiceTest.gs`를 선택합니다.
11. 함수 목록에서 `runAuditServiceTests`를 실행합니다.
12. 실행 로그에서 `[TASK-0013] 전체 테스트 PASS`를 확인합니다.

## Audit Center 사용

- 날짜: 시작일과 종료일 범위
- 사용자: 이메일 부분 검색
- Action: CREATE, UPDATE, DELETE, LOGIN, DASHBOARD, PERMISSION_DENIED, ERROR
- Entity: PROJECT, EPIC, FEATURE, FUNCTION, TASK, SYSTEM
- Result: SUCCESS, FAIL, DENIED
- 정렬: 최신순 또는 오래된순
