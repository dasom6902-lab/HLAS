# TASK-0027 Apps Script 반영 안내

## 추가 파일

Apps Script 편집기에서 `+ → 스크립트`를 선택해 아래 파일을 생성하고 동일한 이름의 코드를 반영한다.

1. MigrationProfile.gs
2. MigrationMapper.gs
3. MigrationValidator.gs
4. MigrationLog.gs
5. MigrationRepository.gs
6. MigrationService.gs
7. MigrationAPI.gs
8. Tests_MigrationTest.gs

## 수정 파일

1. Config.gs 전체 교체
2. Constants.gs 전체 교체

## 실행 순서

1. 모든 파일을 저장한다.
2. Apps Script 편집기를 새로고침한다.
3. `initializePMS()`를 실행한다.
4. `29_MIGRATION_LOG` 시트 생성을 확인한다.
5. `runMigrationTests()`를 실행한다.
6. 실행 로그에서 `passed:true`와 각 테스트 PASS를 확인한다.

## 운영 이관 순서

1. 원본 파일을 Backup 폴더에 보존한다.
2. `previewMigration(request)`를 실행한다.
3. 오류·중복·Column Mapping 결과를 검토한다.
4. `validateMigration(request)`의 `valid:true`를 확인한다.
5. `executeMigration(request)`를 실행한다.
6. 결과와 `29_MIGRATION_LOG`를 확인한다.
7. 문제가 있으면 Rollback TTL 안에 `rollbackMigration(migrationId)`를 실행한다.

실제 운영 데이터는 Preview 결과 승인 전 Execute하지 않는다.
