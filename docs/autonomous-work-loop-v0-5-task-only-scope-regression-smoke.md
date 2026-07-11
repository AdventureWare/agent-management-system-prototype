# Autonomous Work Loop v0.5 Task-Only Scope Regression Smoke

Date: 2026-07-06

Source task: `task_ec8a0d72-5832-4830-b8bd-d4a591bbf235`

Source recommendation: approved continuation assessment from
`task_5d58d051-4512-46a9-8752-959dc969781e`

## Purpose

This slice hardens the control-loop invariant discovered during live AMS use:
when an agent provides only a task id, all task-scoped readback surfaces must
resolve the selected task's own project and Goal instead of falling back to an
unrelated default active project or Goal.

## Change

Added a focused cross-surface regression test in
`src/lib/server/task-loop-report.spec.ts`.

The test builds fixture data with:

- a default project and Goal with `task_default`
- a selected project and Goal with `task_selected`

It then calls the three agent-facing control-loop surfaces with only the
selected task id:

- `buildOperatorGoalLoopConsole(data, { taskId: selectedTask.id })`
- `buildTaskLoopReport(data, selectedTask.id)`
- `buildAgentWorkPacketResponse(data, { command: 'get_agent_work_packet',
  taskId: selectedTask.id })`

The assertions prove all three surfaces resolve:

- `project_selected`
- `goal_selected`
- `task_selected`

and that the selected task appears in the recommendation, task-loop work-packet
pointer, and work-packet readback.

## Non-Changes

- No new domain entities.
- No new lifecycle states.
- No routing abstraction changes.
- No UI or MCP changes.
- No runtime data changes beyond the AMS task/review records used to manage
  this work.

## Validation

Focused validation:

```sh
npx vitest run src/lib/server/operator-goal-loop-console.spec.ts src/lib/server/agent-work-packets.spec.ts src/lib/server/task-loop-report.spec.ts --project server
```

Result: passed, 3 files / 22 tests.

Full check:

```sh
npm run check
```

Result: passed, 0 errors / 0 warnings.

## Review Recommendation

Approve after confirming the test covers the intended invariant and that the
scope stayed limited to regression coverage. The task should then close as done
unless a reviewer wants the same invariant moved into a dedicated smoke file.
