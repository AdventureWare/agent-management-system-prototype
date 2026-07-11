# V2 Managed Provider-Agent Run Loop Plan v0.1

Date: 2026-07-10
Status: Planning output

## Purpose

Plan the smallest useful milestone under
`goal_ams_v2_managed_provider_run_loop`.

The goal is to prove that AMS v2 can coordinate real provider-backed agent work
from selected task through context, run evidence, artifact capture, review,
acceptance, and continuation. This should use the existing v2 domain model
first. It should not become a scheduler, multi-agent orchestrator, local-model
runtime, automatic router, new schema, or broad UI project.

## Evidence Inspected

- `agent-control --agent-action packet --task task_v2_core_plan_managed_provider_run_loop`
- `operator-console --project project_ams_v2_core`
- `dependency-report --project project_ams_v2_core`
- `search-context --query "run artifact review acceptance provider task detail capture evidence"`
- `docs/agent-facing-ams-interface-v0.md`
- `src/lib/server/task-launch-planning.ts`
- `src/lib/server/task-session-actions.ts`
- `src/lib/server/agent-run-results.ts`
- `scripts/agent-thread-runner.mjs`
- `scripts/ams-cli.mjs` task launch/recover commands

## Current V2 Capabilities

AMS v2 already has the records needed to describe a managed provider run:

- `Task` for executable work;
- `ModelProvider` for external/local provider identity;
- `Run` for provider-linked execution evidence;
- `ToolExecution` for local commands or helper surfaces used during the run;
- `Artifact` for durable output;
- `Review` for human or review-gate evidence;
- `Decision` for acceptance, rejection, follow-up, and route rationale;
- `MemoryItem` for reviewed state promotion;
- `agent-work-packet`, `search-context`, `operator-console`, and
  `dependency-report` readbacks.

V2 does not yet have a first-class launch/session entity or a provider-runner
adapter. That is acceptable for the next step. The first proof can be a
manual-provider protocol recorded through existing v2 entities.

## Useful Prototype Capability To Preserve

The prototype has mature managed-run lessons:

- task launch checks before starting work;
- prompt/work-packet construction;
- provider/model selection;
- thread/run linkage;
- background runner state files;
- run-result capture;
- recovery handling;
- review/approval gates.

These are useful as implementation evidence, but they should not be copied
wholesale into v2. The v2 milestone should first prove the smaller ontology:
task, provider, run, artifacts, review, decisions, and continuation.

## Minimum Provider-Run Path

The smallest useful managed-provider run path is:

1. Select a ready v2 task under a goal.
2. Build an `agent-work-packet` for that task.
3. Start a v2 `Run` linked to `provider_codex_external`.
4. Execute the work in a provider-backed Codex/ChatGPT/Codex-like session using
   the packet as bounded context.
5. Record the provider run result summary.
6. Attach any durable artifact or evidence URI.
7. Record validation or failure evidence.
8. Submit the output for review.
9. Accept or reject the output with a `Decision`.
10. Create one follow-up task when the accepted result advances but does not
    complete the goal.

This path proves coordination. It does not require a scheduler or autonomous
dispatch.

## Code Or Protocol First?

Recommendation: start with a documented/manual protocol, then implement only
the missing adapter after one real run exposes the actual friction.

Why:

- v2 already records provider-linked runs and artifacts;
- v2 already has bounded packets and readbacks;
- the old runner can inform the adapter, but copying it now would import
  prototype complexity before the v2 contract is clear;
- one manual run will reveal whether the first implementation need is launch,
  result ingestion, artifact capture, or review ergonomics.

The first manual proof should still be recorded as structured v2 state. It
should not live only in chat.

## Minimal Inputs

The provider-run protocol needs:

- `taskId`;
- `goalId` and `projectId`, derived from the task;
- selected `modelProviderId`, initially `provider_codex_external`;
- optional model label;
- generated `agent-work-packet`;
- allowed actions and stopping conditions from the packet;
- expected artifact or result shape;
- validation expectation;
- review requirement.

Do not add fields for estimated cost, route score, priority score, autonomous
batch, worker pool, or scheduling until a concrete workflow uses them.

## Minimal Outputs

The run should produce:

- a `Run` record with provider id, action summary, result summary, and
  validation summary;
- optional `ToolExecution` records for local CLI/readback commands used during
  the run;
- one or more `Artifact` records for docs, patches, reports, or evidence;
- a `Review` record;
- an acceptance or rejection `Decision`;
- optional follow-up `Task`;
- optional trusted `MemoryItem` only if the accepted output changes durable
  project state.

## Failure States

Use existing task/run states where possible:

- `blocked`: missing credentials, missing user approval, inaccessible workspace,
  unclear task, unsafe action, or missing provider session.
- `review`: run output exists but needs evaluation.
- `done`: approved review plus `accept_task_output` decision exists.

Record failure evidence in `Run.validationSummary`, `Run.resultSummary`, or
`Run.errorSummary` rather than creating a new failure entity.

## Artifact Capture Rules

Attach only durable outputs:

- repo file created or changed;
- design/report artifact;
- test evidence artifact;
- command/readback URI;
- patch/diff reference.

Do not attach broad directories, transient chat text, or unreviewed AI output
as canonical memory.

## Review And Acceptance Rules

The first provider-run proof must preserve the existing v2 gates:

- provider output is not canonical when produced;
- artifacts start as submitted evidence;
- review decides whether evidence is acceptable;
- `accept_task_output` or rejection records the operator decision;
- follow-up work is explicit and source-linked.

## Rejected For This Milestone

Do not build:

- autonomous scheduler;
- multi-goal dispatch;
- worker pool;
- provider marketplace or registry expansion;
- local model runtime;
- automatic routing;
- route scoring;
- new session/thread schema;
- broad dashboard;
- background runner port from v1 before one v2 proof run.

## First Proof Task

Create one ready task:

`Execute first manual managed provider-agent run`

Purpose:

Use the v2 work loop to run one real provider-backed task manually, record the
run through existing v2 entities, and identify the smallest implementation gap.

Suggested target:

Use a small planning or documentation task under
`goal_ams_v2_managed_provider_run_loop` so the first run can produce a durable
artifact without touching application code.

Acceptance:

- select or create one ready v2 task;
- build `agent-work-packet` for it;
- record a provider-linked `Run` using `provider_codex_external`;
- execute the work in the current provider-backed Codex session or an external
  provider session using the packet as context;
- attach the durable artifact;
- record review and acceptance or rejection;
- record one follow-up task if needed;
- document whether the next implementation should be a launch adapter,
  result-ingestion helper, artifact-capture helper, or no code yet.

## Implementation After The Proof

Only after the manual proof should v2 implementation begin. The likely first
adapter is narrow:

- create a v2 command to prepare a provider-run packet and create a queued run;
- optionally hand off to the existing runner script as an implementation detail;
- record runner state back into v2 `Run` evidence;
- keep review and acceptance separate.

That adapter should reuse v1 runner lessons, not v1's whole session model.

## Decision

Proceed with a manual managed-provider proof first.

Do not implement scheduler, runner, thread schema, local model execution, or
automatic routing until one real v2 provider run shows the exact missing
operation.
