# HLAS-0076 Runtime and Integration Evidence

Run:

`node SourceEvidence/HLAS-0076/tests/validate-dashboard.mjs`

The test runner generates these measured artifacts from the same execution:

- `examples/generated-dashboard-model.json`
- `examples/test-result.json`
- `ValidationResult.md`

The implementation uses only Node.js standard modules. The adapter exposes `read()` only, freezes returned source data, filters sensitive metadata, and never writes governance records.
