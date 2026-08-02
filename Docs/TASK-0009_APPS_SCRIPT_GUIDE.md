# TASK-0009 Apps Script 반영 순서

현재 HLAS-PMS Apps Script 프로젝트에는 TASK-0009가 실제 반영되어 있습니다. 복구 또는 다른 프로젝트 설치 시 아래 순서를 사용합니다.

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 파일 내용을 배포 패키지의 같은 이름 파일로 전부 교체합니다.
   - `Constants.gs`
   - `ProjectService.gs`
   - `EpicService.gs`
   - `FeatureAPI.gs`
   - `FunctionAPI.gs`
   - `Dialog_FeatureList.html`
   - `Dialog_FunctionList.html`
   - `Config.gs`
3. 왼쪽 **+ → 스크립트**를 선택하여 다음 파일을 생성합니다.
   - `DeletePolicy`
   - `Tests_DeletePolicyTest`
4. 다운로드한 동일 이름 파일의 전체 코드를 각각 붙여넣습니다.
5. 전체 파일을 저장합니다.
6. 실행 함수에서 `runDeletePolicyTests`를 선택합니다.
7. **실행**을 누릅니다.
8. 실행 로그에 `[TASK-0009] 전체 테스트 PASS`가 표시되는지 확인합니다.
9. FEATURE 또는 FUNCTION 목록에서 하위 데이터가 있는 항목의 삭제를 시도합니다.
10. 다음과 같은 삭제 제한 메시지가 표시되는지 확인합니다.

```text
하위 FUNCTION이 존재합니다.
하위 TASK가 존재합니다.
```

11. 하위 데이터를 먼저 삭제한 뒤 상위 데이터가 정상 삭제되는지 확인합니다.
