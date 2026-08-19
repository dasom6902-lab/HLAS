# HLAS v2.2 Operational Routing Rule

## Status

Revision: HLAS Manager Responsibility Rule v2.2

Previous Revision: v2.1

Architecture Decision: PASS

Governance Status: ACTIVATION PREPARATION

Runtime Source Change: NONE

Public API Change: NONE

Closed History Rewrite: NONE

## Objective

Restrict ⚙️④_Coding_Manager_Work_v2 invocation to actual Coding / Runtime Source implementation or execution required for validation of that Coding implementation.

Execution method alone does not determine Coding classification.

NON-CODING Repository Operations remain the responsibility of 💬③_Coding_Manager_Chat_v2 regardless of whether they use Connector, Git, CLI, Local execution, or PowerShell.

## Manager Responsibility Boundary

### 🧭①_Project_Control_Record_Manager_v2

- Task Control
- Workflow Routing
- Official Governance Content Ownership
- Final Metadata Verification
- Final Content Verification
- Governance Activation Authority
- Final Closure

### 🏛️②_Architecture_Manager_v2

- Architecture Authority
- Responsibility Boundary Review
- Architecture Impact Decision
- Architecture Re-review when scope changes affect architecture

### 💬③_Coding_Manager_Chat_v2

- Implementation Planning
- QA Gate
- NON-CODING GitHub / Repository Execution
- Markdown / JSON / Evidence storage
- CHANGELOG management
- Official Record storage
- Repository File Operations
- Git Operations
- Commit / Push
- Hash / Blob Verification
- Diff Verification
- Repository Re-query
- Content Verification
- Non-Code Append / Update

### ⚙️④_Coding_Manager_Work_v2

CODING / RUNTIME SOURCE EXECUTION ONLY

## ④ Coding-Only Invocation Gate

CALL ⚙️④_Coding_Manager_Work_v2 only if one or more are TRUE:

1. Source Code Change Required
2. Runtime Logic Change Required
3. Apps Script Implementation Required
4. Test Code Change Required
5. Coding Artifact Generation Required
6. Runtime / Integration / Performance Execution is required as part of actual Coding Implementation validation

If all are FALSE:

SKIP ④ WORK

## Non-Standalone Triggers

The following do NOT independently invoke ④:

- Local Execution
- Git Operation
- Git Commit
- Git Push
- Repository File Append
- Markdown Update
- JSON Evidence Update
- CHANGELOG Update
- Hash Calculation
- Blob Verification
- Diff Verification
- Repository Re-query
- Content Verification
- Repository Verification
- Build / Script execution used only for NON-CODING repository administration

## Execution Environment Rule

Connector / Git / CLI / Local / PowerShell does not by itself change a NON-CODING task into a CODING task.

## Scope Escalation

If ③ discovers that actual Source Code or Runtime Logic implementation is required:

STOP

↓

SCOPE CHANGE

↓

Re-evaluate Coding Invocation Gate

If Coding Requirement = TRUE:

Route Coding portion to ⚙️④_Coding_Manager_Work_v2.

If Architecture Impact = TRUE:

Obtain 🏛️②_Architecture_Manager_v2 re-review before implementation.

## Governance Read-First Rule

Every Manager must:

1. Read HLAS-GOVERNANCE.md
2. Verify Current ACTIVE Version
3. Read referenced ACTIVE Governance Rules
4. Confirm current Manager Responsibility
5. Then classify and execute the task

Rule Conflict:

STOP

↓

Return to 🧭①_Project_Control_Record_Manager_v2

## Self-Handoff Rule

If Current Manager = Next Manager:

Do not generate a Handoff Prompt.

Self-Handoff is PROHIBITED.

The current Manager performs the required decision directly.

## Protected Scope

- Current 4-Manager Structure maintained
- ① Final Verification Authority maintained
- ② Architecture Authority maintained
- ③ QA Gate maintained
- ④ Coding / Runtime Source Authority maintained
- Closed History protected
- Existing Commit History rewrite prohibited
- Public API protected
- Runtime Source unchanged by governance revision
