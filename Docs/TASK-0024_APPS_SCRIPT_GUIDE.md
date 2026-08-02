# TASK-0024 Apps Script 반영 안내

현재 실제 Apps Script 프로젝트에는 반영과 테스트가 완료되어 있습니다. 다른 사본이나 복구 환경에 적용할 때는 아래 순서를 따릅니다.

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 `Config.gs` 내용을 배포본의 코드로 전부 교체합니다.
3. 기존 `Constants.gs` 내용을 배포본의 코드로 전부 교체합니다.
4. **+ → 스크립트**를 선택하여 아래 파일을 차례로 생성하고 각 파일의 코드를 붙여넣습니다.
   - `ProducerExtension.gs`
   - `ProducerValidator.gs`
   - `ProducerRepository.gs`
   - `ProducerService.gs`
   - `ProducerAPI.gs`
   - `Tests_ProducerTest.gs`
5. 전체 파일을 저장합니다.
6. 함수 목록에서 `initializePMS`를 선택하고 한 번 실행합니다.
7. `22_PRODUCER_MASTER`, `23_PRODUCER_EXTENSION` 시트가 생성되었는지 확인합니다.
8. 함수 목록에서 `runProducerTests`를 선택하고 실행합니다.
9. 실행 로그에 **실행이 완료됨**이 표시되는지 확인합니다.

초기 실행 시 Google 권한 승인 화면이 나타나면 현재 사용 중인 HLAS 계정으로 승인합니다.
