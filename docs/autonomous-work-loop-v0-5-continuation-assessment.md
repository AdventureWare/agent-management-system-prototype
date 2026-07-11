# Autonomous Work Loop v0.5 Continuation Assessment

Date: 2026-07-06

Source task: `task_5d58d051-4512-46a9-8752-959dc969781e`

Goal: `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`

## Current Goal Status

The AMS long-term Goal is still `running`.

The prior continuation task,
`task_ea2e9503-3683-4d9b-986f-c18255fd0e76`, was reviewed and approved. That
closed the planning task as `done` and proved the following loop behavior:

- AMS can detect a running Goal with no open scoped work.
- AMS can create a continuation-planning task instead of stalling.
- A planning task can produce a durable artifact.
- The artifact can be attached to the task and submitted for summary review.
- The review can be previewed, approved, and read back through task-loop and
  operator-console state.
- After review approval, AMS can surface a new actionable continuation task.

The Goal is not complete yet. The remaining gap is not another broad design
document; it is hardening the concrete defect class discovered during live
runtime use: task-only scope drift across read models and work packets.

## Remaining Gap

During the v0.5 loop, task-only reads exposed context drift:

- `goal-loop get_operator_console --task <taskId>` could initially pair a
  selected task with an unrelated active Goal.
- `work-packet get_agent_work_packet --task <taskId>` had the same failure mode.

Targeted fixes and unit tests now exist for operator console and work-packet
helpers. The remaining confidence gap is cross-read-model coverage that proves
task-only scope consistency across the actual control-loop surfaces agents use
to continue work.

## Recommended Next Task

Title:

Add task-only scope consistency regression smoke for AMS goal-loop readback

Summary:

Create a focused regression smoke or integration test proving that task-only
input resolves the same project, Goal, task, recommendation, and packet across
operator console, task-loop report, and work-packet readback. The test should
use fixture data with at least two projects and Goals so default-scope drift
would fail.

Expected outcome:

A focused test fails if selected task context is paired with an unrelated
default project or Goal, and passes for the corrected task-first resolution
behavior.

Scope:

- Cover `goal-loop get_operator_console --task <taskId>`.
- Cover `goal-loop get_task_loop_report --task <taskId>`.
- Cover `work-packet get_agent_work_packet --task <taskId>`.
- Use fixture data with at least two projects and Goals.
- Keep the test in the existing server test layer; do not add broad UI or MCP
  coverage unless the existing helper coverage cannot prove the invariant.

Non-goals:

- Do not add new domain entities, status values, lifecycle states, or routing
  abstractions.
- Do not implement a continuation runner.
- Do not create more preview UI.
- Do not change runtime data as part of the test.

Acceptance criteria:

- A task-only operator-console read resolves the task's own project and Goal.
- A task-only task-loop report resolves the same project, Goal, and task.
- A task-only work-packet read resolves the same project, Goal, and task.
- The fixture contains a competing project/Goal that would be selected by a
  default-scope fallback if the bug regressed.
- Focused tests pass.
- `npm run check` passes.

Validation plan:

```sh
npx vitest run src/lib/server/operator-goal-loop-console.spec.ts src/lib/server/agent-work-packets.spec.ts src/lib/server/task-loop-report.spec.ts --project server
npm run check
```

Risk/autonomy/readiness/review:

- Risk: low.
- Autonomy: `A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE`.
- Readiness: `R3_EXECUTABLE`.
- Review requirement: `SUMMARY_REVIEW`.

## Recommendation

Continue the Goal by creating or accepting the task above. It is the smallest
implementation step that directly strengthens the autonomous work loop from
evidence gathered during live use.

Defer continuation-runner work until after this regression is locked down. A
runner should sit on top of reliable readback, not compensate for weak context
resolution.
