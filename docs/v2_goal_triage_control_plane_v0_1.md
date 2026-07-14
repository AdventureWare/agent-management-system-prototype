# AMS v2 Goal Triage Control Plane v0.1

## Purpose

`goal-triage` is a read-only control-plane report for deciding what active
AMS v2 goals can actually run now and which goals need operator cleanup.

It does not create tasks, pause goals, launch runs, or change state. It exists
to keep imported or long-running goals from silently becoming an undifferentiated
backlog.

## Command

```sh
npm run v2:core-db -- goal-triage --json
```

Useful scopes:

```sh
npm run v2:core-db -- goal-triage --project <project_id> --json
npm run v2:core-db -- goal-triage --goal <goal_id> --json
npm run v2:core-db -- goal-triage --limit 200 --json
```

Without `--limit`, the command returns up to 50 triage rows. Each goal includes
direct task counts plus active child-goal/open-child-task counts so parent goals
with runnable child work are not mistaken for stale cleanup candidates.

## Suggested Actions

- `start_ready_task`: goal has ready work and can be dispatched through
  `next-work` or `agent-execution-cycle`, or it has active child goals with
  open work.
- `monitor_in_progress`: goal already has an open run or in-progress task.
- `review_or_close`: goal has review work or completed work that should be
  evaluated before more tasks are created.
- `blocked_needs_decision`: goal or its only open work is blocked.
- `create_next_task`: active goal has no executable next task.
- `pause_candidate`: goal is paused already, or it is an imported active goal
  with no open actionable work and needs operator review.

## Current Live Probe

On the current imported v2 core database, the first global report showed:

- `start_ready_task`: 6
- `pause_candidate`: 4
- all other suggested actions: 0

That means the import/cleanup left a runnable queue, but also left several
historical imported goals active without actionable work. Those should be
reviewed before assuming they are still current.

## Operating Rule

Use `goal-triage` to choose or clean the goal layer. Use `next-work` to choose
the next executable task. Do not let this become a separate planning ceremony or
new entity model.
