# TASK-0016 Apps Script 반영 안내

## 신규 파일

- WorkflowService.gs
- WorkflowRuleService.gs
- ApprovalService.gs
- Dialog_Workflow.html
- Tests_WorkflowTest.gs

## 교체 파일

- Constants.gs
- Config.gs
- UI.gs
- NotificationRuleService.gs
- SchedulerService.gs

## 수동 반영 순서

1. Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 교체 파일 5개의 내용을 공식 소스로 전부 교체합니다.
3. **+ → 스크립트**로 WorkflowService, WorkflowRuleService, ApprovalService, Tests_WorkflowTest를 생성합니다.
4. **+ → HTML**로 Dialog_Workflow를 생성합니다.
5. 전체 파일을 저장합니다.
6. `initializePMS()`를 실행해 `10_WORKFLOW_HISTORY` 시트를 생성합니다.
7. 스프레드시트를 새로고침합니다.
8. HLAS-PMS 메뉴에서 Workflow Center, Approval Center, Workflow History를 확인합니다.
9. `runWorkflowTests()`를 실행해 PASS를 확인합니다.
