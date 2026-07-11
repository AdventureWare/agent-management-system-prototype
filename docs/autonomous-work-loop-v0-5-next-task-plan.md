# Autonomous Work Loop v0.5 Next Task Plan

Date: 2026-07-06

Source task: `task_ea2e9503-3683-4d9b-986f-c18255fd0e76`

## Purpose

This plan executes the materialized planning task for the running AMS long-term
Goal. It turns the current v0.5 evidence into concrete next candidate tasks
without adding a scheduler, new domain entity, duplicate workflow system, or
broad UI surface.

## Current State Summary

The v0.5 loop now has a usable production control path:

- `goal-loop get_operator_console` provides a shared operator path projection.
- Task detail, goal detail, governance, CLI/API, and MCP can read that path.
- A running Goal with only closed linked work now routes to continuation
  planning instead of `goal_complete`.
- Materializable fallback tasks require `validateOnly=true` preview first and
  explicit materialization; they are not auto-created or auto-launched.
- The previewed planning task was explicitly materialized as
  `task_ea2e9503-3683-4d9b-986f-c18255fd0e76`.
- Task-scoped operator-console and work-packet reads now resolve the selected
  task's own project and Goal before building recommendations or packets.

The remaining question is no longer "can AMS produce a next task?" It can. The
next question is whether the resulting task can be carried through a coherent
planning, run-result, review, and follow-up cycle without relying on chat memory
or manual operator reconstruction.

## Proposed Next Tasks

### 1. Run and close out the materialized planning task through AMS state

Outcome:

- The planning task has a recorded run result or equivalent structured result
  evidence that summarizes this plan, validation, remaining gaps, and proposed
  follow-ups.

Scope:

- Use existing run-result, review, task-loop, and work-packet commands.
- Record the result against `task_ea2e9503-3683-4d9b-986f-c18255fd0e76`.
- Verify task-loop readback after recording.

Non-goals:

- Do not auto-approve the result.
- Do not create a new closeout subsystem.
- Do not manually edit runtime SQLite or JSON state.

Acceptance criteria:

- The task has durable evidence of the planning result.
- `goal-loop get_task_loop_report --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76` reads back the latest result,
  review state, or next required action.
- The next operator path is explicit: review, revise, create follow-up task, or
  continue planning.

Validation:

- Run focused server tests that cover work packets, run results, goal-loop
  readback, and operator console.
- Run `npm run check`.
- Perform a token-authenticated CLI/API readback if a local operator API is
  available.

Risk/autonomy/readiness/review:

- Risk: low.
- Autonomy: `A2_AGENT_MAY_PROPOSE_PATCH`.
- Readiness: `R3_EXECUTABLE`.
- Review: `SUMMARY_REVIEW`.

Recommendation:

- Do this next. It tests whether the loop can close out the planning task it
  created without adding new architecture.

### 2. Add a regression smoke for task-only scope consistency across read models

Outcome:

- A focused smoke or integration test proves task-only input resolves the same
  project, Goal, task, recommendation, and packet across operator console,
  task-loop report, and work-packet readback.

Scope:

- Cover `goal-loop get_operator_console --task <taskId>`.
- Cover `goal-loop get_task_loop_report --task <taskId>`.
- Cover `work-packet get_agent_work_packet --task <taskId>`.
- Use fixture data with at least two projects and Goals so default-scope drift
  would fail.

Non-goals:

- Do not add a new routing layer.
- Do not change the domain model.
- Do not broaden the smoke into all CLI commands.

Acceptance criteria:

- The test fails if selected task context is paired with an unrelated default
  project or Goal.
- Existing focused work-loop tests remain green.

Validation:

- `npx vitest run src/lib/server/operator-goal-loop-console.spec.ts
  src/lib/server/agent-work-packets.spec.ts src/lib/server/task-loop-report.spec.ts
  --project server`
- `npm run check`

Risk/autonomy/readiness/review:

- Risk: low.
- Autonomy: `A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE`.
- Readiness: `R3_EXECUTABLE`.
- Review: `SUMMARY_REVIEW`.

Recommendation:

- Do after task closeout if readback still looks coherent. This hardens a real
  defect found during live use.

### 3. Decide the minimal reviewed-progress apply contract

Outcome:

- A short design note identifies the smallest acceptable contract for applying
  reviewed project/Goal progress updates from run evidence.

Scope:

- Inspect existing `run-result preview_progress_updates` and
  `apply_progress_updates` behavior.
- Identify what must be reviewed by a human before project or Goal memory
  changes.
- Identify whether the current commands are enough or need narrower
  affordances.

Non-goals:

- Do not implement new mutation helpers in this task.
- Do not add automatic project/Goal memory updates.
- Do not add a new decision-log entity.

Acceptance criteria:

- The note names the exact current commands and their gaps.
- It recommends one implementation task or explicitly defers changes.
- It preserves the invariant that agents do not self-approve review-gated
  progress updates.

Validation:

- Review against `docs/autonomous-goal-directed-work-loop-v0.md`,
  `docs/agent-facing-ams-interface-v0.md`, and current run-result tests.

Risk/autonomy/readiness/review:

- Risk: medium because it affects durable memory updates.
- Autonomy: `A1_AGENT_MAY_ANALYZE_AND_PROPOSE`.
- Readiness: `R2_SPECIFIED`.
- Review: `SUMMARY_REVIEW`.

Recommendation:

- Defer until after the planning task is closed out. It is important, but not
  the immediate loop-continuation proof.

### 4. Add a narrow continuation-runner design sketch only after closeout proof

Outcome:

- A small design sketch defines whether a runner should do anything beyond:
  read operator console, run validate-only preview when needed, report the
  proposed action, and stop for explicit creation/review.

Scope:

- Use existing `goal-loop get_operator_console`,
  `goal-loop materialize_suggested_task`, work-packet, run-result, and readback
  commands.
- Define stop conditions.
- Define what the runner must never auto-approve or auto-launch.

Non-goals:

- Do not implement the runner yet.
- Do not add scheduling, background agents, or autonomous execution.
- Do not bypass the explicit materialization policy.

Acceptance criteria:

- The sketch is small enough to reject or implement in one follow-up task.
- It maps each step to an existing command.
- It names the exact human approval/review gates.

Validation:

- Review against the v0.5 checkpoint and the task closeout evidence.

Risk/autonomy/readiness/review:

- Risk: medium.
- Autonomy: `A1_AGENT_MAY_ANALYZE_AND_PROPOSE`.
- Readiness: `R2_SPECIFIED`.
- Review: `SUMMARY_REVIEW`.

Recommendation:

- Defer. A runner should be justified by a completed task lifecycle, not by the
  existence of a next-action read model alone.

## Blockers and Questions

- No hard blocker is visible for the next implementation step.
- The main unresolved decision is whether planning-task closeout should be
  recorded immediately through existing run-result commands or first routed to a
  human summary review surface. The safer default is to record the result and
  request review, without approving it.
- The SQLite/JSON drift warning remains expected under the runtime data policy:
  `data/app.sqlite` is the writable source of truth; JSON is an explicit
  seed/export/import snapshot.

## Recommended Immediate Next Step

Create the smallest closeout path for `task_ea2e9503-3683-4d9b-986f-c18255fd0e76`
using existing AMS commands.

Implementation note:

- The preferred run-result path applies when a task has a run to close out.
  This materialized planning task did not have a run, so the supported closeout
  path is artifact attachment plus summary review.
- That path has now been executed: this artifact was attached to the task
  through `intent prepare_task_for_review`, and review
  `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2` was opened.

Original desired sequence, generalized:

1. Record this planning result as run evidence when a run exists, or attach the
   artifact directly to the task when no run exists.
2. Request summary review from that evidence or artifact.
3. Read back `goal-loop get_task_loop_report --task
   task_ea2e9503-3683-4d9b-986f-c18255fd0e76`.
4. Only after review, materialize or create the highest-priority follow-up task.

This advances the larger goal because it tests whether AMS can carry work it
created through evidence, review, and continuation using durable state rather
than conversation memory.
