# HLAS-0076 Governance Monitoring Dashboard Runtime Architecture

## Boundary

- Governance Record Layer: SOURCE OF TRUTH
- Dashboard: READ ONLY MONITORING VIEW
- Runtime Apps Script Logic: UNCHANGED
- Public API: UNCHANGED
- Governance Record Schema: UNCHANGED

## Data Flow

`Governance Data → Read-only Adapter → Security Filter → Normalization → Cross-reference Validation → Aggregation → Dashboard Model → Refresh/Cache`

Mapping mismatches are displayed as `MISMATCH`; source records are never repaired or mutated.

## Components

1. Governance Summary
2. Revision Monitoring
3. CHANGELOG Monitoring
4. Commit Metadata Monitoring
5. Evidence Integrity Monitoring
6. Governance Status Monitoring
7. Refresh Controller
8. Cache Layer
9. Security Filtering Layer

## Cache Rules

- Cache is never a source of truth.
- TTL expiration produces `STALE_REFRESHED` and re-reads the source.
- Forced and scheduled refresh bypass cache hits.
- SHA-256 source digests report cache/source consistency.

## Security

Sensitive keys for tokens, credentials, secrets, passwords, authorization, private keys and personal information are recursively removed before model creation.
