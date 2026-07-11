# V2 Core Minimal Loop Checkpoint v0.1

Date: 2026-07-10
Status: Checkpoint assessment

## Purpose

This checkpoint reviews the current AMS v2 core state after the task-detail
loop work and chooses exactly one next implementation capability.

The point is to avoid continuing into random UI or governance additions just
because the task-detail loop now works.

## Evidence Inspected

- `npm run v2:core-db -- operator-console --json`
- `npm run v2:core-db -- inspect-task --task task_v2_core_minimal_loop_checkpoint_and_next_capability --json`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/design/ams_v2_design_bloat_audit.md`
- `docs/v2_requirements_v0_1.md`
- `docs/v2_architecture_v0_1.md`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `src/lib/server/v2-core-service.ts`
- `scripts/v2-core-db.ts`

## Current V2 Core State

The v2 core runtime now has:

- one active project: `project_ams_v2_core`
- one active goal: `goal_ams_v2_minimal_loop`
- 14 tasks total
- 13 completed tasks
- 1 active checkpoint task during this assessment
- 13 completed runs
- 43 artifacts
- 13 approved reviews
- 13 trusted memory items
- model-provider and tool-execution evidence for recent Codex-backed work

The core task-detail loop can now support:

1. selecting a ready task
2. starting it
3. recording run evidence
4. attaching a submitted artifact
5. submitting evidence-bearing work for review
6. accepting approved reviewed output
7. transitioning the task to done
8. recording decision, review, artifact, run, tool, provider, and memory evidence
9. creating source-linked follow-up work

## Milestone Assessment

The minimal task-detail work loop is complete enough for this milestone.

It is not a full owned-agent operating layer yet. It proves that the v2 core can
carry goal-linked work through durable evidence and reviewed closeout without
using chat history as the source of truth.

## What Is Still Missing

The largest missing capability is not another review or approval surface. The
largest missing capability is a stronger agent handoff packet.

Current `readV2CoreContextBundle` is useful but thin. It includes task, goal,
task artifacts, and project memory. It does not yet produce a full agent-ready
work packet with:

- task contract and status
- project and goal context
- readiness/actionability explanation
- relevant prior decisions
- relevant trusted memory with source linkage
- recent runs and artifacts
- provider/tool dependency context
- validation expectations
- allowed next actions and stopping conditions
- compact rendered prompt text as a derived field

Other missing capabilities remain important but should follow later:

- evaluation scenarios/results
- dependency-reduction status backed by evaluation evidence
- richer retrieval/FTS
- local model routing
- task decomposition UI
- agent/MCP mutation surface for v2 core

## Recommendation

The next implementation task should be:

`Add v2 core agent work packet read model`

Reason:

- It directly supports the core loop step `context bundle built`.
- It helps agents work from structured state instead of prompt stuffing.
- It reuses existing v2 core entities and read models.
- It does not require new persisted entities.
- It creates a better foundation for later agent execution, retrieval,
  evaluation, and dependency-reduction work.

## Scope Boundary For Next Task

The next task should implement a read model only.

It should not:

- add new database tables
- persist `ContextBundle`
- create `AgentProfile`, `Workflow`, `Skill`, `Evaluation`, or
  `ExternalAIDependency` entities
- add autonomous launch
- add broad MCP mutation tools
- add provider routing
- add dashboards
- replace existing v1 work-packet systems

## Proposed Next Task Acceptance Criteria

The next implementation task is complete when:

- `v2-core` can return an agent work packet for a task from current SQLite state.
- The packet includes task, project, goal, readiness, context sources, recent
  runs/artifacts, relevant decisions, trusted memory, dependency report summary,
  validation expectations, allowed actions, and stopping conditions.
- The packet is source-linked and bounded; it does not dump the whole project.
- A CLI command can read the packet as JSON.
- The task detail page may optionally link to or show a compact packet summary,
  but no broad UI is required.
- Focused tests cover source inclusion, readiness/actionability, and prompt
  rendering boundaries.
- `npm run check` passes.

## Why Not Evaluation Next

Evaluation is important, but dependency-reduction claims require good task/run
context first. A work packet gives evaluation and future routing a stable input
surface. Adding evaluation before reliable agent handoff would likely produce
thin score records with weak operational value.

## Why Not More UI Next

The current task-detail UI already supports the minimal work loop. More UI
should wait until the next read model proves what needs to be displayed.

## Next Implementation Task

Create a follow-up task:

`task_v2_core_agent_work_packet_read_model`

This should be the next implementation task unless the operator chooses a
different strategic direction.
