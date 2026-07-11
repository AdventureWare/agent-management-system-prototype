# V2 Minimal Vertical Slice v0.1

Date: 2026-07-02
Status: Draft implementation slice, reconciled against v2 core evidence on 2026-07-10

## Purpose

The minimal v2 slice should prove that a cleaner core can handle the work loop better than v1 without rebuilding the whole app.

Success means one imported or newly created project goal can move through task creation, bounded context retrieval, agent run recording, artifact capture, review/decision/memory governance, evaluation, and dependency reporting.

For the first v2 core slice, the implementation boundary is intentionally narrower than the full accepted ontology. `Run`, `Review`, and `Decision` carry the concrete execution and closure evidence. `WorkSession`, standalone `Approval`, model registry, execution surfaces, broad retrieval/search, and persisted dependency-reduction records remain deferred unless later evidence proves they need first-class persistence.

## Slice Boundary

Implement only enough to support:

- one workspace
- one project
- one goal
- a few tasks with dependencies
- one task dependency
- one run
- one artifact
- one tool execution
- one review and acceptance decision
- one decision
- one trusted memory item promoted from reviewed evidence
- one bounded source-linked context retrieval query
- one evaluation scenario and result
- one dependency-reduction status report computed from existing evidence

## Required Records

Minimum first-slice tables or repositories:

- `projects`
- `goals`
- `tasks`
- `task_dependencies`
- `runs`
- `artifacts`
- `decisions`
- `reviews`
- `memory_items`
- `providers`
- `tools`
- `tool_executions`
- `evaluation_scenarios`
- `evaluation_results`
- source references

First-slice computed read models:

- context bundle
- agent work packet
- operator console
- provider/tool dependency report
- dependency-reduction report

Deferred or substituted for the first v2 core slice:

- `workspaces`: represented by project `workspace_root` until multi-workspace behavior is needed
- `work_sessions`: deferred; task `runs` carry execution evidence
- `approvals`: substituted by approved `Review` plus `accept_task_output` `Decision`
- `models`: represented by provider linkage and result-level model labels until a model registry is needed
- `execution_surfaces`: deferred until launcher/surface orchestration returns
- `dependency_reduction_records`: computed report first; persist records only when report evidence proves a workflow need
- broad retrieval/search: bounded `context-bundle` and `agent-work-packet` first

This list can be implemented as a compact schema, not a full product UI.

## Minimum Interfaces

### CLI

Start with CLI commands before broad UI:

- `v2 import preview --source data/control-plane.json --project <id>`
- `v2-core-db create-project`
- `v2-core-db create-goal`
- `v2-core-db create-task`
- `v2-core-db record-task-dependency`
- `v2-core-db context-bundle --task <id>`
- `v2-core-db agent-work-packet --task <id>`
- `v2-core-db record-run`
- `v2-core-db attach-artifact`
- `v2-core-db record-review`
- `v2-core-db record-decision`
- `v2-core-db promote-memory`
- `v2-core-db register-evaluation-scenario`
- `v2-core-db record-evaluation-result`
- `v2-core-db dependency-report`
- `v2-core-db dependency-reduction-report`

### Minimal UI

Only after CLI/service behavior works:

- project/goal state page
- task detail page
- run/session detail page
- artifact list
- memory proposals/review queue
- evaluation/dependency summary

### Agent Tool Surface

Expose the same service calls through MCP or API after CLI proves payloads:

- get work packet
- record run result
- record tool execution
- attach artifact
- propose memory update
- request review
- retrieve context

## Flow

1. Import a small project/goal/task/run subset from v1 into v2 staging.
2. Review import mapping and unmapped fields.
3. Promote one project and one goal into v2 active state.
4. Create or import two tasks, one dependency, and one ready task.
5. Generate a context bundle and work packet with relevant project, goal, decision, and memory context.
6. Record a run against the task with provider/model label metadata.
7. Record at least one tool execution.
8. Attach or register one artifact.
9. Record validation and result summary.
10. Open review, then record the outcome.
11. Record one decision from accepted evidence.
12. Promote one trusted memory item from accepted evidence.
13. Retrieve relevant context for a follow-up task through `context-bundle` or `agent-work-packet`.
14. Run one evaluation scenario against the same capability.
15. Generate a dependency-reduction report for that capability/provider/model.

## Seed Scenario

Use a real v1 AMS task or a small fixture based on:

- project: Agent Management System
- goal: owned agent system v2 assessment
- task: inspect v1 and produce v2 assessment
- artifact: generated v2 docs
- decision: build v2 in parallel while preserving v1
- memory proposal: "For AMS v2, preserve v1 evidence but do not reuse generic payload storage as the core schema."

## Validation

Required checks for the slice:

- Domain tests for task/run/review/acceptance-decision transitions.
- Import test using a trimmed v1 fixture.
- Context retrieval test proves source-linked result inclusion.
- Artifact test proves path/metadata registration.
- Tool execution test proves permission/risk metadata is recorded.
- Evaluation test stores scenario and result.
- Dependency report test shows at least one capability status.

## Out Of Scope

- Full SvelteKit parity with v1.
- Live Codex launcher parity.
- All historical data migration.
- Full embedding search.
- Multi-agent scheduling.
- Remote access.
- Production auth.
- Automatic task acceptance.
- Multi-user roles.

## Exit Criteria

The slice is complete when an operator can answer:

- What is this project/goal trying to accomplish?
- What task is ready next, and why?
- What context was given to the agent?
- What session/run happened?
- What tools were used?
- What artifacts were produced?
- What review/approval/decision resulted?
- What memory was proposed or published?
- What relevant context is retrieved for follow-up?
- What evaluation evidence exists?
- Which external AI dependency was reduced or remains?
