# V2 Remaining Preview Stack Disposition

Date: 2026-07-12

## Purpose

Classify the remaining untracked `v2-preview` and prototype smoke-test files
after commit `93f31cf` so they are not accidentally committed as a second v2
architecture.

This document does not authorize staging, deleting, moving, reverting, or
committing those files. It records what should happen next.

## Current State Checked

- `git diff --cached --name-only` is empty.
- `git status --short` shows only untracked preview/prototype files.
- Remaining untracked work is about 18.5k lines.
- Existing v2 core already has committed storage, service, CLI, import,
  operator-console, work-packet, search, route-comparison, routing-evidence,
  dependency-reduction report, evaluation, memory, tool, run, review, artifact,
  decision, source-reference, and snapshot capabilities.

## Disposition Summary

Do not commit the preview stack wholesale.

The preview stack is useful as evidence and as a source of implementation ideas,
but it overlaps with the accepted v2 core runtime and includes concepts that
the committed model docs mark as deferred, experimental, or preview-only.

## Remaining Path Groups

### Preview CLI and Database

Paths:

- `scripts/v2-preview-db.ts`
- `src/lib/server/v2-preview-persistence.ts`
- `src/lib/server/v2-preview-persistence.spec.ts`

Disposition: `archive-only`

Rationale:

- It creates a parallel CLI and `data/v2-preview.sqlite` runtime path.
- `v2-core-db.ts` and `v2-core-persistence.ts` now provide the committed v2
  core path.
- `v2-core-persistence.ts` explicitly refuses `data/v2-preview.sqlite`, so the
  systems are intentionally separate.

Next action:

- Do not port as files.
- If any guard behavior is missing from v2 core, create a narrow follow-up
  against `v2-core-persistence.ts` instead.

### Preview Import Scripts

Paths:

- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`

Disposition: `obsolete`

Rationale:

- The useful import foundation was already preserved in committed mapper,
  fixture, validator, SQLite proof, and direct core importer work.
- `scripts/v1-to-v2-core-import.ts` is now the migration path for accepted v2
  core records.

Next action:

- Do not port as files.
- Keep only as untracked evidence until the dirty tree is explicitly cleaned.

### Preview Work Loop Services

Paths:

- `src/lib/server/v2-preview-work-service.ts`
- `src/lib/server/v2-preview-work-service.spec.ts`
- `src/lib/server/v2-preview-execution-service.ts`
- `src/lib/server/v2-preview-execution-service.spec.ts`
- `src/lib/server/v2-preview-governance-service.ts`
- `src/lib/server/v2-preview-governance-service.spec.ts`
- `src/lib/server/v2-preview-artifact-service.ts`
- `src/lib/server/v2-preview-artifact-service.spec.ts`
- `src/lib/server/v2-preview-next-action.ts`
- `src/lib/server/v2-preview-next-action.spec.ts`
- `src/lib/server/v2-preview-work-packet.ts`
- `src/lib/server/v2-preview-work-packet.spec.ts`
- `src/lib/server/v2-preview-read-model.ts`
- `src/lib/server/v2-preview-read-model.spec.ts`
- `src/lib/server/v2-preview-report.ts`
- `src/lib/server/v2-preview-report.spec.ts`
- `src/lib/server/v2-preview-cli-work-loop-smoke.spec.ts`

Disposition: `archive-only`

Rationale:

- These files implement a full parallel work loop over preview tables.
- V2 core already has committed equivalents or replacements:
  - task/run/artifact/review/decision creation in `v2-core-service.ts`
  - next work in `readV2CoreNextWork`
  - operator console in `readV2CoreOperatorConsole`
  - work packet in `readV2CoreAgentWorkPacket`
  - CLI loop in `scripts/v2-core-db.ts`
  - smoke coverage in `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`
- Porting these wholesale would reintroduce the parallel architecture v2 was
  meant to avoid.

Next action:

- Do not port as files.
- If a specific preview behavior is better than v2 core behavior, create a
  focused comparison task that ports one behavior into v2 core with tests.

### Preview Tool, Evaluation, Search, and Memory Services

Paths:

- `src/lib/server/v2-preview-tool-service.ts`
- `src/lib/server/v2-preview-tool-service.spec.ts`
- `src/lib/server/v2-preview-evaluation-service.ts`
- `src/lib/server/v2-preview-evaluation-service.spec.ts`
- `src/lib/server/v2-preview-search.ts`
- `src/lib/server/v2-preview-search.spec.ts`
- `src/lib/server/v2-preview-memory-service.ts`
- `src/lib/server/v2-preview-memory-service.spec.ts`

Disposition: `port-to-v2-core selectively`

Rationale:

- These correspond to accepted first-slice v2 core concepts: `Tool`,
  `ToolExecution`, `EvaluationScenario`, `EvaluationResult`, `MemoryItem`, and
  local retrieval/search.
- V2 core already has minimal versions of these capabilities.
- The useful part is not the preview files themselves; it is any missing test
  case or edge behavior not already covered by v2 core.

Next action:

- Create focused audit tasks per capability:
  - compare preview tool tests against v2 core tool execution tests
  - compare preview evaluation tests against v2 core evaluation tests
  - compare preview search tests against v2 core search tests
  - compare preview memory tests against v2 core memory governance tests
- Port only missing behavior that supports accepted v2 core competency
  questions.

### Preview Routing and Dependency Reduction

Paths:

- `src/lib/server/v2-preview-routing-service.ts`
- `src/lib/server/v2-preview-routing-service.spec.ts`
- `src/lib/server/v2-preview-dependency-reduction-service.ts`
- `src/lib/server/v2-preview-dependency-reduction-service.spec.ts`

Disposition: `port-to-v2-core selectively through model governance`

Rationale:

- Existing docs mark `RoutingDecision` as preview-only and not accepted as a
  standalone production entity.
- Existing docs keep `DependencyReductionRecord` experimental and recommend
  splitting replacement state from source-linked evidence before production
  acceptance.
- V2 core already exposes route-comparison, routing-evidence, and
  dependency-reduction reports using accepted records.

Next action:

- Do not port schema or services directly.
- Create a model-change/design task only if v2 core needs stronger dependency
  reduction tracking than current reports provide.
- Any accepted routing evidence should attach to `Decision`,
  `EvaluationResult`, `Run`, or `ModelProvider` before inventing new entities.

### Preview Registry Proof

Paths:

- `src/lib/server/v2-preview-registry-service.ts`
- `src/lib/server/v2-preview-registry-service.spec.ts`

Disposition: `port-to-v2-core selectively through model governance`

Rationale:

- The registry proof extracts source labels for capabilities, tools, and
  models.
- `Capability`, `Skill`, and richer registry semantics remain deferred or
  governed concepts in the v2 core contract.
- The useful idea is source-label reconciliation, not the preview tables.

Next action:

- Do not port schema directly.
- If needed, create a design task for source-label reconciliation over existing
  `SourceReference`, `Tool`, `ModelProvider`, and evaluation records.

### Preview UI Route

Paths:

- `src/routes/app/v2-preview/+page.server.ts`
- `src/routes/app/v2-preview/+page.svelte`
- `src/routes/app/v2-preview/v2-preview-page.server.spec.ts`
- `src/routes/app/v2-preview/v2-preview-page.svelte.spec.ts`

Disposition: `obsolete`

Rationale:

- This route is a large interactive preview surface with write forms.
- V2 core now has `/app/v2-core` as the committed operator-console path.
- Keeping both would confuse the operator and future agents about which v2 is
  canonical.

Next action:

- Do not port as route files.
- If a useful display idea exists, create a focused `/app/v2-core` UI task.

### Prototype Agent Work Loop Smoke Spec

Path:

- `src/lib/server/agent-work-loop-smoke.spec.ts`

Disposition: `port-to-v2-core selectively`

Rationale:

- This spec tests the existing prototype control-plane readback loop, not the
  preview DB.
- It is useful regression evidence for concepts v2 core cares about:
  recommendation, task-loop report, work packet, run-result readback, review
  gates, approval gates, and goal progress.
- It is broad and tied to prototype types, so it should not be committed as-is.

Next action:

- Create a focused v2 core parity task that extracts any missing scenario from
  this smoke spec into `v2-core` tests.
- Do not keep the prototype builders and full control-plane object model inside
  v2 core tests unless directly required.

## Recommended Next Action

Create one small follow-up task:

`Port missing v2 core parity scenarios from preview/prototype smoke evidence`

Scope:

- Inspect existing v2 core tests.
- Compare only test scenarios, not implementation files.
- Add missing v2 core tests only if they cover accepted first-slice behavior.
- Do not port preview schema, preview route, preview CLI, or deferred concepts.

Candidate validation:

- `npx vitest run src/lib/server/v2-core-cli-work-loop-smoke.spec.ts --project server`
- Any newly added focused v2 core spec.

## Bloat Rules For Remaining Files

- Do not commit `src/routes/app/v2-preview/`.
- Do not commit `scripts/v2-preview-db.ts`.
- Do not commit preview schema or service files wholesale.
- Do not add `RoutingDecision`, `DependencyReductionRecord`, registry entries,
  source labels, capabilities, skills, or approvals to v2 core without a model
  change/design task.
- Prefer porting missing tests or behaviors into existing v2 core modules.
- Preserve the preview files as untracked evidence until an explicit cleanup
  task authorizes archiving or removal.
