# HLAS Developer Guide

## 개발 순서

요구사항 → 영향 분석 → 설계 → 승인 → 구현 → 실제 테스트 → 문서화 → Release

## 규칙

- 공개 함수는 JSDoc을 작성한다.
- 시트명·상태·공통 문자열은 `Constants.gs`에서 관리한다.
- Sheets 데이터 접근은 `SheetRepository`를 우선 사용한다.
- 입력은 `Validation`, 오류는 `CoreError`를 사용한다.
- API는 `CommonAPI` 표준 응답을 사용한다.
- 중요 변경은 Audit와 CHANGELOG에 기록한다.

## 파일 배치

- `*Service.gs`: 업무/Platform 서비스
- `*API.gs`: Domain API
- `Dialog_*.html`: 화면
- `Tests_*.gs`: 실행 테스트

## 테스트

테스트는 운영 데이터를 보존해야 하며, 생성 데이터와 Script Properties를 `finally`에서 제거한다.

## 버전

Semantic Versioning을 사용한다. RC는 `1.0.0-RC1` 형식으로 관리한다.

