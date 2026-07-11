# V2 Next Milestone After Minimal Slice v0.1

Date: 2026-07-10
Status: Milestone recommendation

## Purpose

Choose the next significant AMS v2 milestone after the first v2 core minimal
slice was reconciled as complete against its current boundary.

This is a planning artifact. It should prevent the next implementation step
from drifting into UI parity, local-model work, broad retrieval, routing, or
additional governance before the agent operating loop has a cleaner execution
surface.

## Evidence Inspected

- `npm run v2:core-db -- inspect-task --task task_v2_core_choose_next_milestone_after_minimal_slice --json`
- `npm run v2:core-db -- operator-console --project project_ams_v2_core --json`
- `npm run v2:core-db -- dependency-reduction-report --project project_ams_v2_core --json`
- `docs/v2_minimal_slice_gap_reconciliation_v0_1.md`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `docs/v2_requirements_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`

## Current V2 Core Capability

V2 core can now:

- maintain one active project and goal
- select ready work
- transition tasks through the minimal lifecycle
- record task dependencies
- build bounded context bundles and agent work packets
- record runs, tool executions, artifacts, reviews, decisions, and trusted memory
- enforce review and acceptance before task closeout
- expose operator-console state
- export and import deterministic snapshots
- register evaluation scenarios and results
- compute a dependency-reduction report from provider, tool, task, and
  evaluation evidence

The live project state shows one active goal, twenty-one completed tasks, one
in-progress milestone-selection task, one task dependency, one evaluation
scenario/result, and one dependency-reduction capability row:
`agent-work-packet` is `hybrid_candidate`.

## Recommendation

The next milestone should be:

**Minimal V2 Agent-Control Surface**

The immediate follow-up should add a small, structured agent-facing control
surface over the existing v2 core service operations.

## Why This Is Next

The larger project goal is an owned agent/AI operating layer. The first v2 core
slice proved that AMS can represent the work loop, but this run still required
the agent to manually coordinate many individual CLI calls from chat context.

That is the current gap:

- v2 core has durable state and useful read models
- `agent-work-packet` is already bounded and source-linked
- dependency evidence says the packet capability is a hybrid candidate
- agents still need a cleaner way to take the next work item, get the packet,
  start work, record results, submit evidence, and create follow-up work without
  prompt-stuffing or ad hoc command choreography

A minimal agent-control surface advances external-AI dependency reduction more
directly than more UI or broader retrieval. It turns the proven v2 core loop
into a reusable operating affordance for Codex today and future owned/local
agents later.

## What To Implement Next

Create one implementation task:

`task_v2_core_minimal_agent_control_surface`

Scope:

- expose one bounded agent-facing command/API surface over existing v2 core
  service functions
- support the core agent loop:
  - get next work for a project or goal
  - get a source-linked agent work packet for the selected task
  - start the task
  - record run/tool/artifact evidence
  - submit evidence for review or close through the existing reviewed-output
    path
  - create one follow-up task when needed
- reuse existing entities, states, and persistence
- keep all payloads JSON-readable and testable
- add focused tests and one dogfood run proving the surface can drive a real
  v2 task without manual state patching

The surface can be CLI-first if that is the smallest clean path. A local API or
MCP wrapper can follow after the command contract is stable.

## What Not To Add Yet

Do not add:

- new entities, statuses, lifecycles, or schema tables
- autonomous scheduling
- a broad MCP mutation suite
- model routing policy
- local model orchestration
- broad retrieval/search
- dashboard or UI parity work
- approval redesign
- capability registry
- workflow/skill promotion automation
- provider retirement automation

## Why Not UI Next

The operator UI is useful, but the next bottleneck is agent operation, not human
inspection. UI work now risks reproducing v1 surface area before the agent
control contract is stable.

## Why Not Routing Or Local Models Next

Routing and local models need more repeated capability evidence. The current
dependency-reduction report has one hybrid candidate, not enough evidence to
encode route policy or claim local replacement.

## Why Not Broad Retrieval Next

Broad retrieval remains important, but the first slice already has bounded
context retrieval through `context-bundle` and `agent-work-packet`. The more
urgent problem is making those packets operationally usable by agents through a
stable control surface.

## Acceptance Criteria For The Next Task

The next implementation task is complete when:

- an agent can fetch next work and an agent work packet through one documented
  v2 control surface
- the same surface can record a run, tool evidence, and artifact evidence using
  existing v2 core records
- the same surface can submit evidence for review or drive the existing
  reviewed-output closeout path
- the same surface can create one follow-up task with source lineage
- no new domain entities, lifecycle states, or schema tables are added
- focused tests cover the command/API contract
- `npm run check` passes
- a live dogfood run records evidence that the surface was used on a real v2
  task

## Open Risks

- A control surface can become a second app if it grows beyond the core loop.
  Keep it as a thin adapter over existing service operations.
- A broad MCP/API layer can invite unreviewable mutation paths. Start with the
  smallest command contract and explicit allowed operations.
- If the payload is too chat-shaped, it recreates prompt stuffing. Keep the
  packet structured and source-linked.
- If the surface auto-closes work, it bypasses the review/decision discipline.
  Reuse the existing review and acceptance gates.

## Next Task

Create exactly one implementation follow-up:

`Add minimal v2 core agent-control surface`
