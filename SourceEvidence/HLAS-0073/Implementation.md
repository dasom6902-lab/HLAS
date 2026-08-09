# HLAS-0073 Record Transaction Governance Implementation

## Classification

- Task ID: HLAS-0073
- Implementation Type: GOVERNANCE ARTIFACT
- Runtime Apps Script Change: NONE
- Public API Change: NONE
- History Rewrite: NONE

## Transaction Schema

The canonical transaction identifier is:

`Task ID:Revision:Commit SHA`

Example:

`HLAS-0072:v1.0:21d783604757759be7fc4fca738e930dddff11e3`

The machine-readable contract is `transaction.schema.json`. It requires the Task Record, append-only revision mapping, CHANGELOG entry, commit metadata, record hash, and verification state to be stored as one traceable transaction artifact.

## Revision Mapping

Revision history is append-only. Every new entry records:

- `previousRevision`
- `newRevision`
- `changeReason`
- `appendOnly: true`

Existing revisions, commits, and history are never rewritten. A non-increasing revision is rejected by the validator.

## CHANGELOG Structure

Every CHANGELOG mapping requires:

- Task ID
- Revision
- Date
- Change Summary
- Changed Layer
- Changed Files
- Commit ID
- Risk
- Verification Status

The validator rejects any entry with a missing required field.

## Commit Metadata Mapping

Every commit mapping requires:

- Repository
- Branch
- Commit ID
- Changed Files
- SHA-256 Hash
- Verification Status

The validator requires the Task ID, revision, Commit SHA, changed-file list, and record hash to match across the transaction, CHANGELOG, record, and commit metadata objects.

## Recovery Rules

| Case | Detection Result | Required Action |
| --- | --- | --- |
| Record exists and commit is missing | `MISSING_COMMIT` | Block completion and obtain verified commit metadata |
| Commit exists and record is missing | `MISSING_RECORD` | Block completion and restore the approved record artifact |
| Record hash and commit mapping hash differ | `INTEGRITY_FAILURE` | Block PASS and perform content-integrity recovery |

Recovery detection does not modify runtime source, existing revisions, or Git history.

## Evidence

- Schema: `transaction.schema.json`
- Mapping example: `examples/HLAS-0072-v1.0-transaction.json`
- Validator and recovery tests: `tests/validate-transaction.mjs`
- Validation result: `ValidationResult.md`

## Security

The artifacts contain no token, OAuth credential, access token, API secret, Script Properties value, or personal information.
