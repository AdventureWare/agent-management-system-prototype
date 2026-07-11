# V2 Managed Provider-Run Loop Closure Assessment v0.1

Date: 2026-07-10
Status: Closure assessment

## Purpose

Assess whether `goal_ams_v2_managed_provider_run_loop` is satisfied for the
current AMS v2 milestone, after the manual proof, launch adapter, and
completion operation.

This is not a proposal to add more provider mechanics. It is a stop/go check
against the actual evidence now recorded in v2 state.

## Evidence Reviewed

- `docs/v2_managed_provider_agent_run_loop_plan_v0_1.md`
- `docs/v2_first_manual_managed_provider_run_proof_v0_1.md`
- `inspect-task` readbacks for:
  - `task_v2_core_plan_managed_provider_run_loop`
  - `task_v2_core_execute_first_manual_managed_provider_run`
  - `task_v2_core_minimal_provider_run_launch_adapter`
  - `task_v2_core_complete_launched_provider_run`
  - `task_v2_core_assess_managed_provider_run_loop_closure`
- `dependency-report --goal goal_ams_v2_managed_provider_run_loop`
- `operator-console --project project_ams_v2_core`
- Source artifacts for the launch and completion operations:
  - `src/lib/server/v2-core-service.ts`
  - `scripts/v2-core-db.ts`
  - `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`

## Findings

The managed provider-run loop is satisfied for the current milestone.

The manual proof showed that existing v2 entities can represent
provider-backed work without adding a session/thread schema, scheduler, router,
local-model runtime, or broad UI. The loop can be recorded through Task,
ModelProvider, Run, ToolExecution, Artifact, Review, Decision, and follow-up
lineage.

The launch adapter now covers the start boundary. It can take a task and model
provider, verify launchability, create a provider-linked planned run, move a
ready task to `in_progress`, and return the task detail plus bounded
agent-work-packet for provider execution.

The completion operation now covers the end boundary. It updates the same
launched run to `completed` or `failed`, records result and validation
summaries, and sets `endedAt`. This addresses the main weakness found in the
manual proof: repeated provider runs no longer require the operator to remember
the start/end run-record choreography.

Review and acceptance remain explicit. The new launch and completion helpers do
not automatically accept AI output, promote memory, attach artifacts, or create
follow-up work. That is correct for this milestone.

Provider and tool usage are visible through `dependency-report`. The goal now
shows provider-backed runs under `provider_codex_external` plus local CLI
validation evidence for the planning, manual proof, launch adapter, and
completion operation.

One historical planned run remains:
`run_v2_core_minimal_provider_run_launch_adapter_launch`. It was created before
the completion operation existed. It is useful evidence of the pre-completion
gap, not a reason to add cleanup machinery.

## Closure Recommendation

Close the managed provider-run loop goal as satisfied for the current AMS v2
milestone.

Do not add more provider-run mechanics now. The current slice proves the
minimum useful loop:

1. select a v2 task;
2. build bounded provider context;
3. launch a provider-linked run;
4. execute work in Codex or another provider surface;
5. complete that same run with result and validation evidence;
6. attach artifacts, review, accept, and create follow-up work explicitly.

That is enough to move to the next v2 capability. More mechanics should wait
for concrete repeated-run friction.

## Not Recommended Now

Do not add these under this goal:

- scheduler;
- autonomous multi-goal dispatch;
- worker pool;
- local model execution;
- automatic routing;
- route scoring;
- new session/thread schema;
- provider dashboard;
- broad UI;
- automatic artifact ingestion;
- automatic review or acceptance;
- memory promotion from raw AI output;
- cleanup tooling solely for the historical planned run.

## Narrow Future Candidates

These may become justified later, but only after repeated live use exposes a
specific failure:

- small artifact/result attachment helper;
- run-result import from a provider transcript;
- provider session/thread reference as a field on Run;
- failure recovery command for launched but abandoned runs;
- route choice helper when more than one provider path is genuinely used.

None of these are required to close this milestone.

## Acceptance Basis

The goal is accepted at this level because the evidence proves both boundaries
of a provider-backed task:

- start: `launch-provider-run` creates a provider-linked planned run and
  returns bounded context;
- end: `complete-provider-run` updates that same run with completion or failure
  evidence;
- audit: `dependency-report`, `inspect-task`, and `operator-console` expose the
  provider/tool evidence;
- governance: artifacts, reviews, decisions, and follow-up tasks remain
  explicit rather than automated away.

## Recommended Next Work

Select the next bounded AMS v2 capability now that managed provider-run
execution is good enough for the current milestone.

The selection task should review current v2 state and choose the next capability
based on actual project need, not on adding more provider-run machinery. Good
candidates are capabilities that make v2 more useful for real work while staying
within the existing core ontology.
