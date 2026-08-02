# TASK-0027A Apps Script 반영 가이드

## 반영 파일

교체: `Config.gs`, `Constants.gs`, `MigrationProfile.gs`,
`MigrationMapper.gs`, `MigrationValidator.gs`, `MigrationService.gs`,
`Tests_MigrationTest.gs`

신규: `MigrationDuplicateService.gs`

## 반영 순서

1. Google 스프레드시트에서 `확장 프로그램 → Apps Script`를 연다.
2. 동일 프로젝트 탭은 하나만 유지한다.
3. 기존 7개 파일을 배포본 전체 코드로 교체한다.
4. `+ → 스크립트`에서 `MigrationDuplicateService`를 생성해 코드를 붙여넣는다.
5. 전체 저장 후 구름 체크를 확인한다.
6. `initializePMS()`를 실행한다.
7. `29_MIGRATION_LOG` 확장 컬럼을 확인한다.
8. `runSupplyHistory2026Test()`를 실행한다.
9. `runMigrationTests()`를 실행한다.
10. 실행 로그의 `passed:true`와 모든 PASS를 확인한다.

## 운영 적용

원본은 수정하지 않는다. Source Profile을 `SupplyHistory2026`으로 지정하고,
Preview의 운용본 존재·보완 예정·중복 제외·최종 Import 건수를 승인한 뒤에만 Execute한다.
이상 발생 시 Migration ID로 Rollback한다.
