# TASK-0007 Apps Script 반영 안내

현재 실제 Apps Script 프로젝트에는 반영이 완료되어 있다.

재설치 또는 다른 스프레드시트에 적용할 때는 다음 순서를 따른다.

1. Google 스프레드시트에서 `확장 프로그램 → Apps Script`를 연다.
2. `+ → 스크립트`를 선택해 `IdGenerator`를 생성하고 코드를 붙여넣는다.
3. `+ → 스크립트`를 선택해 `FunctionAPI`를 생성하고 코드를 붙여넣는다.
4. `+ → 스크립트`를 선택해 `Tests_FunctionTest`를 생성하고 코드를 붙여넣는다.
5. `+ → HTML`을 선택해 `Dialog_Function`을 생성하고 HTML을 붙여넣는다.
6. `+ → HTML`을 선택해 `Dialog_FunctionList`를 생성하고 HTML을 붙여넣는다.
7. 기존 `Constants.gs` 내용을 배포본 코드로 전부 교체한다.
8. 기존 `FeatureAPI.gs` 내용을 배포본 코드로 전부 교체한다.
9. 기존 `UI.gs` 내용을 배포본 코드로 전부 교체한다.
10. 기존 `Config.gs` 내용을 배포본 코드로 전부 교체한다.
11. 모든 파일을 저장한다.
12. 함수 선택 목록에서 `runFunctionTests`를 선택하고 실행한다.
13. 실행 로그에서 모든 항목이 `PASS`인지 확인한다.
14. 스프레드시트를 새로고침한다.
15. `HLAS-PMS → FUNCTION 관리`에서 등록·목록 화면을 확인한다.
