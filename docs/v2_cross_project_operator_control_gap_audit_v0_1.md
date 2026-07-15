# AMS v2 Cross-Project Operator Control Gap Audit v0.1

Date: 2026-07-15

## Purpose

Audit the existing AMS v2 operator console and related read models to identify
the smallest useful implementation slice for cross-project work control.

This is not a proposal for a scheduler, governance dashboard, or new domain
model. The operator still chooses what matters. AMS should make that choice
harder to lose and easier to act on.

## Task

Task: `task_ams_v2_cross_project_operator_console_gap_audit`

Goal: `goal_ams_v2_cross_project_operator_control`

Success criteria:

- identify what the operator console already supports;
- identify what is missing for cross-project work selection;
- define the smallest implementation slice;
- name affected files and tests;
- state non-goals that prevent governance overload.

## Readbacks Performed

Commands run:

```sh
npm run v2:core-db -- operator-console --json
npm run v2:core-db -- next-work --limit 25 --json
npm run v2:core-db -- goal-continuity-audit --json
npm run v2:core-db -- goal-triage --project project_ams_v2_core --json
```

Inspected implementation:

- `src/lib/server/v2-core-service.ts`
- `src/routes/app/v2-core/+page.server.ts`
- `src/routes/app/v2-core/+page.svelte`
- `src/routes/app/v2-core/v2-core-page.server.spec.ts`
- `src/routes/app/v2-core/v2-core-page.svelte.spec.ts`
- `scripts/v2-core-db.ts`

## Current Capability

The existing v2 core operator console already has more cross-project capability
than the UI makes obvious.

When called without a project or goal scope, `operator-console` returns:

- all projects with counts;
- active, blocked, and paused goals across projects;
- a global work queue;
- global next-work candidates;
- global review queue;
- recent runs and artifacts;
- dependency and evaluation summaries;
- snapshot counts.

The service already computes queue state per goal:

- `running`
- `ready_to_dispatch`
- `no_dispatchable_work`
- `no_open_work`
- `blocked`
- `paused`

The UI already has:

- a dispatch board;
- goal pause/resume/block actions;
- launch-work actions for selected ready tasks;
- continuation-task creation for active goals with no open work;
- scoped project and goal views;
- child-goal rollup;
- task rollup for a scoped goal.

So the core gap is not lack of entities, lack of task state, or lack of basic
dispatch support.

## Observed Current State

Global `next-work --limit 25` shows actionable work across multiple projects,
including:

- 3D Modeling and Game Development Learning;
- Kwipoo app;
- 3920 Silver Oak St.;
- Superstructure Program.

AMS v2 scoped continuity is clean after the prior repair. The global continuity
audit has one non-AMS idle goal:

- `goal_superstructure_world_model`
- title: `Develop the Present Earth / World Model application layer`
- issue: active goal with no open tasks and no active child goals.

This proves the next cross-project layer should surface continuity risk beside
dispatchable work. It should not hide idle goals behind long raw lists.

## Gap

The current operator console is a complete readback, not yet a strong operator
decision surface.

Specific gaps:

1. The global page is dense. It exposes many panels but does not first answer:
   "what needs my attention right now?"
2. Ready work, running work, review work, blocked work, paused goals, and idle
   continuity risks are split across separate sections or separate commands.
3. Project-level prioritization is weak. The operator sees global tasks, but not
   a compact per-project row that says: ready / running / review / blocked /
   idle-risk / recommended action.
4. `goal-continuity-audit` is useful but not integrated into the operator
   console read model or UI. Idle goals can be detected by CLI but are not part
   of the first operator view.
5. The UI duplicates some dispatch affordances across dispatch board, work
   queue, goal control, scoped goal summary, child goals, and task rollup. This
   is usable, but it raises maintenance and bloat risk if new cross-project
   panels are added without consolidation.

## What Not To Build

Do not build:

- a background scheduler;
- autonomous priority scoring;
- a new `Milestone`, `Workstream`, `Queue`, `Assignment`, or `ControlSession`
  entity;
- a separate governance/review app;
- a metrics dashboard detached from operator decisions;
- new status vocabulary;
- speculative model-routing policy;
- automatic cross-project work dispatch;
- a second task lifecycle.

The needed behavior can be expressed with existing projects, goals, tasks, runs,
reviews, decisions, memory, next-work, goal-triage, and continuity audit.

## Smallest Useful Slice

Add a compact cross-project attention summary to the v2 core operator console.

Working name:

`crossProjectAttention`

This should be a computed read-model field, not a persisted entity.

For each active project, show:

- project id and name;
- count of active/running goals;
- count of goals with dispatchable ready work;
- count of goals with running work;
- count of review items;
- count of blocked goals/tasks;
- count of idle active goals from continuity audit;
- the top recommended action;
- the selected task or goal that action points to, when available.

Recommended action values should reuse existing concepts:

- `review_output`
- `monitor_running_work`
- `start_ready_task`
- `resolve_blocker`
- `create_continuation_work`
- `inspect_project`
- `no_action`

These are presentation-level recommendations derived from existing state. They
should not become a new task or goal status vocabulary.

## Why This Slice

This directly supports the user workflow:

"Show me where attention should go next across all projects."

It also supports agent workflow:

"Select safe, actionable work without losing the long-term goal or ignoring
stalled project state."

It reduces the chance that future agents repeatedly ask "what next?" or focus
only on the current project because cross-project state is hard to scan.

## Acceptance Criteria For Implementation

An implementation task should pass when:

1. `readV2CoreOperatorConsole(db)` returns a bounded
   `crossProjectAttention` array when no project scope is provided.
2. The array is derived from existing records and existing read models.
3. It includes ready-work, review, running, blocked, paused, and idle-continuity
   signals.
4. It identifies the current top action per project without inventing a new
   lifecycle.
5. `/app/v2-core` renders the summary above the detailed dispatch board.
6. The UI does not duplicate all action forms in the summary; it links to the
   project/goal/task or uses existing dispatch where already supported.
7. Existing project-scoped and goal-scoped console behavior remains intact.
8. Tests cover global and scoped console behavior.

## Affected Files

Likely files:

- `src/lib/server/v2-core-service.ts`
- `scripts/v2-core-db.ts` only if CLI output shape or fixtures need adjustment;
  the command already returns the service object.
- `src/routes/app/v2-core/+page.svelte`
- `src/routes/app/v2-core/v2-core-page.server.spec.ts`
- `src/routes/app/v2-core/v2-core-page.svelte.spec.ts`
- possibly `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`

## Test Path

Focused validation:

```sh
npx vitest run src/routes/app/v2-core/v2-core-page.server.spec.ts
npx vitest run src/routes/app/v2-core/v2-core-page.svelte.spec.ts --project client
npx vitest run src/lib/server/v2-core-cli-work-loop-smoke.spec.ts -t "operator-console"
npm run v2:core-db -- operator-console --json
npm run v2:core-db -- goal-continuity-audit --json
npm run check
```

Use narrower test filters while iterating, then run the broader checks before
closeout.

## Recommended Follow-Up Task

Title:

`Add cross-project attention summary to operator console`

Summary:

Implement a computed, bounded `crossProjectAttention` read-model section in the
v2 operator console and render it at the top of `/app/v2-core`, so the operator
can see which projects need review, dispatch, blocker resolution, continuation
planning, or monitoring before reading detailed project panels.

Success criteria:

- global operator console shows one compact attention row per active project;
- rows include existing-state counts and one top action;
- idle-goal continuity risks are visible;
- no schema changes or new domain entities;
- existing dispatch and goal-control behavior remains unchanged.

## Decision

Proceed with the follow-up task above.

This is the best next implementation slice because it turns existing state into
a usable operator control surface without expanding the ontology.
