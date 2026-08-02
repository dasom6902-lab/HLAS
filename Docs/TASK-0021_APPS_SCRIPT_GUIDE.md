# TASK-0021 Apps Script 반영 및 확인 순서

이번 TASK는 실제 Apps Script 프로젝트에 반영 완료되어 있다. 다른 프로젝트 또는 백업본에 수동 반영할 때 아래 순서를 사용한다.

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 연다.
2. 기존 `Constants.gs` 내용을 공식 저장소의 파일로 전부 교체한다.
3. 기존 `Config.gs` 내용을 공식 저장소의 파일로 전부 교체한다.
4. 왼쪽 **+ → 스크립트**를 선택해 `MasterDataRepository`를 생성하고 코드를 붙여넣는다.
5. 다시 **+ → 스크립트**를 선택해 `MasterDataService`를 생성하고 코드를 붙여넣는다.
6. 다시 **+ → 스크립트**를 선택해 `MasterDataAPI`를 생성하고 코드를 붙여넣는다.
7. 다시 **+ → 스크립트**를 선택해 `Tests_MasterDataTest`를 생성하고 코드를 붙여넣는다.
8. 모든 파일을 저장한다.
9. 함수 목록에서 `runMasterDataTests`를 선택한다.
10. **실행**을 누르고 권한 요청이 표시되면 대상 운영본 조회 권한을 승인한다.
11. 실행 로그에 `실행이 완료됨`이 표시되는지 확인한다.

## 다른 운영본을 점검하는 경우

`Config.gs`의 기본 Spreadsheet ID를 직접 바꾸지 않고 Apps Script의 Script Property에 아래 값을 저장한다.

- Key: `HLAS_MASTER_SPREADSHEET_ID`
- Value: 점검할 Google Spreadsheet ID

이 설정이 있으면 기본 운영본보다 Script Property가 우선된다.

## 주의

- `initializePMS()`는 TASK-0021 검증을 위해 다시 실행할 필요가 없다.
- TASK-0021 코드는 기초시트와 주문내역을 읽기만 한다.
- 기초시트의 A:G 컬럼 순서와 기존 수식을 자동 변경하지 않는다.

