# V2 Minimal Managed-Run Lifecycle Helper Contract v0.1

Date: 2026-07-10
Status: Implementation contract

## Purpose

Define the smallest helper that reduces repeated AMS v2 task/run closeout
choreography while preserving the existing domain model, review gate, acceptance
gate, and source-linked readbacks.

This document is a contract for the next implementation task. It does not
implement the helper.

Task/run:

- task: `task_v2_core_design_minimal_managed_run_lifecycle_helper`
- run: `run_v2_core_design_minimal_managed_run_lifecycle_helper`

## Problem

The current v2 loop works, but a normal managed provider-backed task still
requires an agent to remember and manually sequence many operations:

1. launch provider run;
2. complete provider run;
3. attach artifact;
4. record validation/tool evidence;
5. transition task to review;
6. record review;
7. record `accept_task_output`;
8. transition task to done;
9. optionally create follow-up work.

This is enough friction that future agents are likely to skip steps, duplicate
records, or leave tasks half-closed.

## Existing Operations To Reuse

| Step | Existing operation |
| --- | --- |
| Select next work | `next-work`, `agent-control --agent-action next` |
| Build context | `agent-work-packet`, `agent-control --agent-action packet` |
| Start provider run | `launch-provider-run`, `agent-control --agent-action launch-provider-run` |
| Complete provider run | `complete-provider-run`, `agent-control --agent-action complete-provider-run` |
| Attach artifact | `attach-artifact`, `agent-control --agent-action attach-artifact` |
| Record validation/tool evidence | `record-tool-execution`, `agent-control --agent-action record-tool` |
| Move to review | `transition-task --status review`, `agent-control --agent-action submit-review` |
| Record review | `record-review` |
| Accept output | `record-decision --type accept_task_output`, `agent-control --agent-action accept-output` |
| Close task | `transition-task --status done`, already enforced by `accept-output` |
| Create follow-up | `create-followup-task`, `agent-control --agent-action follow-up` |
| Read back state | `inspect-task`, `operator-console`, `unreviewed-outputs` |

The helper must call these existing service functions or CLI command paths. It
must not create new tables, statuses, entities, or lifecycle rules.

## Recommended Helper Surface

Add one CLI command:

`managed-run-lifecycle`

Add one matching agent-control action:

`agent-control --agent-action managed-run-lifecycle`

Both should use the same underlying service function.

## Modes

### 1. `prepare`

Purpose: start a provider-backed task run and return the work packet.

Required inputs:

- `--task <taskId>`
- `--run <runId>`
- `--provider <providerId>`

Optional inputs:

- `--id <decisionId>`
- `--input <summary>`
- `--action <summary>`

Behavior:

- verifies task exists;
- verifies task status is `ready` or `in_progress`;
- calls `launchV2CoreProviderRun`;
- returns task detail and agent work packet.

This mode already exists conceptually as `launch-provider-run`; implementing it
inside the helper is optional. The real value is the closeout mode below.

### 2. `complete`

Purpose: close the common provider-backed task lifecycle with one command while
still recording each existing evidence record separately.

Required inputs:

- `--task <taskId>`
- `--run <runId>`
- `--artifact <artifactId>`
- `--uri <artifactUri>`
- `--title <artifactTitle>`
- `--result <runResultSummary>`
- `--validation <validationSummary>`
- `--review <reviewId>`
- `--decision <acceptDecisionId>` or `--id <acceptDecisionId>`

Optional inputs:

- `--tool-execution <toolExecutionId>`
- `--tool <toolId>`
- `--input <toolInputSummary>`
- `--summary <artifactOrReviewSummary>`
- `--rationale <acceptanceRationale>`
- `--followup-task <taskId>`
- `--followup-title <title>`
- `--followup-success <successCriteria>`
- `--followup-validation <validationPlan>`
- `--followup-rationale <reason>`
- `--dry-run`

Behavior:

1. Preflight read:
   - read task detail;
   - verify the run belongs to the task;
   - verify run status is `planned`;
   - verify task status is `in_progress`;
   - verify artifact id, review id, decision id, and optional follow-up id do
     not already exist.

2. Complete provider run:
   - call `completeV2CoreProviderRun` with status `completed`;
   - use `--result` and `--validation` for the run summaries.

3. Optionally record tool validation:
   - if `--tool-execution` is supplied, require `--tool` and `--input`;
   - call `recordV2CoreToolExecution`.

4. Attach artifact:
   - call `attachV2CoreArtifact`;
   - set role to `deliverable` unless an explicit role is supplied;
   - artifact starts as `submitted`.

5. Submit task for review:
   - call `transitionV2CoreTaskStatus` to `review`.

6. Record approved review:
   - call `recordV2CoreReview`;
   - link it to the run and artifact;
   - default status is `approved`.

7. Record acceptance:
   - call `recordV2CoreDecision` with `decisionType = accept_task_output`;
   - link it to task, run, and review.

8. Close task:
   - call `transitionV2CoreTaskStatus` to `done`;
   - rely on existing `assertTaskCanCloseDone` to enforce approved review plus
     acceptance decision.

9. Optionally create follow-up:
   - only if all follow-up inputs are supplied;
   - call `createV2CoreFollowupTask`;
   - default follow-up status is `ready`.

10. Final readback:
    - return `inspect-task`-equivalent task detail;
    - include the ids of every record created;
    - include a compact `operator-console`/`next-work` readback only if the
      implementation can do that without broadening the helper.

### 3. `fail`

Purpose: record a failed provider run without pretending output is reviewable.

Required inputs:

- `--task <taskId>`
- `--run <runId>`
- `--result <failureSummary>`
- `--validation <failureValidationSummary>`

Optional inputs:

- `--blocked-summary <summary>`
- `--dry-run`

Behavior:

- call `completeV2CoreProviderRun` with status `failed`;
- do not attach artifact by default;
- do not record approved review;
- do not record `accept_task_output`;
- do not move task to `done`;
- optionally transition task to `blocked` if `--blocked-summary` is supplied;
- return task detail.

## Dry-Run Contract

`--dry-run` must perform validation and return the planned operation list
without writing.

The dry-run output should include:

- task id;
- run id;
- current task status;
- current run status;
- planned operations in order;
- missing required inputs;
- id collisions;
- gate warnings;
- whether `done` would be allowed after the planned review and acceptance
  records.

Dry-run is required for `complete` and `fail`. It is optional for `prepare`.

## Atomicity

The implementation should use one transaction for `complete` after preflight.

Reason: a helper that reduces choreography should not create a new half-closed
state if step seven succeeds and step eight fails.

If transaction wrapping is awkward around existing service functions, the first
implementation may sequence existing functions but must stop before broad use
and document the residual partial-write risk. Prefer transaction support.

## Idempotency

The first implementation should be strict, not clever:

- explicit ids are required for artifact, review, decision, and run;
- if any target id already exists, fail during preflight;
- do not silently reuse existing records;
- do not auto-generate multiple ids in hidden ways.

This keeps repeated agent attempts from creating duplicate closeout evidence.

## What The Helper Must Not Do

Do not add:

- new domain entity;
- new database table;
- new lifecycle state;
- scheduler;
- multi-goal dispatcher;
- automatic routing;
- local-model execution;
- provider transcript import;
- session/thread schema;
- dashboard or UI route;
- automatic memory promotion;
- automatic artifact discovery;
- automatic review based only on AI output.

Do not bypass:

- `completeV2CoreProviderRun` run ownership/status checks;
- `recordV2CoreReview`;
- `recordV2CoreDecision` with `accept_task_output`;
- `transitionV2CoreTaskStatus` done-gate enforcement.

## Focused Implementation Target

Implement only `complete` first if scope needs to be cut.

Reason: `prepare` is already covered by `launch-provider-run`; `complete` is
where most repeated closeout choreography and partial-state risk lives.

## Focused Smoke Tests

Add tests to `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts` or a focused
neighbor spec.

Required cases:

1. `complete --dry-run` on an in-progress task with planned run returns the
   planned operation list and writes nothing.
2. `complete` creates/updates:
   - completed provider run;
   - submitted then accepted artifact;
   - approved review;
   - `accept_task_output` decision;
   - task status `done`;
   - optional follow-up task when follow-up inputs are supplied.
3. `complete` refuses to run if the run does not belong to the task.
4. `complete` refuses to run if the run is not `planned`.
5. `complete` refuses to run if an explicit target id already exists.
6. `fail` marks the run failed and leaves the task not done.
7. Agent-control action returns the same readback shape as the CLI command.

Validation for the implementation task should also include:

- focused v2 core smoke tests;
- `npm run check`;
- one live dry-run readback against the real v2 core database;
- one live non-destructive or temporary-db proof for the complete path.

## Next Implementation Task

Create one implementation task:

`Add minimal managed-run lifecycle complete helper`

Scope:

- implement `managed-run-lifecycle --mode complete`;
- expose matching `agent-control --agent-action managed-run-lifecycle`;
- implement `--dry-run`;
- add focused smoke tests;
- do not implement `prepare` or `fail` unless they are cheap wrappers that do
  not expand scope;
- do not add schema, UI, scheduler, routing, local-model, workflow entity, or
  memory-promotion behavior.
