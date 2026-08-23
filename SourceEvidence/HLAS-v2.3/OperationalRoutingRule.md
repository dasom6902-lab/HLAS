# HLAS v2.3 Operational Routing Rule

## Status

Revision: HLAS Manager Responsibility Rule v2.3
Status: ACTIVE
Architecture Decision: PASS
Runtime Source Change: NONE
Apps Script Change: NONE
Spreadsheet Mutation: NONE
Trigger Mutation: NONE

## Manager Responsibility Boundary

### 🧭①_Project_Control_Record_Manager_v2
- Task Control
- Workflow Routing
- Official Governance Ownership
- Final Metadata Verification
- Final Content Verification
- Governance Activation Authority
- Final Closure

### 🏛️②_Architecture_Manager_v2
- Architecture Authority
- Responsibility Boundary Review
- Architecture Impact Decision
- Architecture Re-review

### 💬③_Coding_Manager_Chat_v2
- Implementation Planning
- Mandatory QA Gate
- Exact source boundary / Before hash / rollback / backup contract review
- Post-implementation verification
- NON-CODING GitHub / Repository / Evidence / Commit execution
- Hash / Blob / Diff verification
- Official record storage

### ⚙️④_Coding_Manager_Work_v2
CORE / CRITICAL CODING & RUNTIME ESCALATION MANAGER.

Primary scope:
- Core Runtime logic
- Business Logic
- Service / Repository core logic
- Data integrity risk
- Trigger / Scheduler
- ProductionSafetyGuard
- Import / Migration engine
- settlement / closing core logic
- security / authorization core
- API / Webhook / GitHub core integration
- cross-module Runtime defects
- major refactors / high-risk Production changes
- unresolved ⑤ Runtime defects

### 🌐⑤_WebApp_Manager_v1
WEBAPP / WEB UI PRIMARY IMPLEMENTATION MANAGER.

Primary scope:
- HTML / CSS / client-side JavaScript
- WebApp UI shell / dashboard / header / sidebar / navigation
- page/view switching / modal / toast / loading / error / empty state
- forms / tables / search / filter UI
- responsive layout / accessibility / browser UX
- WebApp rendering and initial-render performance
- google.script.run UI integration
- bounded WebApp presentation adapters

## Normal WebApp Route

① Task Control
→ ② only when Architecture Impact = YES
→ ③ Implementation Planning + Mandatory QA Contract
→ ⑤ WebApp Implementation
→ ③ Verification / Evidence
→ ① Official Final Closure

④ is not mandatory for ordinary WebApp implementation.

## Core / Critical Runtime Route

① / ③ / ⑤
→ ④ Core/Critical Runtime implementation or remediation
→ ③ Verification / Evidence
→ ① Official Final Closure

If architecture impact is discovered, route to ② re-review before implementation continues.

## Lightweight Server Adapter Rule

⑤ may implement a lightweight WebApp server adapter only when all are true:
- existing safe server behavior is reused
- no business rule change
- no data model change
- no authorization boundary change
- no Trigger change
- no ProductionSafetyGuard change
- no destructive policy change

Allowed examples: UI wrapper, read-only response shaping, bounded input normalization, existing-function bridge.

If business rules, authorization, destructive planning, core Repository or core Service logic are crossed: STOP → ③ → ④ escalation.

## Mandatory QA Gate

⑤ MUST NOT bypass ③ for Production WebApp work.
③ remains the mandatory implementation-planning and post-implementation QA/evidence gate.

## Self-Handoff

Current Manager = Next Manager: no handoff prompt. Self-handoff is PROHIBITED.

## Historical Protection

- SourceEvidence/HLAS-v2.2/* unchanged / preserved
- v2.2 status: SUPERSEDED / PRESERVED
- Closed task evidence unchanged
- Existing Git history rewrite prohibited
- Force push prohibited
