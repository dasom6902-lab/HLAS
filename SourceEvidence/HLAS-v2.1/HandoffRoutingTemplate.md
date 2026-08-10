# HLAS v2.1 Handoff Routing Template

## Purpose

Apply HLAS Manager Responsibility Rule v2.1 to handoff decisions without changing the 4-Manager structure.

## Required Header

Every handoff must contain:

- 전달 대상
- FROM
- TO
- TASK

Recommended additional fields:

- 목적
- Current Status
- Architecture Decision
- Task Classification
- Approved Scope
- Protected Scope
- Evidence
- Risk / Constraint
- Completion Gate
- Result Format
- Next Handoff

## Task Classification Block

```text
Task Classification:

Execution Class:
NON-CODING / CODING / MIXED

Architecture Impact:
YES / NO / RESOLVED
```

## ④ Work Invocation Gate Block

```text
④ Work Invocation Gate:

Source Code Change: TRUE / FALSE
Runtime Logic Change: TRUE / FALSE
Apps Script Implementation: TRUE / FALSE
Test Code Change: TRUE / FALSE
Actual Runtime Test: TRUE / FALSE
Integration Test: TRUE / FALSE
Performance Test: TRUE / FALSE
Local Execution: TRUE / FALSE
Build / Script Execution: TRUE / FALSE
Coding Artifact Generation: TRUE / FALSE

Decision:
CALL ④ WORK / SKIP ④ WORK
```

Rule:

If any item is TRUE, route the coding/runtime portion to ④ Coding Manager — Work v2.

If every item is FALSE, ③ Coding Manager — Chat v2 may execute approved NON-CODE GitHub storage directly.

## Non-Code GitHub Execution Result Block

```text
Non-Code GitHub Execution:

Repository:
Branch:
Changed Files:
Commit ID:
Commit Message:
Storage Result:
Re-query Result:
Search Verification:
Content Verification:
Security Check:
Remaining Issue:

Storage Gate:
STORAGE PASS / STORAGE FAILED / VERIFICATION PASS / VERIFICATION FAILED / BLOCKED
```

Do not use `Official Final PASS` in the ③ storage result.

## Coding Result / QA Separation

For coding/runtime tasks:

`③ Planning → ④ Execution → ③ QA Gate`

The ③ QA Gate reviews implementation and test evidence. A later non-code GitHub storage action by ③ is a separate Storage Gate.

`QA PASS` does not automatically mean `STORAGE PASS`.

`STORAGE PASS` does not mean `Official Final PASS`.

## Scope Escalation Block

```text
Scope Escalation:

Scope Change Detected: YES / NO
Source / Runtime Change Required: YES / NO
Architecture Impact Detected: YES / NO

Routing:
④ WORK / ② ARCHITECTURE / CONTINUE NON-CODE
```

If Source/Runtime work is discovered, stop the non-code execution before routing.

If Architecture impact is also discovered, obtain ② Architecture review before implementation.

## ① Final Verification Handoff Template

```text
==================================================
[HLAS HANDOFF PROMPT]

<TASK ID>
Final Metadata / Content Verification

==================================================

전달 대상:
① Project Control & Record Manager v2

FROM:
③ Coding Manager — Chat v2

TO:
① Project Control & Record Manager v2

TASK:
<TASK ID / TASK NAME>

==================================================

Task Classification:

Architecture Decision:

Implementation / Non-Code Execution Status:

QA Gate:
NOT APPLICABLE / PASS / CONDITIONAL PASS / REWORK REQUIRED / BLOCKED / FAILED

GitHub Storage:
STORAGE PASS / STORAGE FAILED / BLOCKED

Storage Verification:
VERIFICATION PASS / VERIFICATION FAILED / BLOCKED

Repository:

Branch:

Commit ID:

Changed Files:

Re-query Result:

Search Verification:

Content Verification:

Security Check:

Remaining Risk:

==================================================

③ Decision:

Official Final PASS:
NOT DECLARED BY ③

Required ① Action:
- Final Metadata Verification
- Final Content Verification
- Final Closure Decision

==================================================
END
==================================================
```

## Compatibility

Do not rewrite closed v2.0 task history merely to adopt this template.

Use this template for:

- new tasks after HLAS v2.1 activation
- new follow-up tasks
- active tasks explicitly routed under v2.1
