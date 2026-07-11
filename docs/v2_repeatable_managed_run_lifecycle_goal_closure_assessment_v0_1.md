# V2 Repeatable Managed-Run Lifecycle Goal Closure Assessment v0.1

Date: 2026-07-11
Status: Closure assessment

## Purpose

Assess whether `goal_ams_v2_repeatable_managed_run_lifecycle` is satisfied
after the helper contract, implementation, validation, live dry-run, and
dogfood closeout.

Task/run:

- task: `task_v2_core_assess_repeatable_managed_run_lifecycle_goal_closure`

## Evidence Reviewed

- `docs/v2_minimal_managed_run_lifecycle_helper_contract_v0_1.md`
- `docs/v2_managed_run_lifecycle_complete_helper_implementation_v0_1.md`
- `inspect-task --task task_v2_core_design_minimal_managed_run_lifecycle_helper`
- `inspect-task --task task_v2_core_add_minimal_managed_run_lifecycle_complete_helper`
- `operator-console --project project_ams_v2_core`
- `next-work --project project_ams_v2_core`
- trusted memory item:
  `memory_v2_core_managed_run_lifecycle_complete_helper`
- validation commands recorded on the implementation task:
  - `npx vitest run src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`
  - `npm run check`
  - live `managed-run-lifecycle --dry-run`

## Findings

The repeatable managed-run lifecycle goal is satisfied at the intended scope.

The goal was not to build a scheduler, orchestrator, router, UI, or workflow
engine. It was to reduce the repeated provider-run/task-closeout choreography
that made agents likely to skip evidence, review, acceptance, or task closure
steps.

That gap is now addressed:

- `managed-run-lifecycle --mode complete` exists as a CLI surface;
- `agent-control --agent-action managed-run-lifecycle` exists for agent use;
- dry-run validates the closeout and returns planned operations without
  writing;
- the helper uses existing v2 records and lifecycle gates;
- the helper completed its own implementation task as a live dogfood proof;
- focused smoke tests cover dry-run, success, agent-control readback,
  duplicate/reuse refusal, and wrong task/run ownership refusal;
- `npm run check` passed with no errors or warnings;
- trusted memory was promoted from the approved implementation review.

## What Was Not Added

No new:

- schema;
- domain entity;
- lifecycle state;
- UI;
- scheduler;
- routing automation;
- local-model runtime;
- workflow registry;
- memory-promotion automation.

This matters. The improvement is an ergonomic helper over the existing ontology,
not another management layer.

## Remaining Gaps

The helper does not yet implement:

- `prepare` mode;
- `fail` mode;
- provider transcript import;
- abandoned-run recovery;
- richer in-app UI affordances;
- automatic artifact discovery;
- automatic review or memory promotion.

These are acceptable omissions. They should not block closing this milestone
because the accepted goal was to make normal successful managed-run closeout
repeatable. Future gaps should be justified by repeated use, not anticipated
complexity.

## Closure Recommendation

Recommendation: close `goal_ams_v2_repeatable_managed_run_lifecycle` as
`completed` after this assessment is accepted.

Reason:

- the helper contract was accepted;
- the implementation met the contract;
- the implementation was validated with tests, project check, dry-run, and
  dogfood use;
- current operator-console shows this closure-assessment task as the only open
  work under the goal;
- no further narrow follow-up is required before moving on.

## Next Work After Closure

After closure, select the next AMS v2 implementation milestone from the current
project state.

Likely candidates to compare:

- use the new lifecycle helper on one more real task to observe friction;
- create a small route/provider dependency assessment now that closeout is
  easier;
- improve local retrieval/context quality if agents still need too much manual
  repo inspection;
- defer UI, scheduler, local-model runtime, and workflow-entity work unless
  evidence makes one of them the bottleneck.

Do not continue adding lifecycle-helper features by inertia.
