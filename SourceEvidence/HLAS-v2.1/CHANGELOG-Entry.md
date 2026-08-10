# HLAS v2.1 CHANGELOG Entry

## HLAS Manager Responsibility Rule v2.1

Status: ACTIVE

Official Final Decision: PASS

Previous Revision: v2.0

New Revision: v2.1

Change Type: GOVERNANCE / ROUTING

Execution Class: NON-CODING

Architecture Impact: RESOLVED

### Changes

- Added NON-CODE GitHub execution authority to ③ Coding Manager — Chat v2.
- Restricted ④ Coding Manager — Work v2 to CODING / RUNTIME EXECUTION ONLY.
- Added Task Classification Rule: NON-CODING / CODING / MIXED plus separate Architecture Impact classification.
- Added ④ Work Invocation Gate.
- Added Scope Escalation Rule for Source/Runtime requirements discovered during NON-CODE work.
- Separated QA Gate from Storage Verification Gate.
- Preserved ① Final Metadata / Content Verification and Final Closure authority.
- Preserved ② Architecture authority.
- Preserved append-only history, closed-task protection, and public API protection.

### Compatibility

Closed v2.0 tasks are not retroactively changed.

v2.1 applies to new tasks after activation, new follow-up tasks, and active tasks explicitly routed under v2.1.

### Evidence

- `SourceEvidence/HLAS-v2.1/OperationalRoutingRule.md`
- `SourceEvidence/HLAS-v2.1/HandoffRoutingTemplate.md`
- `SourceEvidence/HLAS-v2.1/ActivationGovernanceRecord.md`
- `SourceEvidence/HLAS-v2.1/RevisionRegistry.md`

### Root CHANGELOG Handling

The repository root `CHANGELOG.md` is an existing large append-only history file. This v2.1 activation entry is stored as a dedicated append-only evidence record to avoid unsafe whole-file replacement or accidental modification of existing closed history through the connector.
