# V2 Managed-Run Lifecycle Complete Helper Implementation v0.1

Date: 2026-07-11
Status: Implementation output

## Purpose

Implement the minimal `managed-run-lifecycle` complete helper from
`docs/v2_minimal_managed_run_lifecycle_helper_contract_v0_1.md`.

Task/run:

- task: `task_v2_core_add_minimal_managed_run_lifecycle_complete_helper`
- run: `run_v2_core_add_minimal_managed_run_lifecycle_complete_helper`

## Changes

- Added `completeV2CoreManagedRunLifecycle` to
  `src/lib/server/v2-core-service.ts`.
- Added `managed-run-lifecycle --mode complete` to `scripts/v2-core-db.ts`.
- Added `agent-control --agent-action managed-run-lifecycle`.
- Added focused CLI smoke coverage for:
  - dry-run with no writes;
  - successful closeout through existing provider-run, artifact, review,
    decision, task transition, and follow-up operations;
  - agent-control dry-run readback;
  - duplicate/reuse refusal;
  - wrong task/run ownership refusal.

## Behavior

The helper sequences existing v2 operations:

1. preflight task/run/id checks;
2. complete provider run;
3. optionally record tool execution;
4. attach submitted artifact;
5. transition task to review;
6. record approved review;
7. record `accept_task_output` decision;
8. transition task to done using existing done-gate enforcement;
9. optionally create source-linked follow-up task.

`--dry-run` performs preflight and returns the planned operation list without
writing.

## Boundaries Preserved

This implementation did not add:

- schema;
- domain entity;
- lifecycle state;
- UI;
- scheduler;
- routing automation;
- local-model execution;
- automatic memory promotion.

It preserves existing review and acceptance gates.

## Validation

Passed:

- `npx vitest run src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`
- `npm run check`
- live dry-run against the real implementation task/run:
  `managed-run-lifecycle --dry-run`
