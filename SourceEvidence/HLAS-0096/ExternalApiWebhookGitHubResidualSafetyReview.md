# HLAS-0096 — External API / Webhook / GitHub Integration Residual Safety Review

## Status

- Task: HLAS-0096
- Manager: 💬③_Coding_Manager_Chat_v2
- Execution class: NON-CODING / READ-ONLY EVIDENCE ACQUISITION
- Governance: HLAS Manager Responsibility Rule v2.2 — ACTIVE
- Operating rule: HLAS_전업무_공통운영규칙_v1.3 — ACTIVE
- Authoritative Project: 한살림 물류자동화 PMS
- Script ID: `1GJENGEJi552NEfyQDWsEqBCcRgpXEmiMBKDWGp31eQytUwsTM_MwK3TU`
- Spreadsheet ID: `1EwHI15jYSLvqyWR0768sO0ohM1H1aFcWXJWhWgfuATU`
- Timezone: Asia/Seoul
- Runtime: V8
- Runtime source of truth: actual Spreadsheet-bound Apps Script Project B

## Evidence boundary and limitation

Primary candidates reviewed:

1. `ApiAuthService.gs`
2. `ApiGatewayService.gs`
3. `IntegrationService.gs`
4. `WebhookService.gs`
5. `GitHubSyncService.gs`
6. `GitHubRecordController.gs`

Optional files inspected because direct linkage was proven:

7. `GitHubConfig.gs`
8. `Dialog_APIManager.html`

Bounded caller files were inspected only as necessary to prove reachability, including `UI.gs`, `Tests_ApiIntegrationTest.gs`, `HealthCheckService.gs`, `EventBusService.gs`, `SyncMenu.gs`, `GitHubTriggerService.gs`, and `RecordGenerator.gs`.

Fresh source evidence used for the candidate source bodies is `HLAS-0095-LIVE-READONLY.zip`, captured from Project B on 2026-08-22 before HLAS-0095 source deployment. HLAS-0095 later modified exactly seven unrelated files and did not include any HLAS-0096 candidate. This supports continuity but does **not** upgrade the candidate source evidence to `LIVE_RUNTIME`. Candidate source bodies in this record remain classified `PROJECT_B_RUNTIME_SNAPSHOT`.

No source, Runtime, Trigger, Spreadsheet, Drive Runtime data, ScriptProperties, webhook, external mutation, or GitHub Runtime data was modified or executed during HLAS-0096 evidence acquisition.

## Candidate 1 — ApiAuthService.gs

- Snapshot bytes: 3906
- Snapshot SHA-256: `37bc2ec4b549626ff17433dbe476f95db03e130bf5f391604de6e3c75f9fd138`
- Primary symbols: `issueApiKey`, `revokeApiKey`, `listApiKeys`, `authenticateApi`
- Fresh Source Evidence Classification: `PROJECT_B_RUNTIME_SNAPSHOT`
- Direct caller: `Dialog_APIManager.html` → `issueApiKey`; `Tests_ApiIntegrationTest.gs` → `issueApiKey` / `authenticateApi`; `ApiGatewayService.gs` → `authenticateApi`
- Bounded indirect caller: `onOpen` → menu `API Manager` → `showApiManager` → `Dialog_APIManager.html` → `issueApiKey`
- Global callable entry: YES
- Known Production caller: YES for `issueApiKey` through the menu/dialog path; no current Production caller found for `revokeApiKey`; `authenticateApi` is reached by `executeEndpoint`
- Menu reachability: YES
- onOpen/onEdit reachability: onOpen menu path YES; onEdit NO
- Trigger reachability: NOT FOUND
- Webhook reachability: NOT FOUND
- API entry reachability: no external `doGet` / `doPost` entry found; internal gateway authentication only
- Manual reachability: YES
- Called from active component: YES, API Manager UI for issuance
- Spreadsheet mutation: indirect audit on auth failure only if audit helper exists; no primary business-sheet mutation
- Drive mutation: NO
- GitHub mutation: NO
- Trigger mutation: NO
- ScriptProperties mutation: YES for issue/revoke; read for list/authenticate
- External HTTP GET/POST/PUT/PATCH/DELETE: NO
- Target identity / allowlist: API key record ID/property prefix scoped; no network target
- Authorization boundary: CREATE for issue, DELETE for revoke, READ for list; authentication verifies key status, SHA-256 secret hash, and expiry
- ProductionSafetyGuard interaction: NONE FOUND
- Automation lifecycle interaction: NONE FOUND
- Retry behavior: NONE
- Duplicate execution risk: repeated issue creates distinct key IDs; revoke is status update
- Timeout behavior: N/A
- Secret Dependency Classification: `SECRET_BACKED_BUT_NOT_EXPOSED`; stored secret is hashed. A newly issued credential is returned once to the authorized CREATE caller by design; actual credential values are not recorded in this evidence.
- Credential logging risk: no API secret logging found in this file
- Secret error exposure risk: low; auth errors are generic and do not return the secret
- Business necessity evidence: API key administration and gateway authentication
- Risk Classification: `MEDIUM_WATCH`
- Required Action: preserve permission gates and hashed-secret lifecycle; no source change established

## Candidate 2 — ApiGatewayService.gs

- Snapshot bytes: 8012
- Snapshot SHA-256: `64240b91699959129ff399754a523cef488a9a427a4cecc48586a97f1fed30f8`
- Primary symbols: `registerEndpoint`, `executeEndpoint`, `listEndpoints`, `disableEndpoint`, `generateOpenApiDocument`, `routeEndpoint_`
- Fresh Source Evidence Classification: `PROJECT_B_RUNTIME_SNAPSHOT`
- Direct caller: `Tests_ApiIntegrationTest.gs` → `registerEndpoint` / `executeEndpoint`; `Dialog_APIManager.html` → `listEndpoints` / `generateOpenApiDocument`; `HealthCheckService.gs` → `listEndpoints`
- Bounded indirect caller: onOpen → API Manager → Dialog for read/documentation operations
- Global callable entry: YES
- Known Production caller: UI/health for list/document generation; no Production caller found for `executeEndpoint`
- Menu reachability: YES for list/OpenAPI, not for `executeEndpoint`
- onOpen/onEdit reachability: onOpen UI path to list/doc YES; onEdit NO
- Trigger reachability: NOT FOUND
- Webhook reachability: NOT FOUND
- API entry reachability: external `doGet` / `doPost` NOT FOUND
- Manual reachability: YES
- Called from active component: YES for read paths; mutation gateway path not established as active Production caller
- Spreadsheet mutation: YES when `executeEndpoint` is invoked, via API log insert; route can also invoke FEATURE/FUNCTION/TASK CRUD
- Drive mutation: NO
- GitHub mutation: NO
- Trigger mutation: NO
- ScriptProperties mutation: YES for endpoint register/disable; endpoint reads for execution
- External HTTP: none directly
- Target identity / allowlist: entity/method endpoint registry and permission mapping; unsupported entity/method fails closed
- Authorization boundary: API authentication → rate limit → active endpoint lookup → endpoint permission check → route dispatch
- ProductionSafetyGuard interaction: NONE FOUND in gateway path
- Automation lifecycle interaction: NONE FOUND
- Retry behavior: NONE
- Duplicate execution risk: mutation methods can repeat if a caller repeats requests; no active public route was found
- Timeout behavior: N/A
- Secret Dependency Classification: `SECRET_BACKED_BUT_NOT_EXPOSED` via ApiAuthService
- Credential logging risk: API log stores only truncated key ID metadata, not secret
- Secret error exposure risk: gateway returns structured error; no secret reflection found
- Business necessity evidence: internal API abstraction and API Manager documentation/health support
- Risk Classification: `MEDIUM_WATCH`
- Required Action: no source change established; keep external/public route absent unless separately governed

## Candidate 3 — IntegrationService.gs

- Snapshot bytes: 3445
- Snapshot SHA-256: `bfbf3f2f562a80b3689e8c9a0ce778d0744d3a65e046f4ee79b6810ec8c698ab`
- Primary symbols: `registerIntegration`, `listIntegrations`, `testIntegration`, `restClientRequest_`
- Fresh Source Evidence Classification: `PROJECT_B_RUNTIME_SNAPSHOT`
- Direct caller: `Dialog_APIManager.html` → register/list; `HealthCheckService.gs` → list; `Tests_ApiIntegrationTest.gs` → register/test
- Bounded indirect caller: onOpen → API Manager → Integration Center → register/list
- Global callable entry: YES
- Known Production caller: register/list via UI; `testIntegration` Production caller NOT FOUND
- Menu reachability: YES for register/list, not test
- onOpen/onEdit reachability: onOpen UI path YES; onEdit NO
- Trigger reachability: NOT FOUND
- Webhook reachability: NOT FOUND
- API entry reachability: NOT FOUND
- Manual reachability: YES
- Called from active component: YES for configuration/list; test path not established as active Production caller
- Spreadsheet mutation: notification/audit helper only on errors if available; integration records themselves use ScriptProperties
- Drive mutation: NO
- GitHub mutation: NO
- Trigger mutation: NO
- ScriptProperties mutation: YES for registration; read for list/test
- External HTTP GET: YES, `testIntegration` uses GET
- External HTTP POST/PUT/PATCH/DELETE: NOT FOUND in current `testIntegration` path
- Target identity / allowlist: no target host allowlist found; registered `baseUrl` is caller supplied under CREATE permission
- Authorization boundary: CREATE permission on registration; no explicit permission guard found in `testIntegration` or `listIntegrations`
- ProductionSafetyGuard interaction: NONE FOUND
- Automation lifecycle interaction: NONE FOUND
- Retry behavior: NONE
- Duplicate execution risk: GET test may be repeated; no current mutating HTTP method found
- Timeout behavior: no explicit application timeout control found
- Secret Dependency Classification: `SAFE_METADATA_ONLY` in this source; no credential field handled
- Credential logging risk: none found
- Secret error exposure risk: errors propagate `e.message`; target URL may appear in notifications, but no secret field is handled
- Business necessity evidence: ERP/WMS/MES/Workspace/REST connection metadata and connectivity test
- Risk Classification: `MEDIUM_WATCH`
- Required Action: no source change established. If future test path adds mutating HTTP methods or a Production caller, re-review authorization/target restriction first.

## Candidate 4 — WebhookService.gs

- Snapshot bytes: 3686
- Snapshot SHA-256: `a7a0c7dfbbce0fd66f9ad2abcfa32fa6c1009c816d7c19afc7b2ed44ac4975fd`
- Primary symbols: `registerWebhook`, `listWebhooks`, `dispatchWebhooks`, `testWebhook`, `sendWebhook_`
- Fresh Source Evidence Classification: `PROJECT_B_RUNTIME_SNAPSHOT`
- Direct caller: `Dialog_APIManager.html` → register/list; `EventBusService.gs` → `dispatchWebhooks`; `Tests_ApiIntegrationTest.gs` → register/test/publish path
- Bounded indirect caller: onOpen → API Manager → Webhook Manager → register/list. EventBus `publish` → `dispatch` → `dispatchWebhooks`, but only test caller to `publish` was found in the bounded snapshot.
- Global callable entry: YES
- Known Production caller: register/list via UI; no active Production publisher/trigger/scheduler caller established for dispatch; testWebhook direct Production caller not found
- Menu reachability: YES for register/list, not dispatch/test
- onOpen/onEdit reachability: onOpen UI path YES; onEdit NO
- Trigger reachability: NOT FOUND
- Webhook reachability: outbound role; no inbound webhook endpoint found
- API entry reachability: NOT FOUND
- Manual reachability: YES
- Called from active component: configuration path YES; outbound dispatch active business caller NOT ESTABLISHED
- Spreadsheet mutation: YES — webhook registration insert and send result update
- Drive mutation: NO
- GitHub mutation: NO
- Trigger mutation: NO
- ScriptProperties mutation: NO
- External HTTP GET: possible only if stored METHOD is GET; not restricted by service
- External HTTP POST: YES, default method is POST
- External HTTP PUT/PATCH/DELETE: capability exists if stored METHOD is configured accordingly; no UI path was found that sets a non-default method, but service itself does not enforce a method allowlist
- Target identity / allowlist: no target URL allowlist found
- Authorization boundary: CREATE permission on register; READ on list; no explicit permission guard found on dispatch/test
- ProductionSafetyGuard interaction: NONE FOUND
- Automation lifecycle interaction: none established; no trigger/scheduler caller found
- Retry behavior: up to 3 attempts
- Duplicate execution risk: outbound side effects may repeat across retries if remote success occurs but response/error handling leads to retry
- Timeout behavior: no explicit application timeout control found
- Secret Dependency Classification: `SAFE_METADATA_ONLY`; no webhook secret/signature lifecycle found
- Credential logging risk: none found
- Secret error exposure risk: returned/stored error messages may include remote error text but no secret field is directly handled
- Business necessity evidence: registered outbound webhook dispatch from EventBus architecture
- Risk Classification: `MEDIUM_WATCH`
- Required Action: no High/Critical promotion because no active Production dispatch caller was established. Future activation should require target/method authorization and duplicate-delivery semantics review.

## Candidate 5 — GitHubSyncService.gs

- Snapshot bytes: 6741
- Snapshot SHA-256: `2643d1fbe4fbfa0355e6d4b55ae3ace8b731b4c9fc4f389efa8202d3c8c1e0ef`
- Primary symbols: `getSnapshot`, `verifyStorageCapability`, `getFile`, `getRepositoryInfo`, `commitAtomic`, `saveContent`, `_request`
- Fresh Source Evidence Classification: `PROJECT_B_RUNTIME_SNAPSHOT`
- Direct caller: `GitHubRecordController.gs` uses verify/getSnapshot/commitAtomic/saveContent; `SyncMenu.gs` uses verify; test files use read functions
- Bounded indirect caller: onOpen → `SyncMenu.install` → manual `saveGitHubOfficialRecord` → `GitHubRecordController.execute` → GitHubSyncService; legacy GitHubTriggerService can call controller but HLAS-0090 blocks trigger installation and classifies the handler without a Production owner
- Global callable entry: object methods are manually callable
- Known Production caller: YES — explicit manual menu storage path. No active background automation authority established.
- Menu reachability: YES, manual
- onOpen/onEdit reachability: onOpen installs menu; no direct onEdit entry
- Trigger reachability: legacy `githubAutoSaveTrigger` source path exists, but installation is guarded/prohibited by HLAS-0090; not an authorized Production automation owner
- Webhook/API entry reachability: NOT FOUND
- Manual reachability: YES
- Called from active component: YES, manual GitHub official record menu
- Spreadsheet mutation: NO primary business mutation
- Drive mutation: NO
- GitHub mutation: YES — create/update file via GitHub Contents API PUT; `commitAtomic` may save record and CHANGELOG
- Trigger mutation: NO inside this service
- ScriptProperties mutation: NO; reads configuration/token via GitHubConfig
- External HTTP GET: YES
- External HTTP PUT: YES
- External HTTP POST/PATCH/DELETE: NOT FOUND
- Target identity / allowlist: repository/branch from GitHubConfig runtime metadata; file paths are validated through GitHubConfig on controller/RecordGenerator paths
- Authorization boundary: no direct `assertPermission_` or ProductionSafetyGuard call inside GitHubSyncService; authority is inherited from bounded caller workflow/configuration. This service capability alone is not Production write authority.
- ProductionSafetyGuard interaction: none directly; HLAS-0090 protects legacy automation owner/installation at GitHubTriggerService/automation governance layer
- Automation lifecycle interaction: legacy GitHub autosave = `NO_PRODUCTION_OWNER` / inactive-prohibited under HLAS-0090
- Retry behavior: `saveContent` retries only GitHub 409 conflicts, maximum 3 attempts, 1 second sleep
- Duplicate execution risk: bounded to retry model; create/update Contents API requests can produce additional commits if repeatedly invoked by a caller
- Timeout behavior: no explicit application timeout setting found
- Secret Dependency Classification: `SECRET_BACKED_BUT_NOT_EXPOSED`; GitHub token sourced from ScriptProperties
- Credential logging risk: token is sent only in Authorization header; no token logger found
- Secret error exposure risk: GitHub response text is included in thrown errors; Authorization header/token itself is not returned
- Business necessity evidence: manual official-record and CHANGELOG storage
- Risk Classification: `MEDIUM_WATCH`
- Required Action: preserve HLAS-0090 automation prohibition and manual-only authority; no source change established

## Candidate 6 — GitHubRecordController.gs

- Snapshot bytes: 11721
- Snapshot SHA-256: `5a5811d302641e0ead6769a488b61704a83537154ab0b75875333a97f5d7f930`
- Primary symbols: `execute`, `_executeOfficialRecord`, request/credential validation helpers
- Fresh Source Evidence Classification: `PROJECT_B_RUNTIME_SNAPSHOT`
- Direct caller: `SyncMenu.gs`, official-storage wrappers, tests, ChangeDetector/SheetRecordSyncController legacy paths, GitHubTriggerService legacy path
- Bounded indirect caller: onOpen → SyncMenu manual menu → `saveGitHubOfficialRecord` → `execute`; legacy trigger chain exists in source but HLAS-0090 prevents authorized Production installation/ownership
- Global callable entry: YES through object method and wrapper functions
- Known Production caller: YES — manual menu storage path
- Menu reachability: YES
- onOpen/onEdit reachability: onOpen installs manual menu; no active onEdit GitHub path established
- Trigger reachability: legacy source caller exists but automation activation is prohibited by HLAS-0090
- Webhook/API entry reachability: NOT FOUND
- Manual reachability: YES
- Called from active component: YES, manual official record workflow
- Spreadsheet mutation: Revision Registry may update after successful generic record commit when businessKey is used; not a bulk/destructive Spreadsheet path
- Drive mutation: NO
- GitHub mutation: YES through GitHubSyncService
- Trigger mutation: NO
- ScriptProperties mutation: indirect only through Revision Registry if that implementation uses properties; not established in this bounded source
- External HTTP GET/PUT: indirect through GitHubSyncService
- External HTTP POST/PATCH/DELETE: not established
- Target identity / allowlist: `GitHubConfig.validatePath` enforces allowed path prefixes. Runtime owner/repository/branch come from GitHubConfig.
- Authorization boundary: controller validates input/path/revision; no `assertPermission_` or direct ProductionSafetyGuard gate found. Manual UI invocation supplies the current Production entry boundary.
- ProductionSafetyGuard interaction: none directly; automation safety is enforced upstream at legacy trigger lifecycle boundary
- Automation lifecycle interaction: HLAS-0090 must remain preserved
- Retry behavior: inherited GitHubSyncService bounded 409 retry
- Duplicate execution risk: repeated manual invocation can generate additional commits; revision-forward checks reduce accidental stale official record writes
- Timeout behavior: inherited UrlFetchApp behavior; no explicit application timeout
- Secret Dependency Classification: `SECRET_BACKED_BUT_NOT_EXPOSED` through GitHubSyncService/GitHubConfig
- Credential logging risk: generic workflow logs `RecordGenerator.validateInput` output after sanitization; official record path blocks credential-like content. No token value logging found.
- Secret error exposure risk: errors can include GitHub response body but not Authorization header/token
- Business necessity evidence: manual official HLAS record storage and revisioned record workflow
- Risk Classification: `MEDIUM_WATCH`
- Required Action: preserve manual-only authority, path validation, credential filtering, and HLAS-0090 automation prohibition; no source change established

## Optional — GitHubConfig.gs

- Inspected: YES
- Reason: directly referenced by GitHubSyncService and GitHubRecordController
- Snapshot bytes: 4462
- Snapshot SHA-256: `79420bb45570c34a128915a6a3de5531783f75661bf2b49b6896cae589feefce`
- Configuration source: ScriptProperties with bounded defaults
- Repository identity handling: owner/repository from ScriptProperties or defaults
- Branch identity handling: branch from ScriptProperties or default `main`
- Path allowlist: fixed default prefixes (`Docs/`, `Architecture/`, `QA/`, `Evidence/`, `Records/`)
- Secret-source classification: `SECRET_BACKED_BUT_NOT_EXPOSED`; token read from ScriptProperties, value not recorded here

## Optional — Dialog_APIManager.html

- Inspected: YES
- Reason: directly invokes ApiAuthService / IntegrationService / WebhookService public functions
- Snapshot bytes: 3188
- Snapshot SHA-256: `283ce5b18a903500992c4e9c93dfeef459d450ad8b22886aaf4d19e5fa7a4080`
- UI reachability: onOpen → API Manager → `showApiManager` → Dialog
- Production mutation entry: YES for permission-gated API key issuance, integration registration, and webhook registration
- Not exposed from this dialog: `executeEndpoint`, `testIntegration`, `dispatchWebhooks`, `testWebhook`, revoke key, disable endpoint, GitHub mutation functions
- No UI modification or activation performed

## Risk summary

- Critical: NONE CONFIRMED
- High: NONE CONFIRMED
- Medium Watch: `ApiAuthService`, `ApiGatewayService`, `IntegrationService`, `WebhookService`, `GitHubSyncService`, `GitHubRecordController`
- Fail-Closed: unsupported ApiGateway endpoint/method and invalid/unauthorized API credential paths; HLAS-0090 legacy GitHub automation installation path
- Low / Passive: none assigned for the six primary candidates
- Unreachable: none assigned globally because all six contain manual/global callable capability; specific mutation routes without Production callers are documented above
- Evidence Required: **LIVE_RUNTIME source-byte confirmation remains not independently available for the six candidate source bodies.** This is an evidence-classification limitation, not a confirmed defect.

## Mutation statement

During HLAS-0096 evidence acquisition:

- Runtime Source Mutation: 0
- Production Function Execution: 0
- External Mutation: 0
- GitHub Runtime Mutation: 0
- Trigger Mutation: 0
- Spreadsheet Mutation: 0
- Drive Runtime Mutation: 0
- ScriptProperties Mutation: 0
- Retention Execution: 0

The GitHub commit storing this non-coding evidence record is repository evidence administration by 💬③ and is not a Production Runtime GitHub mutation by the reviewed Apps Script candidates.

## Implementation decision

- Source Change Required: NO — NOT ESTABLISHED
- Runtime Logic Change Required: NO — NOT ESTABLISHED
- Test Code Change Required: NO
- Runtime Instrumentation Required: NO
- NON-CODING Evidence Storage Required: YES
- ④ Coding Invocation: SKIP

## Protection status

- HLAS-0087: PASS / PRESERVE
- HLAS-0088: PASS / PRESERVE
- HLAS-0090: PASS / PRESERVE
- HLAS-0095: PASS / CLOSED / PRESERVE
- Retention: PASS / PROTECTED_ACTIVE / NOT EXECUTED
- Security: PASS WITH WATCH ITEMS; no credential values exposed by this evidence record
- Performance: PASS; no runtime instrumentation added

## ③ decision

`PASS` for bounded non-coding evidence acquisition and classification.

No Critical/High source defect was established. No coding invocation is authorized or required by current evidence. Candidate source bodies remain `PROJECT_B_RUNTIME_SNAPSHOT`, not `LIVE_RUNTIME`; this limitation must be preserved for ① final closure judgment.
