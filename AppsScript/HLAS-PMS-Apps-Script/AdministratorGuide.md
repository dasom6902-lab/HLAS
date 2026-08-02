# HLAS Administrator Guide

## 일상 점검

1. `HLAS-PMS → System Health`에서 Health Check 실행
2. Scheduler Trigger 2개 확인
3. 미해결 Notification과 Audit 실패 확인
4. Runtime Metrics에서 느린 작업 확인
5. Backup 이력 확인

## 장애 대응

- 외부 API 장애: Circuit 상태 확인 후 원인 제거, Circuit Reset
- Scheduler 장애: Scheduler Recovery 실행
- 데이터 오류: Backup 검증 후 Restore
- 긴급 상황: Emergency Stop
- 점검 작업: Maintenance 또는 Read Only Mode

## 보안

- API Key를 문서나 시트에 기록하지 않는다.
- 퇴사·권한 변경 시 User Role과 API Key를 즉시 폐기한다.
- 운영 Webhook은 승인된 HTTPS URL만 사용한다.

## Feature Flag

DEV/TEST/PROD 환경을 구분하며, PROD 변경은 관리자 승인 후 수행한다.

