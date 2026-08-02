# TASK-0012 Apps Script 반영 및 확인 순서

현재 실제 Apps Script 프로젝트에는 반영과 테스트가 완료되어 있습니다. 다른 사본에 적용할 때는 아래 순서를 사용합니다.

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 파일의 내용을 공식 저장소의 같은 이름 파일로 전부 교체합니다.
   - `Constants.gs`
   - `Config.gs`
   - `ProjectService.gs`
   - `EpicService.gs`
   - `FeatureAPI.gs`
   - `FunctionAPI.gs`
   - `TaskAPI.gs`
   - `DashboardService.gs`
   - `UI.gs`
   - `Dialog_FeatureList.html`
   - `Dialog_FunctionList.html`
   - `Dialog_TaskList.html`
3. Apps Script 왼쪽의 **+ → 스크립트**를 선택해 아래 파일을 생성하고 코드를 붙여넣습니다.
   - `PermissionService`
   - `RoleService`
   - `Tests_PermissionTest`
4. 전체 파일을 저장합니다.
5. 함수 목록에서 `initializePMS`를 선택하여 한 번 실행합니다.
6. 스프레드시트로 돌아가 새로고침합니다.
7. `06_USER` 탭과 `HLAS-PMS` 메뉴를 확인합니다.
8. Apps Script로 돌아가 `Tests_PermissionTest.gs`를 선택합니다.
9. 함수 목록에서 `runPermissionTests`를 실행합니다.
10. 실행 로그에서 `[TASK-0012] 전체 테스트 PASS`를 확인합니다.

## 사용자 역할 등록

`06_USER` 시트에 다음 형식으로 입력합니다.

| USER_ID | USER_NAME | EMAIL | ROLE | STATUS | CREATED_AT | UPDATED_AT |
|---|---|---|---|---|---|---|
| USER-0001 | 사용자명 | Google 계정 이메일 | ADMIN | 사용 | 등록일시 | 수정일시 |

지원 역할은 `ADMIN`, `MANAGER`, `USER`, `VIEWER`입니다.

초기 호환을 위해 등록되지 않은 사용자는 현재 ADMIN으로 동작합니다. 운영 전 기본 역할을 낮추려면 Apps Script 프로젝트 속성에 `DEFAULT_ROLE`을 `VIEWER` 또는 `USER`로 설정합니다.
