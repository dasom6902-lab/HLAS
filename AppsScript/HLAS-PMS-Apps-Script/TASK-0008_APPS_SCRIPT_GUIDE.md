# TASK-0008 Apps Script 반영 순서

현재 Apps Script 프로젝트에는 TASK-0008 파일이 실제 반영되어 있습니다. 다른 프로젝트에 재설치하거나 복구할 때는 아래 순서를 사용합니다.

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 파일의 내용을 다운로드 패키지에 있는 같은 이름의 파일로 교체합니다.
   - `Constants.gs`
   - `IdGenerator.gs`
   - `FeatureAPI.gs`
   - `FunctionAPI.gs`
   - `UI.gs`
   - `Config.gs`
3. 왼쪽 **+ → 스크립트**를 선택하여 다음 파일을 생성하고 코드를 붙여넣습니다.
   - `ParentValidator`
   - `TaskAPI`
   - `Tests_TaskTest`
4. 왼쪽 **+ → HTML**을 선택하여 다음 파일을 생성하고 코드를 붙여넣습니다.
   - `Dialog_Task`
   - `Dialog_TaskList`
5. 전체 파일을 저장합니다.
6. `initializePMS()`를 한 번 실행하여 `05_TASK` 헤더를 확인합니다.
7. `runTaskTests()`를 실행합니다.
8. 실행 로그에 `[TASK-0008] 전체 테스트 PASS`가 표시되는지 확인합니다.
9. 스프레드시트를 새로고침합니다.
10. 다음 메뉴를 확인합니다.

```text
HLAS-PMS
 └─ TASK 관리
     ├─ TASK 등록
     └─ TASK 목록
```

11. FUNCTION 데이터가 없으면 먼저 FEATURE와 FUNCTION을 등록합니다.
12. TASK 등록·조회·수정·삭제를 차례로 확인합니다.
