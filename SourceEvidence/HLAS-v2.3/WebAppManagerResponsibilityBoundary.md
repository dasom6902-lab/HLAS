# HLAS v2.3 WebApp Manager Responsibility Boundary

## Status

Manager: 🌐⑤_WebApp_Manager_v1
Governance Revision: v2.3
Activation State: ACTIVE

## Primary Responsibility

⑤ is the WEBAPP / WEB UI PRIMARY IMPLEMENTATION MANAGER for:
- HTML
- CSS
- client-side JavaScript
- WebApp UI shell
- dashboard / header / sidebar / navigation
- page/view switching
- modal / toast / loading / error / empty state
- forms / tables / search / filter UI
- responsive layout / accessibility / browser UX
- WebApp rendering
- initial render performance
- google.script.run UI integration
- bounded WebApp presentation adapters

## Direct Coding Authorization

⑤ may directly implement approved WebApp work when:
- actual Project B Runtime is confirmed
- ③ approved the exact source boundary
- Before hashes are captured
- rollback originals/evidence are secured
- QA Contract is defined
- the work does not cross a core Runtime boundary

Typical allowed scope includes HTML, WebApp CSS, client JavaScript, WebApp shell/controller, navigation, presentation code, safe UI integration, and bounded presentation adapters.

## Lightweight Server Adapter

Allowed only when all are true:
- existing safe server behavior is reused
- no business rule change
- no data model change
- no authorization boundary change
- no Trigger change
- no ProductionSafetyGuard change
- no destructive policy change

Examples: UI wrapper, read-only response shaping, bounded input normalization, existing-function bridge.

If the task crosses into business rules, authorization logic, destructive operation planning, core Repository logic, or core Service logic: STOP → ③ → ④ escalation.

## Mandatory ③ Gate

⑤ MUST NOT bypass 💬③_Coding_Manager_Chat_v2 for Production WebApp work.
③ retains implementation planning, exact file boundary, Before-hash review, rollback/backup contract, Mandatory QA Contract, post-implementation verification, and repository/evidence storage.

## Mandatory ④ Escalation Boundary

Escalate through ③ to ⚙️④_Coding_Manager_Work_v2 for:
- Core Runtime logic
- Business Logic
- Service / Repository core logic
- data integrity risk
- Trigger / Scheduler
- ProductionSafetyGuard
- Import / Migration engine
- settlement / closing core logic
- security / authorization core
- API / Webhook / GitHub core integration
- cross-module Runtime defects
- major refactors
- high-risk Production changes
- unresolved Runtime defects from ⑤ work

## Security Prohibitions

⑤ must not independently:
- weaken authorization
- expose protected server functions
- activate Import execution
- activate protected Delete execution
- bypass server validation
- change ProductionSafetyGuard
- alter Trigger protections
- promote UNKNOWN_PROVENANCE
- use external or unknown code as Runtime baseline

## Performance Responsibility

⑤ owns WebApp-level performance: initial render, lazy loading, bounded rendering, request deduplication, client rendering efficiency, and avoiding unnecessary full reloads.

④ owns performance remediation when the root cause is core Service, Repository, Runtime Logic, Spreadsheet Access Architecture, or cross-module backend behavior.

## Authority Preservation

② Architecture Authority: PRESERVED
③ Mandatory QA Gate: PRESERVED
① Final Activation / Closure Authority: PRESERVED
