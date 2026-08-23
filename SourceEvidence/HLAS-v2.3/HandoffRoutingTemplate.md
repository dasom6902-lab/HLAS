# HLAS v2.3 Handoff Routing Template

## Status

Revision: HLAS Manager Responsibility Rule v2.3
Status: ACTIVE
Official Activation Authority: 🧭①_Project_Control_Record_Manager_v2

## Governance Read-First

Before every HLAS task:
1. Read HLAS-GOVERNANCE.md
2. Confirm current ACTIVE governance
3. Read referenced ACTIVE rule set
4. Confirm current Manager responsibility
5. Check the task handoff for conflicts

Conflict priority:
GitHub Current ACTIVE Governance
>
Approved Architecture / Governance Record
>
Current Handoff Prompt
>
Previous Chat Memory

## Task Classification

Execution Class: NON-CODING / WEBAPP CODING / CORE CODING / MIXED
Architecture Impact: YES / NO / RESOLVED

## Routing

### Ordinary WebApp
① → ② if architecture review needed → ③ planning/QA contract → ⑤ implementation → ③ verification/evidence → ① final closure

### Core / Critical Runtime
① / ③ / ⑤ → ④ → ③ verification/evidence → ① final closure

### Architecture Change
Route to ② re-review before implementation continues.

## ③ QA Gate

Production WebApp implementation cannot bypass ③.
③ owns exact file boundary, Before hash review, rollback/backup contract, Mandatory QA Contract, post-implementation verification, and repository/evidence storage.

## ⑤ WebApp Boundary

⑤ is primary for WebApp HTML/CSS/client JS, UI shell, rendering, responsive/browser UX, google.script.run UI integration, and bounded presentation adapters.

If ⑤ encounters core business/service/repository logic, authorization/security changes, destructive operations, Trigger/Scheduler, ProductionSafetyGuard, high-risk Production changes, or unresolved Runtime defects: STOP and escalate through ③ to ④.

## ④ Core Boundary

④ is the CORE / CRITICAL CODING & RUNTIME ESCALATION MANAGER and is not mandatory for ordinary WebApp implementation.

## Self-Handoff

Current Manager = Next Manager:
NO HANDOFF PROMPT.
Self-Handoff: PROHIBITED.
The current Manager performs the applicable decision directly.

## Manager Result / Handoff Response Standard

When another Manager handoff is required:
1. State the work result.
2. Identify the exact next Manager.
3. Include Task ID, current stage, authoritative IDs, completed work, changed files/hashes/commits, verification, remaining risks, prohibitions, and exact next action.
4. Do not declare Official Final PASS outside ① authority.

## Official Final Authority

Only 🧭①_Project_Control_Record_Manager_v2 may perform final metadata/content verification and Official Final Closure.

## Historical Protection

v2.2 is SUPERSEDED / PRESERVED. Historical v2.2 and closed task records remain unchanged.
