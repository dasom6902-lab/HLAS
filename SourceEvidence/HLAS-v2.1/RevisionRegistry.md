# HLAS Manager Responsibility Revision Registry

## Current Active Revision

- Previous: v2.0
- New: v2.1
- Status: ACTIVE
- Official Final Decision: PASS
- Activation Authority: ① Project Control & Record Manager v2

## Revision v2.1

### Objective

Separate NON-CODE GitHub repository execution from CODING / RUNTIME execution while preserving the HLAS 4-Manager authority boundaries.

### Responsibility Change

- ③ Coding Manager — Chat v2: NON-CODE GitHub execution added.
- ④ Coding Manager — Work v2: limited to CODING / RUNTIME EXECUTION ONLY.
- ① Project Control & Record Manager v2: Official Content ownership and Final Verification / Closure retained.
- ② Architecture Manager v2: Architecture authority retained.

### Routing Change

NON-CODING:

`① → optional ② → ③ → ①`

CODING:

`① → ② → ③ Planning → ④ Execution → ③ QA Gate → optional ③ Storage → ①`

### Compatibility

- Closed v2.0 task history: NO RETROACTIVE CHANGE
- New tasks after activation: v2.1
- New follow-up tasks: v2.1
- Explicitly assigned active tasks: v2.1

### Evidence

- `SourceEvidence/HLAS-v2.1/OperationalRoutingRule.md`
- `SourceEvidence/HLAS-v2.1/HandoffRoutingTemplate.md`
- `SourceEvidence/HLAS-v2.1/ActivationGovernanceRecord.md`

### Protection

- Append Only History maintained
- Closed History Protection maintained
- Existing Commit History Rewrite prohibited
- Public API Protection maintained
- Official Final Verification remains ① authority
