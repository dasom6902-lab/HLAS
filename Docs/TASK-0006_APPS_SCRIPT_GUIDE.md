# TASK-0006 Apps Script 반영 안내

현재 실제 Apps Script 프로젝트에는 반영이 완료되어 있다.

재설치 또는 다른 스프레드시트에 적용할 때는 다음 순서를 따른다.

1. Google 스프레드시트에서 `확장 프로그램 → Apps Script`를 연다.
2. `+ → 스크립트`를 선택해 `Constants`를 생성하고 `Constants.gs` 코드를 붙여넣는다.
3. `+ → 스크립트`를 선택해 `FeatureAPI`를 생성하고 `FeatureAPI.gs` 코드를 붙여넣는다.
4. `+ → 스크립트`를 선택해 `Tests_FeatureTest`를 생성하고 테스트 코드를 붙여넣는다.
5. `+ → HTML`을 선택해 `Dialog_Feature`를 생성하고 HTML 코드를 붙여넣는다.
6. `+ → HTML`을 선택해 `Dialog_FeatureList`를 생성하고 HTML 코드를 붙여넣는다.
7. 기존 `UI.gs` 내용을 배포본의 `UI.gs` 전체 코드로 교체한다.
8. 기존 `Config.gs` 내용을 배포본의 `Config.gs` 전체 코드로 교체한다.
9. 모든 파일을 저장한다.
10. 함수 선택 목록에서 `runFeatureTests`를 선택하고 실행한다.
11. 실행 로그에서 모든 항목이 `PASS`인지 확인한다.
12. 스프레드시트를 새로고침한다.
13. `HLAS-PMS → FEATURE 관리` 메뉴에서 등록·목록 화면을 확인한다.
