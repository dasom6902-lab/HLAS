# HLAS Deployment Guide

## 설치

1. Google 스프레드시트를 생성한다.
2. `확장 프로그램 → Apps Script`를 연다.
3. Release의 `.gs`, `.html`, `appsscript.json` 파일을 반영한다.
4. `initializePMS()`를 실행한다.
5. Google 권한 요청을 검토하고 승인한다.
6. 스프레드시트를 새로고침한다.

## 초기 설정

1. `99_SETTING`의 기본 Role과 환경을 확인한다.
2. `16_FEATURE_FLAG`에서 필요한 Flag를 설정한다.
3. API Manager에서 Client Key를 발급한다.
4. `registerSchedulerTriggers()`를 실행한다.
5. `getSchedulerStatus()`에서 Hourly/Daily Trigger를 확인한다.
6. System Health를 실행한다.

## 배포 전 확인

- 전체 Regression PASS
- Health 상태 HEALTHY
- Backup 생성
- Maintenance Mode 적용
- 소스와 문서의 Version 일치

## Rollback

이전 Release ZIP의 소스를 반영하고 검증된 Backup을 복원한 뒤 Health Check를 실행한다.

