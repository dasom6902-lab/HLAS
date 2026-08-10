# HLAS v2.1 Operational Routing Rule

## Classification

- Revision: HLAS Manager Responsibility Rule v2.1
- Previous Rule: HLAS Manager Responsibility Rule v2.0
- Architecture Decision: PASS
- Implementation Class: NON-CODING / RULE-LEVEL
- Runtime Source Change: NONE
- Public API Change: NONE
- History Rewrite: NONE

## Objective

Separate non-code GitHub repository execution from coding/runtime execution after Repository Contents Write capability is available to ③ Coding Manager — Chat v2.

GitHub write permission does not grant Architecture authority or Runtime coding authority.

## Task Classification Model

Each task is classified on two axes before routing.

### Execution Class

- `NON-CODING`: Markdown, JSON evidence, CHANGELOG, Official Record storage, repository metadata/evidence updates only.
- `CODING`: Source code, runtime logic, Apps Script implementation, test code, runtime/integration/performance/local/build/script execution, or coding artifact generation is required.
- `MIXED`: Contains both NON-CODING and CODING work. Split execution responsibility; coding/runtime portion routes to ④.

### Architecture Impact

- `ARCHITECTURE IMPACT = YES`: ② Architecture Manager review is required before implementation/execution.
- `ARCHITECTURE IMPACT = NO`: ② may be skipped when the absence of architecture impact is clear.

Architecture routing is determined by architecture impact, not by whether a task is non-coding.

## ④ Work Invocation Gate

Route to ④ Coding Manager — Work v2 if any condition below is TRUE:

- Source Code change required
- Runtime Logic change required
- Apps Script implementation required
- Test Code change required
- Actual Runtime Test required
- Integration Test required
- Performance Test required
- Local Execution required
- Build / Script Execution required
- Coding Artifact generation required

If all conditions are FALSE, ④ Work may be skipped.

## Non-Code GitHub Execution Flow

Normal route when Architecture review is needed:

`① Project Control & Record → ② Architecture → ③ Coding Manager — Chat → Non-Code GitHub Storage / Verification → ① Project Control & Record → Final Verification / Closure`

Short route when Architecture impact is clearly absent:

`① Project Control & Record → ③ Coding Manager — Chat → ① Project Control & Record`

③ may execute the following NON-CODE GitHub operations:

- Markdown file create/update
- Official Record storage after ① content ownership/approval
- CHANGELOG update
- Evidence Record create/update
- JSON Evidence storage
- Repository file update
- GitHub commit creation
- Repository re-query
- Search verification
- Content verification
- Commit metadata return

## Coding Execution Flow

`① Project Control & Record → ② Architecture → ③ Coding Manager — Chat (Implementation Planning) → ④ Coding Manager — Work (Coding / Runtime Execution) → ③ Coding Manager — Chat (Code Review / QA Gate) → optional ③ Non-Code GitHub Storage → ① Project Control & Record (Final Verification / Closure)`

## Scope Escalation Rule

If ③ discovers that Source Code or Runtime changes are required during a NON-CODE task:

1. Stop current non-code execution.
2. Mark `SCOPE CHANGE`.
3. Evaluate the ④ Work Invocation Gate.
4. Route coding/runtime work to ④ when required.
5. If the scope change also affects Architecture, route to ② Architecture Manager for re-review before coding execution.

③ must not convert a non-code GitHub task into direct source/runtime implementation.

## Storage Verification Gate

Storage and verification are separate from Official Final PASS.

Required storage evidence:

- Repository
- Branch
- Commit SHA
- Commit message
- Changed file paths
- Repository re-query result
- Search verification result when applicable
- Content verification result
- Secret / credential check

③ may return only storage/verification states such as:

- `STORAGE PASS`
- `STORAGE FAILED`
- `VERIFICATION PASS`
- `VERIFICATION FAILED`
- `BLOCKED`

`STORAGE PASS` does not equal Official Final PASS.

Final metadata/content verification and Final Closure are owned by ① Project Control & Record Manager v2.

## QA Gate

QA Gate and Storage Gate are distinct.

### QA Gate

Owned by ③ Coding Manager — Chat v2 for coding/runtime work returned by ④.

Reviews:

- Architecture compliance
- Approved / Protected Scope
- Public API impact
- Legacy compatibility
- Test evidence
- Regression risk
- Performance evidence when required
- Remaining implementation risk

QA decisions:

- PASS
- CONDITIONAL PASS
- REWORK REQUIRED
- BLOCKED
- FAILED

### Storage Gate

Applies to repository write and verification operations. It proves that the intended non-code content was stored and re-verified; it does not declare final task closure.

## Official Record Responsibility

- Official Record Content Owner: ① Project Control & Record Manager v2
- Official Record Non-Code Storage Owner: ③ Coding Manager — Chat v2
- Source Code / Runtime Execution Owner: ④ Coding Manager — Work v2
- Final Metadata / Content Verification Owner: ① Project Control & Record Manager v2

## Compatibility Handling

HLAS v2.1 routing is not retroactively applied to closed v2.0 tasks.

Applies to:

- New tasks after v2.1 activation
- New follow-up tasks
- Active tasks explicitly assigned to v2.1 routing

Protected closed history remains append-only.

## Protected Scope

Maintain:

- HLAS 4-Manager Structure
- ① Project Control authority
- ② Architecture authority
- ③ QA Gate
- ④ Coding/Runtime execution authority
- Append Only history
- Closed Task history protection
- Public API protection
- Official Final Verification by ①

Prohibited:

- ③ independent Architecture changes
- ③ direct Runtime Source changes
- ④ independent Architecture changes
- Official Final PASS based only on storage
- Closed History rewrite
- Existing Commit History rewrite

## Current Revision Implementation Decision

HLAS v2.1 Manager Responsibility / GitHub Storage Routing Revision is classified as:

- Execution Class: NON-CODING
- Architecture Impact: YES / RESOLVED by ② Architecture Manager PASS
- ④ Work Invocation Gate: ALL FALSE

Therefore ④ Coding Manager — Work v2 is not required for this Rule/Template implementation.
