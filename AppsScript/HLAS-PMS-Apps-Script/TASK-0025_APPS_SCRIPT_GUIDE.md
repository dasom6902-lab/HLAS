# TASK-0025 Apps Script 반영 안내

현재 실제 Apps Script 프로젝트에는 반영과 테스트가 완료되어 있습니다. 다른 사본 또는 복구 환경에 적용할 때는 아래 순서를 따릅니다.

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 `Config.gs` 내용을 배포본의 코드로 전부 교체합니다.
3. 기존 `Constants.gs` 내용을 배포본의 코드로 전부 교체합니다.
4. **+ → 스크립트**를 선택하여 아래 파일을 차례로 생성하고 코드를 붙여넣습니다.
   - `ReceivingExtension.gs`
   - `ReceivingValidator.gs`
   - `ReceivingRepository.gs`
   - `ReceivingService.gs`
   - `ReceivingAPI.gs`
   - `Tests_ReceivingTest.gs`
5. 전체 파일을 저장합니다.
6. 함수 목록에서 `initializePMS`를 선택하여 한 번 실행합니다.
7. 다음 시트가 생성되었는지 확인합니다.
   - `24_RECEIVING_TRANSACTION`
   - `25_RECEIVING_EXTENSION`
8. 함수 목록에서 `runReceivingTests`를 선택하고 실행합니다.
9. 실행 로그에 **실행이 완료됨**이 표시되는지 확인합니다.

전체 회귀 테스트는 외부 Master Data와 여러 시트를 점검하므로 약 3분 정도 걸릴 수 있습니다. 실행 중에는 중지하지 마십시오.
