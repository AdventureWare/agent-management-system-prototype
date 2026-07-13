# V2 Continuous Goal-Work Control Plan v0.1

Date: 2026-07-13
Status: Planning artifact

## Purpose

Define the next AMS v2 milestone: goals and sub-goals should behave like
running work containers, not static labels.

The operator should be able to keep a goal active, pause it, mark it blocked,
resume it, inspect its next work, and see whether agents can continue. Agents
should keep working from active eligible goals and should not pull work from
paused, blocked, completed, superseded, or canceled goals unless the explicit
task is to resolve that state.

This milestone is not a scheduler, background worker system, governance app, or
dashboard project.

## Current Evidence

Inspected:

- compact work packet for `task_v2_continuous_goal_work_control_plan`;
- local retrieval for `goal lifecycle paused blocked active next-work sub-goal operator console UI`;
- `src/lib/server/v2-core-contract.ts`;
- `src/lib/server/v2-core-service.ts`;
- `scripts/v2-core-db.ts`;
- `src/routes/app/v2-core/+page.server.ts`;
- `src/routes/app/v2-core/+page.svelte`;
- `src/routes/app/v2-core/tasks/[taskId]/+page.server.ts`;
- existing v2 core CLI smoke tests and goal status docs.

Current support:

- Goal statuses already exist: `draft`, `active`, `blocked`, `paused`,
  `completed`, `superseded`, `canceled`.
- Task statuses already exist: `draft`, `ready`, `in_progress`, `blocked`,
  `review`, `done`, `canceled`.
- `transition-goal` records `goal_status_transition` decisions.
- `createV2CoreGoal` already supports `parentGoalId` in service code.
- `v2_core_goals.parent_goal_id` already exists in the schema and snapshot.
- The operator console route already displays active/blocked/paused goals,
  next work, review queue, recent runs, artifacts, memory, dependency counts,
  and snapshot counts.
- Task detail already supports task actions: start, mark blocked, resolve
  blocker, submit for review, accept output, and request changes.

Current gaps:

- `readV2CoreNextWork` selects tasks by task status and scope, but it does not
  filter by goal status. A ready task under a paused or blocked goal can still
  appear as next work.
- CLI `create-goal` does not expose `parentGoalId`, even though the service and
  database support it.
- Operator console names the active/blocked/paused goal list `activeGoals`,
  which is acceptable internally but unclear for UI semantics.
- Operator console UI is read-oriented. It does not yet let the operator pause,
  resume, block, or complete a goal from the UI.
- Goal rows do not show parent/child goal relationships.
- Blocked goal state has no structured blocker field. The best first-slice
  blocker evidence is the `goal_status_transition` decision summary/rationale,
  not a new field.

## Accepted Terms

Use existing lifecycle states. Do not add `running` as a new status.

- Running goal: operator-facing phrase for a goal with status `active`.
- Paused goal: status `paused`; should not produce executable next work.
- Blocked goal: status `blocked`; should not produce ordinary executable next
  work. It should surface as goal state needing an unblock decision.
- Completed goal: status `completed`; no longer attracts work.
- Superseded goal: status `superseded`; no longer attracts work, and should
  preserve evidence of why it was replaced.
- Canceled goal: status `canceled`; no longer attracts work.
- Sub-goal: a `Goal` with `parent_goal_id`, not a new entity.

## Agent Work Semantics

Agents should select work this way:

- Start from `agent-control next --project ... --compact`.
- Only tasks under `active` goals should appear as ordinary `start_task` or
  `review_output` candidates.
- Tasks under `paused`, `completed`, `superseded`, or `canceled` goals should
  not appear in next-work.
- Tasks under `blocked` goals should not appear as ordinary executable work.
  The operator console should show the blocked goal and recent decision reason.
- A task whose own status is `blocked` under an active goal may appear as a
  blocker-resolution candidate.
- If a goal is active but has no open work, the system should surface or create
  a continuation-planning task as a later slice. Do not implement autonomous
  scheduling in the first slice.

## Operator UI Semantics

The operator UI should answer practical questions:

- Which goals are running now?
- Which goals are paused?
- Which goals are blocked, and why?
- Which sub-goals belong to this goal?
- What work is next for this goal?
- Can I pause/resume/block/complete this goal safely?
- Which task or artifact needs review?

The UI should stay work-focused:

- no decorative dashboard;
- no metrics unless they support an operator decision;
- no large governance panel;
- no separate approval system;
- no scheduler controls;
- no automatic agent launch controls in this milestone.

## Smallest Useful UI Slice

Extend the existing `/app/v2-core` operator console rather than creating a new
app area.

First UI slice:

- Rename the visible goal section to `Goal control` or equivalent.
- Group goals by status: running, blocked, paused.
- Keep completed/superseded/canceled out of the main control list unless a
  scoped view requests them.
- Show each goal's title, status, parent goal if present, open/done task counts,
  and latest status-transition decision summary when available.
- Add narrow actions for goal state changes:
  - pause active goal;
  - resume paused goal;
  - mark active goal blocked;
  - unblock blocked goal back to active;
  - complete active goal.
- Require a short summary for block, pause, resume, and complete actions.
- Continue to use `transitionV2CoreGoalStatus`; do not create a new goal action
  table or approval flow.

This UI can initially be server-action backed and local-only, matching current
task detail UI patterns.

## Minimal Implementation Sequence

### Step 1: Goal-aware next-work and sub-goal creation support

Implement the foundation before expanding UI:

- update `readV2CoreNextWork` to join goal status and only surface ordinary
  next work from `active` goals;
- preserve blocked task resolution under active goals;
- add tests proving paused, blocked, completed, superseded, and canceled goals
  do not leak ready tasks into next-work;
- expose `--parent-goal <id>` or equivalent on `create-goal`, using the
  existing service field;
- add tests proving child goals can be created and read back without schema
  changes.

### Step 2: Operator console goal-control read model

Make the operator console clearer:

- expose goal status groups in the read model;
- include `parentGoalId` and latest goal status-transition decision summary;
- keep `activeGoals` compatibility if needed, but make UI consume clearer
  grouped data;
- add tests for grouped goal status readback.

### Step 3: Minimal goal-control UI

Add practical controls to `/app/v2-core`:

- display running, blocked, and paused goals distinctly;
- show parent/sub-goal relationships in rows;
- add server actions for pause/resume/block/unblock/complete using existing
  transition service;
- keep action controls compact and explicit;
- test with Svelte component specs and server action specs.

### Step 4: Continuation behavior assessment

After the UI foundation works, assess whether active goals with no open tasks
need an explicit continuation-planning helper. Do not build a scheduler yet.

## Recommended Next Implementation Task

Create:

`task_v2_continuous_goal_work_control_next_work_foundation`

Title:

Make v2 next-work goal-status aware

Summary:

Update the existing v2 next-work and agent-control selection path so ordinary
task candidates only come from active goals. Add CLI support for creating
sub-goals through the existing `parent_goal_id` field. Validate that paused,
blocked, completed, superseded, and canceled goals do not leak ready tasks into
agent next-work, while blocked tasks under active goals can still surface for
unblock decisions.

Acceptance criteria:

- `readV2CoreNextWork` excludes ready/review tasks under non-active goals;
- blocked task resolution under active goals still works;
- `agent-control next --compact` inherits the same behavior;
- `create-goal` CLI can create a child goal without direct DB edits;
- tests cover active, paused, blocked, completed, superseded, canceled, and
  child-goal readback cases;
- no schema changes, scheduler, background execution, new lifecycle states,
  broad UI, or dashboard work.

Validation:

- focused v2 core CLI smoke tests;
- live `agent-control next --project project_ams_v2_core --compact --json`;
- `npm run check`;
- git diff checks.

## Non-Goals

Do not add in this milestone:

- background scheduling;
- automatic agent launch loops;
- local-model orchestration;
- route scoring;
- new Goal/Task entities;
- new lifecycle statuses;
- a separate Milestone entity;
- approval gates beyond existing review/decision evidence;
- dashboards that do not change operator decisions;
- metrics without a decision that uses them;
- broad mobile mutation support.

## Open Questions

- Should blocked goals later have a structured blocker relation, or is latest
  transition decision evidence enough for now?
- Should sub-goal ordering be manual, derived from task state, or left unordered
  until a real need appears?
- Should paused goals hide entirely from agent packets, or appear as non-action
  context in operator packets?
- How much goal mutation should be allowed from mobile read mode after the
  desktop operator UI is proven?

## Completion Signal For This Milestone

The milestone is complete when AMS v2 can show the operator which goals are
running, paused, and blocked; agents only receive eligible next work from
running goals; sub-goals can be represented and inspected; and a focused UI lets
the operator administer goal state without adding scheduler or governance bloat.
