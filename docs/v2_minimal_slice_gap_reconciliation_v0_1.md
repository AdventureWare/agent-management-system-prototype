# V2 Minimal Slice Gap Reconciliation v0.1

Date: 2026-07-10
Status: Gap reconciliation

## Purpose

Close or explicitly defer the small gaps identified in
`docs/v2_minimal_slice_completion_assessment_v0_1.md` so the first v2 core
minimal slice can be judged against the actual implemented boundary.

## Evidence Inspected

- `docs/v2_minimal_slice_completion_assessment_v0_1.md`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `src/lib/server/v2-core-persistence.ts`
- `src/lib/server/v2-core-service.ts`
- `scripts/v2-core-db.ts`
- `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`
- live `inspect-task` readback for `task_v2_core_reconcile_minimal_slice_exit_gaps`

## Reconciled Items

### Task Dependency Proof

Status: closed.

What changed:

- Added `recordV2CoreTaskDependency`.
- Added CLI command `record-task-dependency`.
- Added `--depends-on <id>` option.
- Added dependency readback to `inspect-task` / `V2CoreTaskDetail`.
- Added smoke coverage for dependency creation, duplicate rejection, task detail
  readback, snapshot count, and imported snapshot readback.
- Dogfooded one live resolved dependency:
  `task_dependency_v2_core_reconcile_after_assessment`.

Boundary:

- This proves a prerequisite relation. It does not add scheduling, dependency
  graph planning, automatic blocker propagation, or a milestone abstraction.

### Retrieval Wording

Status: reconciled as first-slice context retrieval.

Decision:

- The first v2 core slice treats `context-bundle` and `agent-work-packet` as
  the source-linked context retrieval surfaces.
- No standalone broad search/retrieval command was added.

Reason:

- The current milestone needs bounded task context, not general search.
- Broad retrieval remains a later capability after the state model is stable.

### WorkSession

Status: explicitly deferred.

Decision:

- `Run` carries concrete execution evidence for the first v2 core slice.
- `WorkSession` remains an accepted ontology concept but not first-slice
  persistence.

Reason:

- The current system can answer what work happened and what provider/tool/artifact
  evidence resulted without a separate session/thread entity.

### Approval

Status: substituted for first slice.

Decision:

- Approved `Review` plus `accept_task_output` `Decision` is the first-slice
  approval substitute.
- Standalone `Approval` remains deferred.

Reason:

- The current closeout gate is explicit and tested. Adding a separate approval
  entity now would duplicate the existing review/decision path.

### Model Registry

Status: deferred.

Decision:

- First-slice model evidence is provider linkage plus result-level model label.
- A model registry is deferred until routing or model comparison creates a real
  workflow need.

### Execution Surfaces

Status: deferred.

Decision:

- Execution surfaces remain out of the first v2 core slice.
- Tool executions and runs provide enough execution evidence for current work.

### Dependency-Reduction Records

Status: computed report first.

Decision:

- Dependency reduction is a report over existing evidence, not a persisted
  lifecycle entity.

Reason:

- The current need is to answer which external AI dependency remains or is a
  candidate for owned workflow replacement. Persisted records can wait until
  report evidence shows a repeated decision workflow.

## Updated Source Documents

- `docs/v2_minimal_vertical_slice_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`

The docs now distinguish:

- first-slice persisted records
- computed read models
- deferred/substituted ontology concepts

## Validation

Passed:

- `npx vitest run src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`
- `npm run check`

Live dogfood:

- `task_v2_core_reconcile_minimal_slice_exit_gaps` now has a resolved
  dependency on `task_v2_core_assess_minimal_slice_completion`.

## Verdict

The specific gaps identified in the completion assessment are reconciled.

It is now reasonable to treat the first v2 core minimal slice as complete
against the reconciled first-slice boundary.

## Next Step

Create one planning task:

`task_v2_core_choose_next_milestone_after_minimal_slice`

Purpose:

- choose the next milestone after the first v2 core minimal slice
- compare options against the larger owned-agent goal
- avoid automatically defaulting to UI, routing, broad retrieval, local model
  work, or more governance
