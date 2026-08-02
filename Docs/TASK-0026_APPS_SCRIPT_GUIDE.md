# TASK-0026 Apps Script 반영 안내

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 연다.
2. 기존 `Config.gs`, `Constants.gs`를 Backup한 뒤 배포본으로 교체한다.
3. **+ → 스크립트**로 아래 파일을 생성하고 내용을 붙여넣는다.
   - `AgreementRepository`
   - `AgreementService`
   - `AgreementAPI`
   - `AgreementValidator`
   - `AgreementExtension`
   - `AgreementCalculator`
   - `Tests_AgreementTest`
4. 모든 파일을 저장한다.
5. `initializePMS()`를 실행하여 `27_AGREEMENT_MASTER`, `28_AGREEMENT_EXTENSION`을 생성·정비한다.
6. 함수 목록에서 `runAgreementTests()`를 실행한다.
7. 실행 로그에 오류가 없고 반환값의 `passed`가 `true`인지 확인한다.

기존 Agreement 데이터가 있다면 적용 전에 반드시 `F:\HLAS\Backup` 또는 별도 Google Sheet로 백업한다.

