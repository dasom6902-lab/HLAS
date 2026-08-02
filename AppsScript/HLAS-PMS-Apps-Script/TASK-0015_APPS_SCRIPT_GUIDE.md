# TASK-0015 Apps Script 반영 안내

## 신규 스크립트

- `ImportService.gs`
- `ExportService.gs`
- `BackupService.gs`
- `Tests_ImportExportTest.gs`

## 신규 HTML

- `Dialog_Import.html`
- `Dialog_Export.html`
- `Dialog_Backup.html`

## 교체 파일

- `Constants.gs`
- `Config.gs`
- `UI.gs`

## 수동 반영 순서

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기존 `Constants.gs`, `Config.gs`, `UI.gs` 내용을 공식 소스로 전부 교체합니다.
3. **+ → 스크립트**로 ImportService, ExportService, BackupService, Tests_ImportExportTest를 생성합니다.
4. **+ → HTML**로 Dialog_Import, Dialog_Export, Dialog_Backup을 생성합니다.
5. 전체 파일을 저장합니다.
6. `initializePMS()`를 실행해 `09_BACKUP_HISTORY` 시트를 생성합니다.
7. 스프레드시트를 새로고침합니다.
8. HLAS-PMS 메뉴에서 Import Center, Export Center, Backup Center를 확인합니다.
9. `runImportExportTests()`를 실행해 PASS를 확인합니다.

## 주의

- Restore는 현재 데이터를 백업 데이터로 교체합니다.
- 운영 복원 전 반드시 최신 백업을 추가로 생성하십시오.
- Backup 삭제는 Drive 파일을 휴지통으로 이동하고 이력을 삭제합니다.
