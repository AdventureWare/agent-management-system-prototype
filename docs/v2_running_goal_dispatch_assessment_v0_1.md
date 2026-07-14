# AMS v2 Running-Goal Dispatch Assessment v0.1

## Purpose

Assess the existing AMS v2 surfaces for the next milestone:
`Operate running goals with managed agent dispatch`.

This is not a new architecture. The current code already has most of the
dispatch loop. The next slice should tighten and prove it rather than creating a
parallel scheduler or workflow system.

## Existing Reusable Surfaces

- `next-work` selects ready/review/blocked task candidates under active goals.
- `agent-execution-cycle` selects next work and launches a provider-linked run.
- `launch-provider-run` records a run, marks the task `in_progress`, and returns
  an agent work packet.
- `managed-run-lifecycle` closes a run through artifact, review, acceptance, and
  task completion/follow-up behavior.
- `operator-console` already exposes goal groups, work queue state, selected
  task, current run, review queue, recent runs, artifacts, and memory.
- `/app/v2-core` already has goal pause/resume/block actions and a
  `dispatchGoalWork` action that launches selected next work through the
  provider-run path.
- `/app/v2-core/tasks/[taskId]` already shows current runs and closeout command
  guidance.

## Main Gaps

1. `next-work` does not currently exclude tasks with unresolved dependencies.
   This allowed dependent milestone tasks to appear dispatchable before their
   prerequisite task was done.
2. Parent goals need clearer child-work visibility. `goal-triage` now accounts
   for active child goals with open work, but `operator-console` should make the
   same parent/child path obvious to the operator.
3. The dispatch loop exists, but the UI does not yet make the full
   start-running-closeout-review-done path feel like one coherent operating
   surface.
4. The live state can include open runs under paused imported holding goals.
   Those should be visible as recovery/cleanup signals, not silently hidden.

## Smallest Safe Implementation Slice

1. Make `next-work` dependency-aware.
   - Ready tasks with unresolved dependencies should not be dispatch candidates.
   - Blocked/review tasks can remain visible because they require operator
     action rather than execution.
   - Add smoke coverage proving dependent ready tasks are suppressed until their
     dependencies resolve.

2. Reflect dependency-aware selection in `operator-console` and `/app/v2-core`.
   - The selected task in the goal work queue should match `next-work`.
   - Dependent tasks should appear in scoped task rollups, but not as launchable
     next work.

3. Prove the existing dispatch path end to end.
   - Use a temp DB smoke test to launch one selected task through
     `agent-execution-cycle` or UI-equivalent `launch-provider-run`.
   - Verify the task becomes `in_progress`, the run appears as current work, and
     `next-work` no longer selects it.
   - Close it out through `managed-run-lifecycle`.
   - Verify review/artifact/decision evidence and refreshed `next-work`.

4. Only after the service/CLI path is stable, polish the UI.
   - Keep `/app/v2-core` as the control surface.
   - Avoid a new dashboard or scheduler entity.
   - Add only the UI affordances needed to see runnable goals, current runs,
     blocked/review work, and closeout guidance.

## Non-Goals

- Do not add a scheduler entity.
- Do not create a new run/workflow system.
- Do not add a separate milestone abstraction.
- Do not auto-launch multiple goals until the single-dispatch loop is reliable.
- Do not make the UI a governance app; the point is operating active work.

## Recommended Next Task

Implement `next-work` dependency gating and prove that the existing dispatch
loop respects it. This is the narrowest change that prevents incorrect agent
dispatch and directly supports running goals.
