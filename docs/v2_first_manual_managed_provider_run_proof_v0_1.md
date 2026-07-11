# V2 First Manual Managed Provider Run Proof v0.1

Date: 2026-07-10
Status: Proof output

## Purpose

Prove that AMS v2 can coordinate one provider-backed work item through the
current core loop without adding scheduler, runner, session, routing, schema, or
UI complexity.

This proof uses the current Codex session as the provider-backed execution
surface and records the work against `provider_codex_external`.

## Selected Task

Task:
`task_v2_core_execute_first_manual_managed_provider_run`

Goal:
`goal_ams_v2_managed_provider_run_loop`

Project:
`project_ams_v2_core`

The task was selected because `next-work` identified it as the only ready task
under the active managed-provider-run goal.

## Packet Used

Command:

```sh
npm run v2:core-db -- agent-work-packet --task task_v2_core_execute_first_manual_managed_provider_run --json
```

The packet provided:

- selected task, project, and goal contract;
- readiness status and recommended action;
- trusted project memory;
- recent evidence from the managed-provider-run plan;
- provider/tool dependency context;
- evaluation evidence for packet, local retrieval, and agent-control surface;
- allowed actions and stopping conditions.

The packet was sufficient for this proof. It avoided broad chat-history
dependency and did not require a new context-bundle entity.

## Execution Path

The manual provider-run path used for this proof was:

1. Read the selected task detail.
2. Build the agent work packet.
3. Move the selected task to `in_progress`.
4. Execute the bounded proof work in this Codex/provider session.
5. Create this durable proof artifact.
6. Record a provider-linked run with `provider_codex_external`.
7. Attach this artifact to the run.
8. Record validation as a tool execution.
9. Move the task to review.
10. Record review and acceptance.
11. Create one source-linked follow-up for the smallest implementation gap.

This proves the domain loop can represent provider-backed work with existing v2
entities.

## What Worked

- `next-work` selected the correct ready task.
- `agent-work-packet` produced bounded, source-linked context.
- The existing `Task`, `Run`, `ModelProvider`, `ToolExecution`, `Artifact`,
  `Review`, and `Decision` records are enough to describe the work.
- Provider usage is visible through `dependency-report`.
- Review and acceptance gates can still be preserved for provider output.
- Follow-up lineage can be represented with existing source references.

## Friction Observed

The proof required manual command choreography:

- one command to inspect/select work;
- one command to build a packet;
- one command to transition task state;
- one command to record the run;
- one command to attach the artifact;
- one command to record validation/tool evidence;
- one command to move to review;
- one command to review;
- one command to accept;
- one command to close.

That is acceptable for proof work but too error-prone for repeated managed
provider runs. The main risk is not missing ontology. The main risk is a
procedural gap: the operator or agent must remember the launch and closeout
sequence.

## Smallest Implementation Gap

The next implementation should be a minimal provider-run launch adapter.

It should not be a scheduler or autonomous dispatcher. It should only:

- accept a task id and model provider id;
- verify the task is ready or in a launchable state;
- build the existing `agent-work-packet`;
- create or mark a provider-linked run as started;
- return the packet plus run id for the provider session;
- leave result recording, artifact attachment, review, and acceptance as
  explicit follow-up actions.

This is the smallest code step because the launch boundary is where the manual
proof currently depends most on remembered procedure. Result ingestion and
artifact capture can remain manual until at least one launched run proves that
the start boundary is stable.

## Explicit Non-Needs

This proof does not justify:

- scheduler;
- autonomous multi-goal dispatch;
- local model execution;
- automatic routing;
- route scoring;
- new session/thread schema;
- broad provider dashboard;
- new entities or lifecycle states.

## Validation Plan

After recording this proof in v2 state, validate with:

- `inspect-task` for this task;
- `dependency-report` for the managed-provider-run goal;
- `operator-console` for next work and review queue;
- `agent-work-packet` for the selected task or follow-up task.

No code tests are required because this proof changes documentation and v2
runtime state only.

## Recommendation

Proceed next with a narrow implementation task:

`Add minimal v2 provider-run launch adapter`

The adapter should prepare a provider-backed run and packet from existing v2
state. It should not close the run, ingest results, attach artifacts
automatically, or make routing decisions.
