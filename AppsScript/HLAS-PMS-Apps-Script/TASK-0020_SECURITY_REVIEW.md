# TASK-0020 Security Review

- 버전: `v1.0.0-RC1`
- 결과: **PASS (RC 운영 조건부)**

## 점검 결과

| 항목 | 결과 | 확인 내용 |
|---|---|---|
| RBAC | PASS | CREATE/UPDATE/DELETE/DASHBOARD 권한 검사를 API와 UI에 적용 |
| API Key 저장 | PASS | 원문 대신 해시를 Script Properties에 보관 |
| API Key 노출 방지 | PASS | 발급 시에만 원문 반환, 로그에는 마스킹된 식별값 기록 |
| 입력 검증 | PASS | 공통 Validation 및 부모 엔티티 검증 적용 |
| 오류 처리 | PASS | CoreError와 CommonAPI 표준 응답 사용 |
| 감사 추적 | PASS | CRUD, 권한 거부, API, Scheduler 등 중요 이벤트 기록 |
| 외부 호출 장애 | PASS | Retry, Circuit Breaker, Audit, Notification 연계 |

## 운영 전 필수 확인

1. 운영 API Key를 테스트 키와 분리하고 정기 교체한다.
2. Script Properties의 접근 권한을 관리자 계정으로 제한한다.
3. Webhook 대상은 HTTPS 주소만 허용하고 승인된 도메인 목록으로 관리한다.
4. `06_USER`의 관리자·매니저 권한을 배포 전에 재확인한다.
5. API 로그와 Audit 상세 필드에 개인정보나 인증 원문을 기록하지 않는다.

## 잔여 위험

- Google Apps Script 실행 계정과 조직 정책에 따라 사용자 이메일 확인 범위가 달라질 수 있다.
- 외부 API 인증서·도메인 신뢰 정책은 실제 연동 대상 확정 후 별도 보안 검토가 필요하다.
