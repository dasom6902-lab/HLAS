# TASK-0023 Apps Script 반영 순서

실제 HLAS-PMS Apps Script에는 반영이 완료되어 별도 작업이 필요하지 않습니다.
다른 프로젝트에 수동 반영할 경우 아래 순서를 사용합니다.

1. Google 스프레드시트에서 `확장 프로그램 → Apps Script`를 엽니다.
2. 기존 `Config.gs` 내용을 TASK-0023 버전 전체 코드로 교체합니다.
3. 기존 `Constants.gs` 내용을 TASK-0023 버전 전체 코드로 교체합니다.
4. `+ → 스크립트`를 선택해 다음 파일을 생성합니다.
   - `PlanningRegistry`
   - `TargetValidator`
   - `TargetRepository`
   - `TargetService`
   - `TargetAPI`
   - `Tests_TargetTest`
5. 각 파일에 동일한 이름의 `.gs` 전체 코드를 붙여넣습니다.
6. 전체 파일을 저장합니다.
7. `initializePMS()`를 한 번 실행하여 Planning 시트를 생성합니다.
8. 함수 선택 목록에서 `runTargetTests`를 선택합니다.
9. `실행`을 누릅니다.
10. 실행 로그에 `실행이 완료됨`이 표시되는지 확인합니다.
