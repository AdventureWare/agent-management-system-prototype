# Autonomous Goal-Directed Work Loop v0 Completion Audit

Date: 2026-07-06

## Purpose

This audit checks the current implementation against the success criteria in
`docs/autonomous-goal-directed-work-loop-v0.md`.

The result is not a claim that the milestone is complete. It separates proven
capabilities from partial or intentionally deferred behavior so the next work
can target real gaps instead of expanding the loop blindly.

## Summary

The production AMS now has a strong read/recommend/packet/record/readback loop:

- active Goal and task state can be inspected through goal-loop commands
- tasks are classified into derived work-loop states with reasons
- next actions and parallel candidates are computed by deterministic helpers
- per-task loop state is available through `goal-loop get_task_loop_report`
- bounded agent work packets are available through `work-packet get_agent_work_packet`
- run evidence, validation, blockers, follow-up recommendations, review requests,
  approval requests, blocked-task updates, progress previews, and selected reviewed
  progress updates are available through manifest-backed run-result commands
- CLI/API/MCP discovery is generated from the shared capability registry
- operator readback exists on task detail, goal detail, governance, and autonomous queue surfaces
- `npm run test:agent-work-loop-smoke` covers the main production loop sequence,
  starting from `goal-loop get_operator_console` and continuing through guarded
  review-request readback, approval-request readback, and accepted/completed
  goal progress readback

The milestone is close to a stop-and-review checkpoint, but it should not be
marked complete yet because several success criteria are only partially
satisfied:

- run-result conversion does not cover every listed state target automatically
- planning/research/clarification fallback can now be materialized into durable
  draft tasks through an explicit guarded command, rather than happening
  automatically during readback
- operator workflow consolidation has landed for the primary control path:
  goal detail, task detail, governance, and agent-facing CLI/API/MCP can now
  read the same operator path projection; autonomous queue and planning remain
  intentionally separate ranking/planning views
- live runtime-state probing found and fixed one anti-stall defect: a `running`
  Goal with only closed linked work could incorrectly recommend `goal_complete`
  instead of continuation planning
- prompt/context stuffing has been reduced through task-scoped prompt context,
  launch-context readback summaries, task-loop latest-run context readback, and
  manifest closeout playbooks, but the loop still depends on an agent/operator
  to follow the suggested command sequence

## Criteria Audit

| # | Criterion | Status | Evidence | Gap |
| - | --------- | ------ | -------- | --- |
| 1 | Represent or reference an active Goal with clear success criteria. | Met | `Goal` model in `src/lib/types/control-plane.ts`; goal-loop active-goal commands; `agent-work-loop-smoke.spec.ts` fixture goal has success signal and exercises `get_goal_success_criteria`. | Runtime active-goal quality depends on stored data. |
| 2 | Link projects, tasks, workflows, runs, reviews, approvals, and threads with that Goal. | Met for v0 readback | Existing models contain these links; `TaskLoopReport.associations` summarizes workflow and thread/run-thread IDs; production smoke proves project, goal, task, workflow, run, review, approval, decision, artifact, and thread association readback without new entities. | Workflow step-to-task mapping is still coarse because tasks link to workflows, not individual workflow steps. |
| 3 | Determine current state of work for that Goal. | Met | `src/lib/server/goal-work-loop.ts`; goal detail, autonomous queue, governance count rows; `goal-work-loop.spec.ts`. | None for v0 read model. |
| 4 | Classify tasks into useful derived states. | Met | `goal-work-loop.spec.ts` covers actionable, in-progress, awaiting review, accepted/done, needs revision, blocked, needs clarification, needs research, needs planning, approval required, unsafe, duplicate, and superseded cases. | Classification is derived, not stored, by design. |
| 5 | Explain why a task is or is not actionable. | Met | `explain_task_eligibility`, `TaskLoopReport`, and classification reasons. | None for v0 readback. |
| 6 | Recommend the next task or set of tasks. | Met | `buildRecommendation` in `goal-work-loop.ts`; `agent-goal-loop.spec.ts`; production smoke covers execute, review, approval, goal-complete, and next-actionable-after-accepted-work recommendations. | None for read-only recommendation. |
| 7 | Identify parallel versus sequenced tasks. | Met | `parallelTaskIds` in `GoalWorkLoopRecommendation`; dependency tests in `goal-work-loop.spec.ts`. | Workflow-step parallelism beyond task dependencies is less directly proven. |
| 8 | Prepare a bounded agent/Codex work packet. | Met | `src/lib/server/agent-work-packets.ts`; `agent-work-packets.spec.ts`; smoke includes work packet read; task-scoped prompt context keeps executor/research/reviewer prompts from dumping whole project memory. | Continue monitoring prompt size as packet modes evolve. |
| 9 | Record or ingest an agent run result. | Met | `src/lib/server/agent-run-results.ts`; `record_run_result`; `record_validation_result`; tests and smoke. | None for evidence capture. |
| 10 | Convert run result into task, run, review, approval, project, decision, and goal state updates. | Partial, strengthened | Run evidence updates, review request, approval request, blocked-task update, follow-up creation, progress preview, reviewed project/goal apply, preview-driven guarded next-command guidance, a result-conversion classification matrix, closeout-first run-result responses, and manifest closeout playbooks exist. Evidence-record responses and manifest discovery now point review, approval, blocker, revision, failure, follow-up, and user-decision cases toward the guarded conversion command that fits the preview. | No automatic acceptance path; not every target state is covered in one conversion flow; decision updates are mostly project decision-log proposals. |
| 11 | Create follow-up tasks from run results when needed. | Met | `run-result create_followup_task`; dedupe tests in `agent-run-results.spec.ts`. | Only run-evidence follow-ups are implemented; review/blocker-origin follow-ups can come later. |
| 12 | Create planning, research, or clarification tasks when no execution task is available. | Met for explicit v0 command | `GoalWorkLoopRecommendation.suggestedTaskDraft` produces planning/research/clarification drafts; `goal-loop materialize_suggested_task` validates, dedupes, and creates a durable draft task only when the current recommendation has a materializable fallback draft. | Creation is explicit and guarded, not automatic during readback. |
| 13 | Stop and ask the user only for specific blockers, approvals, or decisions. | Partial | Classification and recommendation route to blocker, approval, clarification, review, and unsafe modes; skill guidance enforces stopping conditions. | No first-class clarification object; some specificity depends on task summaries/blocker text. |
| 14 | Avoid relying on the user to manually ask "what next?" after each task. | Partial, strengthened | Current-context recommendations, `goal-loop get_operator_console`, task-loop report readback, run-result suggested commands, manifest readback, launch-context summaries, latest-run prompt/context readback, smoke support continuation across execution, review, approval, accepted-goal-complete, and accepted-work-with-next-task states, live runtime probing for a running AMS Goal with only closed work now returning continuation planning instead of `goal_complete`, and token-authenticated CLI/API probing for the same operator-console path. | There is no fully autonomous scheduler/runner; the loop still requires an agent/operator to call the next command, and the remaining proof needs a launched managed run with real task/run context. |
| 15 | Avoid adding process that does not directly support the loop. | Met so far | Recent slices were readback, registry, smoke, and view-model consolidation only; no duplicate milestone/task/workflow systems added. | Must remain a governance constraint for future work. |

## Implemented Gap Closure

The criterion 12 gap was closed by `goal-loop materialize_suggested_task`.

The command:

- uses the existing `Task` model and task-create path
- requires an explicit POST command and never auto-creates tasks during readback
- dedupes against open tasks in the same project/goal by normalized title
- supports `validateOnly`
- returns `goal-loop:get_task_loop_report` and
  `goal-loop:get_next_recommended_action` readback guidance
- is exposed through CLI/API/MCP via the shared capability registry

## Criterion 10 Strengthening

Criterion 10 remains partial, but run-result evidence recording now returns more
specific conversion guidance:

- completed-awaiting-review evidence suggests `run-result:request_review_from_run`
- completed approval-gated evidence suggests `run-result:request_approval_from_run`
- blocked evidence suggests `run-result:mark_task_blocked_from_run`
- partial, revision, failed, and follow-up evidence suggests
  `run-result:create_followup_task`
- user-decision evidence suggests run-evidence approval request and review/approval status commands

This improves agent steering without adding automatic acceptance or broad new
state transitions. A result-conversion matrix test now locks the preview
classification, next action, and proposed state-update resources together for
accepted, awaiting-review, partial, revision, blocked, failed, out-of-scope
follow-up, duplicate/superseded, and user-decision cases. The production smoke
now also proves the approval-gated path from completed run evidence through
validate-only approval request, pending approval creation, task-loop readback,
review-status readback, and next-action recommendation without approving the task.
It also proves accepted/completed evidence can be read back against Goal success
criteria and that AMS recommends either `goal_complete` or the next actionable
task, depending on remaining linked work.
The production smoke now also proves workflow and thread association readback
from existing `Task.workflowId`, `Task.agentThreadId`, `Run.threadId`,
`Run.agentThreadId`, and `Run.agentThreadRunId` fields through
`TaskLoopReport.associations`, without creating a new workflow or thread model.

## Latest Evidence Update

Recent slices strengthened the loop without adding schema, new lifecycle states,
or a scheduler:

- work packets now include command guidance for read-before-work, result
  recording, and post-mutation task-loop readback
- executor, research, and reviewer prompts use bounded task-scoped project
  context while planner prompts retain broader project memory
- launched control-plane runs populate the existing `Run.contextSummary` field
  with the launch prompt digest and exact structured readback commands
- run detail displays `Run.contextSummary` as captured execution input
- `TaskLoopReport.latestRun` exposes the latest run's `promptDigest` and
  `contextSummary` for CLI/API/MCP readback
- run-result evidence responses now put the relevant guarded closeout command
  first in `suggestedNextCommands`
- manifest discovery includes a `close_out_run_result` playbook that sequences
  manifest discovery, current-context readback, run evidence recording, the
  response-indicated conversion command, and task-loop readback
- `buildOperatorGoalLoopConsole` provides a shared read-only operator path for
  the resolved Goal or selected task
- goal detail, task detail, and governance display that projected operator path
- agent-facing CLI/API/MCP can read the same projection through
  `goal-loop get_operator_console`
- focused tests verify execution, review, approval, blocker, planning fallback,
  and goal-complete operator paths; task-detail loader and governance queue
  tests compare their loaded paths against the shared projection
- the production work-loop smoke now begins with `goal-loop get_operator_console`
  and verifies the console-selected task, task-detail path, suggested commands,
  task-loop report, work packet, run-result evidence, and review readback stay
  coherent
- live read-side probing against `data/app.sqlite` verified the running
  `Agent and work management system long-term vision` Goal now routes to
  continuation planning when no open linked work remains; the same probe also
  exposed that this shell lacked `AMS_AGENT_API_TOKEN`, so agent-facing CLI/API
  live validation initially remained environment-gated
- token-authenticated CLI/API probing then succeeded against a local operator
  API with a temporary bearer token: `manifest --resource goal-loop` and
  `goal-loop get_operator_console --goal
  goal_5c952025-6248-46eb-882e-9cca1b5b17c3` both returned through the real CLI
  path, with the operator console resolving the running AMS Goal to
  continuation planning
- managed-run context probing then succeeded with only `AMS_AGENT_RUN_ID` set:
  the CLI resolved current context, passed the resolved project/goal/task scope
  into `goal-loop get_operator_console`, and the operator path handed off from
  the terminal selected task to the Goal-level continuation planning
- the operator path now carries an explicit continuation policy for
  materializable suggested tasks: preview with `validateOnly=true`, create only
  through the explicit materialization command, and do not auto-launch
- validate-only materialization probing then succeeded with only
  `AMS_AGENT_RUN_ID` set: the CLI resolved managed context, sent the preview
  request with resolved project/goal scope, and returned `validationOnly=true`,
  `wouldCreateTask=true`, `createdTask=false`, and `taskStateChanged=false`

This closes most of the earlier prompt-boilerplate, operator-path coherence,
bearer-token CLI/API, and managed-run context gaps. The remaining v0 gap is not
more prompt text or another dashboard; it is whether a future runner should do
anything beyond invoking the existing explicit materialization command with
validation and readback.

## Best Next Implementation Target

The stop-and-review checkpoint for Autonomous Work Loop v0.5 is recorded in
`docs/autonomous-work-loop-v0-5-checkpoint.md`. The current implementation has
enough readback, launch-context, closeout, manifest-discovery, operator-path,
agent-facing command evidence, continuation materialization evidence, review
closeout evidence, and task-only scope regression coverage to evaluate v0.5 as a
usable control-plane path before adding more behavior.

The previous planning and regression tasks have been reviewed and closed:

- `task_ea2e9503-3683-4d9b-986f-c18255fd0e76` closed as `done` after approval
  of `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2`.
- `task_5d58d051-4512-46a9-8752-959dc969781e` closed as `done` after approval
  of `review_27ee331a-8349-4edd-b283-ec0524213971`.
- `task_ec8a0d72-5832-4830-b8bd-d4a591bbf235` closed as `done` after approval
  of `review_66b8cf2f-b308-4d6c-be94-82d268f398ce`.

The closeout artifact
`docs/autonomous-work-loop-v0-5-closeout-assessment.md`, from
`task_e230f3bd-9735-4a40-8656-7736cedc0b3f`, has been approved through
review `review_0eaf2323-9b07-4159-8720-5e0903f7a15e`, closing the task as
`done`. Treat v0.5 as complete enough for stop-and-review.

If implementation continues, the best next milestone is a narrow managed
continuation-runner proof that wraps existing explicit AMS commands with
validate-only previews, task-loop readback, and hard stops at review, approval,
blocker, clarification, unsafe, or missing-access gates. Avoid broad scheduler
behavior or autonomous execution.
