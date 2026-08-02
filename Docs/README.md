# HLAS-PMS Apps Script Scaffold

## 포함 파일

- `Code.gs` — 메뉴와 `initializePMS()` 초기화 함수
- `Config.gs` — 핵심 시트, 헤더, 열 너비 정의
- `UI.gs` — HLAS-PMS 메뉴와 대화상자 호출
- `ProjectService.gs` — 프로젝트 ID 발급, 검증, 저장
- `EpicService.gs` — EPIC ID 발급, 검증, 저장, 목록 조회
- `Dialog_Project.html` — 프로젝트 생성 입력 화면
- `Dialog_Epic.html` — EPIC 생성 입력 화면
- `Dialog_EpicList.html` — EPIC 목록 조회 화면
- `appsscript.json` — Apps Script 프로젝트 설정

## 설치

1. `한살림 물류자동화 PMS` Google 스프레드시트를 엽니다.
2. **확장 프로그램 → Apps Script**를 엽니다.
3. 기존 `Code.gs` 내용을 이 패키지의 `Code.gs` 내용으로 교체합니다.
4. **+ → 스크립트**로 `Config`, `UI`, `ProjectService`, `EpicService` 파일을 각각 만들고 대응하는 `.gs` 내용을 붙여넣습니다.
5. **+ → HTML**로 `Dialog_Project`, `Dialog_Epic`, `Dialog_EpicList` 파일을 만들고 대응하는 `.html` 내용을 붙여넣습니다.
6. 왼쪽 **프로젝트 설정**에서 `appsscript.json 매니페스트 파일을 편집기에 표시`를 켭니다.
7. 표시된 `appsscript.json` 내용을 패키지 파일의 내용으로 교체합니다.
8. 모두 저장한 뒤 함수 목록에서 `initializePMS`를 선택하고 실행합니다.
9. 최초 실행 시 Google 권한 요청을 승인합니다.
10. 스프레드시트를 새로고침하면 `HLAS-PMS` 메뉴가 나타납니다.

## 실행 결과

다음 핵심 시트가 없으면 생성됩니다.

- `00_HOME`
- `01_PROJECT`
- `02_EPIC`
- `03_FEATURE`
- `04_FUNCTION`
- `05_TASK`
- `09_CHANGELOG`
- `99_SETTING`

각 시트의 첫 행에 헤더를 쓰고, 첫 행을 고정하고, 공통 헤더 서식을 적용합니다.
`09_CHANGELOG`에는 초기화 결과가 기록됩니다.

## 재실행 안전성

`initializePMS()`를 다시 실행해도 기존 시트와 2행 이하 데이터는 삭제하지 않습니다.
첫 행의 표준 헤더와 서식만 다시 적용하며, 실행 내역을 변경 이력에 추가합니다.
