# TASK-0025A Apps Script 반영 안내

## 자동 반영 상태

TASK-0025A의 신규/수정 파일은 실제 `한살림 물류자동화 PMS` Apps Script 프로젝트에 반영하고 저장했다.

## 수동 반영이 필요한 경우

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 연다.
2. 기존 `Config.gs`, `Constants.gs`는 Backup한 뒤 배포본의 파일 내용으로 교체한다.
3. **+ → 스크립트**를 선택하여 아래 파일을 생성하고 각 파일 내용을 붙여넣는다.
   - `DataTypeManager`
   - `AuditManager`
   - `CacheManager`
   - `IndexManager`
   - `ImportMapper`
   - `ImportValidator`
   - `ImportRepository`
   - `ImportAPI`
   - `Tests_FrameworkTest`
4. 기존 `ImportService.gs`, `AuditService.gs`는 삭제하거나 교체하지 않는다.
5. 전체 파일을 저장한다.
6. 함수 선택에서 `initializePMS`를 실행한다.
7. 권한 승인 화면이 표시되면 사용하는 Google 계정으로 승인한다.
8. 함수 선택에서 `runFrameworkTests`를 실행한다.
9. 실행 로그에서 오류 없이 완료되는지 확인한다.

## 운영 사용 순서

```text
previewFrameworkImport(request)
  → executeFrameworkImport(request)
  → 필요 시 rollbackFrameworkImport(rollbackToken)
```

실제 Import 전에는 반드시 Preview의 오류 건수와 Mapping 결과를 확인한다.

