# TASK-0010 Apps Script 반영 순서

1. 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 배포본의 동일 이름 파일로 기존 `.gs`, `.html` 내용을 교체합니다.
3. **+ → 스크립트**에서 `SearchService`, `Tests_SearchServiceTest`를 생성합니다.
4. **+ → HTML**에서 `Dialog_ProjectList`를 생성합니다.
5. 전체 파일을 저장합니다.
6. `runSearchServiceTests()`를 실행합니다.
7. `[TASK-0010] 전체 테스트 PASS`를 확인합니다.
8. 스프레드시트를 새로고침합니다.
9. PROJECT·EPIC·FEATURE·FUNCTION·TASK 목록에서 검색창, 상태/우선순위/부모 필터, 정렬을 확인합니다.
