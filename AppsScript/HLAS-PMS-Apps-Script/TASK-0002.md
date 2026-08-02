# TASK-0002 — HLAS-PMS 메뉴 시스템

## 상태

완료

## 구현 내용

- `onOpen()`에서 `HLAS-PMS` 사용자 메뉴 생성
- `PMS 초기화` → `initializePMS`
- `프로젝트 생성` → `createProject`
- `TASK 생성` → `createTask`
- `CHANGELOG 보기` → `showChangeLog`
- `환경설정` → `openSettings`
- `도움말` → `showHelp`
- 미구현 기능은 `준비중입니다.` 안내 표시
- CHANGELOG와 환경설정은 해당 시트가 있으면 즉시 이동

## 변경 파일

- `Code.gs`

## 테스트 항목

1. 스프레드시트를 새로 열었을 때 `HLAS-PMS` 메뉴가 표시되는지 확인
2. 모든 메뉴 항목이 오류 없이 연결 함수로 실행되는지 확인
3. 프로젝트 생성과 TASK 생성에서 `준비중입니다.`가 표시되는지 확인
4. 초기화 후 CHANGELOG와 환경설정 메뉴가 해당 시트로 이동하는지 확인
