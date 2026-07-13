# V2 Owned-Agent Control Loop Proof Plan v0.1

Date: 2026-07-13
Status: Planning artifact

## Purpose

Define the smallest useful proof that AMS v2 can act as the agent's control
loop for real project work.

This milestone is not another dashboard, scheduler, local-model experiment, or
schema expansion. It should prove that an agent can use durable AMS v2 state as
the operating surface: select work, get context, execute a bounded task, record
evidence, close the task, and create the next task without relying on chat
history as the source of truth.

## Current Evidence

AMS v2 already has the pieces needed for a first proof:

- `next-work` can identify ready work.
- `agent-work-packet` can build bounded source-linked context.
- `agent-control` exposes task loop actions over existing service operations.
- `search-context` gives local retrieval over existing v2 records.
- `launch-provider-run` and `managed-run-lifecycle` can represent external AI
  execution and closeout with review/acceptance evidence.
- `dependency-report`, `dependency-reduction-report`, `routing-evidence`, and
  `route-comparison-report` expose provider/tool dependency evidence.
- Remote/mobile read access is now complete for read-oriented inspection.

The missing proof is not a feature. The missing proof is an end-to-end run where
the agent deliberately treats those surfaces as the control loop.

## Selected Proof

Run one bounded AMS v2 project task through this sequence:

1. Use `agent-control --agent-action next` or direct task selection to identify
   the selected task.
2. Use `agent-control --agent-action packet` to get the task contract and
   bounded context.
3. Use `agent-control --agent-action search` for any additional local context,
   instead of relying on chat memory.
4. Launch or continue a provider-backed run only after the structured packet is
   available.
5. Produce one durable artifact.
6. Close the task with `managed-run-lifecycle`, including review and acceptance
   evidence.
7. Record which external AI affordances were still needed.
8. Create exactly one follow-up task only if the run exposes a concrete missing
   owned capability.

## First Implementation Task

Create one execution task:

`task_v2_owned_agent_control_loop_execute_first_proof`

Title:

Execute first owned-agent control-loop proof

Task summary:

Use existing AMS v2 agent-control, work-packet, search, provider-run, and
managed-lifecycle operations to complete one bounded AMS v2 project task. The
task should produce a short proof artifact that records the command sequence,
context sources used, result, validation, and remaining external-AI affordance
dependencies.

Recommended artifact:

`docs/v2_owned_agent_control_loop_first_proof_v0_1.md`

## Acceptance Criteria

The proof task is complete when:

- the selected work is represented as a v2 Task under the owned-agent control
  loop goal;
- the run starts from a source-linked work packet, not from chat recall alone;
- at least one local retrieval query is used and cited;
- the result is recorded as a durable artifact;
- the run is closed through existing review and acceptance gates;
- provider/tool usage is visible through dependency reports;
- the proof explicitly lists external-AI affordances still used;
- at most one concrete follow-up is created from observed friction;
- no schema, entity, lifecycle, scheduler, local-model runtime, routing policy,
  broad UI, or dashboard work is added.

## Validation

Required validation for the proof task:

- `git status --short` before and after;
- `npm run v2:core-db -- agent-control --agent-action packet --task <task> --json`;
- `npm run v2:core-db -- agent-control --agent-action search --project project_ams_v2_core --query "<query>" --json`;
- `npm run v2:core-db -- dependency-report --task <task> --json`;
- `npm run v2:core-db -- inspect-task --task <task> --json`;
- focused tests or `npm run check` only if code changes;
- proof artifact committed or attached as accepted evidence.

## Non-Goals

Do not add:

- autonomous scheduling;
- background worker pools;
- local model orchestration;
- automatic provider routing;
- route scoring;
- new domain entities;
- new task lifecycle states;
- MCP expansion;
- broad UI;
- metrics dashboards;
- automatic memory promotion from AI output;
- automatic review or acceptance.

## Expected External-AI Dependency Observations

This proof should be honest about continued external AI use. Expected remaining
dependencies include:

- reasoning about the task and edits;
- code/document generation;
- command selection and validation interpretation;
- summarizing run results for review;
- choosing a follow-up when friction appears.

The point is not to remove all provider use in this milestone. The point is to
make provider use explicit, recorded, bounded by task state, and comparable to
local/tool affordances.

## Follow-Up Policy

Create a follow-up only if the proof exposes a specific missing affordance, such
as:

- agent-control lacks a narrow command needed during the run;
- work packets omit a source needed for execution;
- local retrieval fails to find known relevant v2 evidence;
- closeout requires repeated manual command choreography not covered by the
  lifecycle helper;
- dependency reports cannot answer which external affordance was used.

Do not create follow-ups for speculative local models, broad automation,
dashboard polish, or abstract governance.

## Recommended Next Step

Create and execute `task_v2_owned_agent_control_loop_execute_first_proof`.

The proof should be done with the current v2 architecture. If it feels clumsy,
record the clumsiness as evidence before changing the system.
