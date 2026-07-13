# V2 Preview Leftover Cleanup Sequence

Date: 2026-07-13

## Purpose

Resolve the remaining untracked `v2-preview` and prototype smoke-test files
without accidentally committing a second v2 architecture or deleting useful
evidence.

This plan is a cleanup sequence only. It does not authorize deleting, moving,
staging, or committing preview/prototype source files.

## Current Inventory

Checked with:

- `git status --short`
- `git ls-files --others --exclude-standard`
- representative reads of the preview CLI, preview services, preview UI route,
  preview memory/tool tests, and prototype work-loop smoke test
- `docs/v2_remaining_preview_stack_disposition_v0_1.md`

The dirty tree currently consists of untracked preview/prototype leftovers:

- 3 preview/import scripts
- 35 server-side preview/prototype service or spec files
- 4 `src/routes/app/v2-preview` route/spec files

The sampled files confirm this is not a small scratch pad. It is a full
parallel preview stack: CLI, persistence, work-loop services, governance,
artifact handling, memory, tools, evaluation, retrieval, routing, dependency
reduction, registry proof, report/read models, and an interactive preview UI.

## Cleanup Principles

- Do not commit the preview stack wholesale.
- Do not delete or move untracked files without explicit operator approval.
- Preserve evidence before any destructive cleanup.
- Port behavior only through focused v2 core tasks with tests.
- Do not create new v2 core entities, tables, or lifecycle states from preview
  code without model-governance approval.
- Prefer a committed manifest/assessment of preview evidence over committing
  obsolete source files.
- Keep each cleanup step independently reviewable.

## Path Groups And Actions

### Archive-Only: Preview CLI And Database

Paths:

- `scripts/v2-preview-db.ts`
- `src/lib/server/v2-preview-persistence.ts`
- `src/lib/server/v2-preview-persistence.spec.ts`

Recommended action:

- Preserve their existence and purpose in a committed archival manifest.
- Do not port files.
- Do not keep `data/v2-preview.sqlite` as a supported runtime path.

Approval requirement:

- Operator approval required before deleting or moving these files.

Reason:

- They implement a parallel preview database/CLI. V2 core already has the
  committed path in `scripts/v2-core-db.ts` and v2 core persistence.

### Obsolete: Preview Import Scripts

Paths:

- `scripts/v1-to-v2-import-preview.mjs`
- `scripts/v1-to-v2-slice-fixture.mjs`

Recommended action:

- Preserve as archival evidence only.
- Do not port as scripts.
- If needed, compare one narrow importer behavior against
  `scripts/v1-to-v2-core-import.ts` in a future task.

Approval requirement:

- Operator approval required before deleting or moving these files.

Reason:

- The accepted migration path is the v2 core importer and committed fixture
  foundation, not the preview importer.

### Archive-Only: Preview Work Loop Services

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

Recommended action:

- Preserve as archive-only evidence.
- Do not port services or tests wholesale.
- If a specific behavior is missing from v2 core, create a focused task against
  v2 core and cite the exact preview test/file.

Approval requirement:

- Operator approval required before deleting or moving these files.

Reason:

- V2 core already has committed services/read models for task detail, next
  work, context bundles, agent work packets, operator console, run/artifact/
  review/decision handling, and CLI work-loop coverage.

### Selective-Port Candidates: Tool, Evaluation, Search, Memory

Paths:

- `src/lib/server/v2-preview-tool-service.ts`
- `src/lib/server/v2-preview-tool-service.spec.ts`
- `src/lib/server/v2-preview-evaluation-service.ts`
- `src/lib/server/v2-preview-evaluation-service.spec.ts`
- `src/lib/server/v2-preview-search.ts`
- `src/lib/server/v2-preview-search.spec.ts`
- `src/lib/server/v2-preview-memory-service.ts`
- `src/lib/server/v2-preview-memory-service.spec.ts`

Recommended action:

- Run one focused parity audit before cleanup:
  compare preview tests against committed v2 core tests/behavior for tool
  execution, evaluation evidence, local retrieval, and memory governance.
- Port only missing accepted behavior, not preview table shapes or service
  names.
- After the parity audit, reclassify remaining files as archive-only.

Approval requirement:

- No operator approval needed for read-only parity audit docs or v2 core test
  additions within an approved implementation task.
- Operator approval required before deleting or moving the preview files.

Reason:

- These areas map to accepted v2 core capabilities, but v2 core already has
  minimal implementations. The risk is losing useful edge-case tests, not losing
  production code.

### Governance-Required Selective-Port Candidates: Routing And Dependency Reduction

Paths:

- `src/lib/server/v2-preview-routing-service.ts`
- `src/lib/server/v2-preview-routing-service.spec.ts`
- `src/lib/server/v2-preview-dependency-reduction-service.ts`
- `src/lib/server/v2-preview-dependency-reduction-service.spec.ts`

Recommended action:

- Do not port schema or services directly.
- Compare only for missing report/evidence behavior.
- If stronger production semantics are needed, create a model-change/design
  task before implementation.

Approval requirement:

- Model-governance approval required before promoting preview routing or
  dependency-reduction concepts into accepted v2 core schema.
- Operator approval required before deleting or moving the preview files.

Reason:

- Prior design docs treat standalone routing-decision and dependency-reduction
  records as preview/experimental, not settled ontology.

### Governance-Required Selective-Port Candidate: Registry Proof

Paths:

- `src/lib/server/v2-preview-registry-service.ts`
- `src/lib/server/v2-preview-registry-service.spec.ts`

Recommended action:

- Do not port registry tables or service directly.
- Preserve the source-label reconciliation idea as an archival note.
- Revisit only if source-label reconciliation becomes a concrete v2 core
  workflow problem.

Approval requirement:

- Model-governance approval required before adding registry semantics beyond
  existing `SourceReference`, `Tool`, `ModelProvider`, and evaluation records.
- Operator approval required before deleting or moving the preview files.

Reason:

- Registry semantics can easily become another parallel ontology if promoted
  prematurely.

### Obsolete: Preview UI Route

Paths:

- `src/routes/app/v2-preview/+page.server.ts`
- `src/routes/app/v2-preview/+page.svelte`
- `src/routes/app/v2-preview/v2-preview-page.server.spec.ts`
- `src/routes/app/v2-preview/v2-preview-page.svelte.spec.ts`

Recommended action:

- Do not port route files.
- If a useful display idea exists, create a focused task against
  `/app/v2-core`.
- Otherwise preserve in archive manifest only.

Approval requirement:

- Operator approval required before deleting or moving these files.

Reason:

- `/app/v2-core` is the committed operator-console route. Keeping
  `/app/v2-preview` would confuse future agents about canonical v2.

### Selective-Port Candidate: Prototype Work-Loop Smoke Spec

Path:

- `src/lib/server/agent-work-loop-smoke.spec.ts`

Recommended action:

- Run a focused parity audit against committed v2 core work-loop tests.
- Extract only missing scenarios that support the accepted v2 loop:
  recommendation, task-loop readback, bounded work packet, run-result readback,
  review/approval gates, and goal progress.
- Do not port prototype object builders or the full v1 control-plane shape.

Approval requirement:

- No operator approval needed for a read-only parity audit.
- Operator approval required before deleting or moving this untracked file.

Reason:

- The spec is useful evidence, but it is broad and tied to prototype types.

## Proposed Sequence

1. Commit this cleanup sequence document.
2. Create one follow-up task:
   `Audit preview/prototype parity evidence before cleanup`.
3. In that task, compare only the selective-port candidate tests against v2
   core behavior and produce a short parity matrix.
4. Port any missing accepted behavior through separate focused implementation
   tasks, only if the parity matrix finds real gaps.
5. After parity is accounted for, ask the operator for explicit approval to
   either:
   - delete the remaining untracked preview/prototype files, or
   - move them into an ignored local archive path.
6. Run `git status --short` and verify only intentional tracked files remain
   dirty.

## Proposed First Safe Cleanup Action

First follow-up task:

`Audit preview/prototype parity evidence before cleanup`

Scope:

- Read-only comparison of selective-port candidate preview/prototype tests
  against committed v2 core behavior.
- Produce a parity matrix document.
- Create focused implementation tasks only for missing accepted behavior.
- Do not delete, move, stage, or commit preview/prototype files.

Why this is first:

- It preserves useful evidence before destructive cleanup.
- It does not legitimize the preview stack as production code.
- It reduces the risk of losing edge-case behavior while still moving toward a
  clean tree.

## Explicit Non-Actions

- Do not commit `scripts/v2-preview-db.ts`.
- Do not commit `src/lib/server/v2-preview-*` files wholesale.
- Do not commit `src/routes/app/v2-preview`.
- Do not revive `data/v2-preview.sqlite`.
- Do not create a second v2 runtime path.
- Do not add model routing or dependency-reduction schema from preview code.
- Do not convert archive-only files into production services.
- Do not clean the dirty tree with `git clean`, `rm`, or broad shell deletion
  without explicit operator approval.

## Validation

- `git status --short` confirmed only untracked preview/prototype leftovers
  before this document was created.
- `git ls-files --others --exclude-standard` listed the same leftover groups.
- Representative preview/prototype files were inspected directly.
- The plan matches and narrows
  `docs/v2_remaining_preview_stack_disposition_v0_1.md`.
