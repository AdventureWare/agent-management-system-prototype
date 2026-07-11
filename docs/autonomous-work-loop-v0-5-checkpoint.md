# Autonomous Work Loop v0.5 Checkpoint

Date: 2026-07-06

## Purpose

This checkpoint reviews whether the current Autonomous Goal-Directed Work Loop is
ready to be used as a practical control path for one active Goal, and identifies
the next implementation slice that would most directly improve that use.

This is not a new milestone abstraction. It is a checkpoint inside the existing
`Goal`/task/run/review/approval loop.

## Sub-Goal Being Advanced

The active sub-goal is to make AMS usable as a real autonomous work-control loop
for one project goal:

1. select the next useful task from durable state
2. prepare bounded work context
3. capture run evidence
4. route review, approval, blocker, and follow-up outcomes
5. read back task/goal state
6. recommend the next action without relying on chat memory

## Inspected Surfaces

### Goal Detail

Files:

- `src/routes/app/goals/[goalId]/+page.server.ts`
- `src/routes/app/goals/[goalId]/+page.svelte`

Findings:

- Goal detail uses `buildGoalWorkLoopClassification`.
- It exposes the goal-loop recommendation, counts, classifications, reasons,
  and parallel task candidates.
- This is currently the clearest Goal-scoped answer to "what should happen
  next?"

Risk:

- It is scoped to one Goal and does not show the operator-facing governance
  queue or broader autonomous queue context.

### Task Detail

Files:

- `src/lib/server/task-detail-page-data.ts`
- `src/routes/app/tasks/[taskId]/TaskDetailPageContent.svelte`
- `src/lib/components/tasks/TaskLoopReportPanel.svelte`

Findings:

- Task detail loads `buildTaskLoopReport`.
- The task loop report is the strongest per-task canonical readback surface.
- It covers classification, readiness, latest run, review, approval,
  dependencies, follow-ups, artifacts, decisions, work packet command, and next
  action.
- It is already aligned with agent-facing CLI/API/MCP readback.

Risk:

- Task detail is excellent after a task is selected, but it does not itself
  choose the next Goal-level task.

### Governance

Files:

- `src/lib/server/task-governance.ts`
- `src/routes/app/governance/+page.server.ts`
- `src/routes/app/governance/+page.svelte`

Findings:

- Governance correctly focuses on human intervention points: review, approval,
  blocked work, dependency-held work, and stale work.
- It uses shared `buildGoalLoopCountRows` and
  `GOAL_LOOP_OPERATOR_INTERVENTION_ROW_KEYS`.
- It has the right mutation surface for review/approval decisions.

Risk:

- Governance builds its queue from `buildTaskWorkItems`, stale signals, open
  reviews, pending approvals, and escalation rules rather than from the same
  Goal-loop recommendation object used by Goal detail.
- That is reasonable for an intervention inbox, but it can still present a
  different operational answer than Goal detail unless the relationship is made
  explicit.

### Autonomous Queue

Files:

- `src/lib/server/autonomous-queue.ts`
- `src/routes/app/autonomous-queue/+page.server.ts`
- `src/routes/app/autonomous-queue/+page.svelte`

Findings:

- Autonomous queue provides useful cross-project ranking for agent-suitable
  work.
- It uses shared `buildGoalLoopCountRows` and
  `GOAL_LOOP_AUTONOMOUS_QUEUE_ROW_KEYS`.

Risk:

- It has its own scoring, readiness, validation, constraint, and recommendation
  logic.
- It does not directly consume `buildGoalWorkLoopClassification` or
  `buildRecommendation`.
- This creates the highest risk of divergent answers to "what should the agent
  do next?"

### Planning

Files:

- `src/lib/server/planning.ts`
- `src/routes/app/planning/+page.server.ts`
- `src/routes/app/planning/+page.svelte`

Findings:

- Planning is a schedule/backlog planning surface, not the primary agent
  execution loop.
- It uses its own now/next/later scoring based on date, priority, status,
  target date, dependencies, execution-surface availability, and goal priority.

Risk:

- Planning should remain a planning surface. It should not become another
  agent-control loop.
- If it starts presenting execution recommendations, those recommendations
  should be explicitly described as planning pull, not agent actionability.

## Checkpoint Assessment

The current implementation is strong enough for a v0.5 stop-and-review
checkpoint:

- Goal detail can answer the Goal-level next-action question.
- Task detail can answer the task-level readback question.
- Governance can handle human review and approval intervention.
- Run-result closeout guidance and manifest playbooks now steer agents toward
  guarded conversion commands and task-loop readback.
- The production smoke test now starts from `goal-loop get_operator_console` and
  covers the core operator-path/read/recommend/packet/record/review/approval/
  progress/readback path.

The remaining issue is not a missing domain entity. It is operator coherence.
Several surfaces are useful, but they are not yet explicitly arranged around a
single operator path:

1. Goal detail: "What should happen for this Goal?"
2. Task detail: "What is the state of this selected task?"
3. Governance: "What requires human judgment?"
4. Autonomous queue: "What work looks suitable for agents?"
5. Planning: "What belongs in now/next/later planning?"

Those are valid views, but the product needs one canonical control-loop path so
operators and agents do not have to infer which surface owns the next move.

## Recommendation

Proceed with a narrow operator workflow consolidation slice.

Do not add:

- a new scheduler
- a new milestone entity
- a new task lifecycle
- a new dashboard
- automatic acceptance
- broad state-transition automation

Do add a shared read model or projection that makes the relationship between the
existing surfaces explicit.

## Proposed Next Slice

Name: Operator Goal-Loop Console Read Model

Status: Implemented as a read-only v0 slice.

Goal:

Create a shared server-side read model that tells existing UI surfaces how to
present the current operator path for a selected Goal or task.

The read model should answer:

- What is the current Goal-level recommendation?
- Which task, if any, is selected by the recommendation?
- Does the selected task need execution, review, approval, blocker resolution,
  planning, research, clarification, or no action?
- Which existing surface is the canonical place to act next?
- Which command/readback should an agent use next?

Likely source helpers:

- `buildGoalWorkLoopClassification`
- `buildTaskLoopReport`
- `buildGoalLoopCountRows`
- existing review/approval helpers
- existing work-packet command guidance

Likely new helper:

- `src/lib/server/operator-goal-loop-console.ts`

Likely first consumers:

- Goal detail
- Task detail
- Governance

Autonomous queue and planning should be aligned later, after the operator path
is clear.

Implemented behavior:

- `buildOperatorGoalLoopConsole` maps Goal-loop recommendations and selected
  task-loop reports into one operator path.
- The path identifies the kind of work, canonical surface, label, reason, href,
  selected task, and suggested commands.
- Goal detail displays the operator path beside the Goal recommendation.
- Task detail displays the same path beside the task loop report.
- Governance queue items carry the same path for review, approval, and
  escalation cards.
- Agent-facing CLI/API/MCP access is exposed as
  `goal-loop get_operator_console`.
- The implementation is read-only and uses existing Goal, task, run, review,
  approval, and classification helpers.
- The production work-loop smoke verifies that the operator console can select
  the actionable task, return the task-detail path, and provide the structured
  next commands an agent needs before reading the task report and work packet.
- A live read-side probe against `data/app.sqlite` for the running
  `Agent and work management system long-term vision` Goal now returns a
  planning path instead of `goal_complete` when all linked work is closed but
  the Goal itself is still `running`.

## Acceptance Criteria

The slice is done when:

1. A shared read model identifies the canonical next operator surface for at
   least execution, review, approval, blocker, planning fallback, and
   goal-complete cases. Status: done.
2. Goal detail uses the read model for the displayed next operator path.
   Status: done.
3. Task detail either uses the same read model or clearly links its
   `TaskLoopReport` next action to it. Status: done.
4. Governance uses the same read model for review/approval intervention labels
   or explicitly maps to it. Status: done.
5. Tests prove that Goal detail, task detail, and governance do not disagree on
   the next operator path for the same fixture states. Status: done for the
   current read-model seam; helper-level tests cover the path states, task-detail
   loader tests compare the loaded projection against the shared helper, and
   governance tests compare queue-item paths against the same helper.
6. No schema, lifecycle, or domain-entity changes are introduced. Status: done.
7. No automatic acceptance or scheduler behavior is introduced. Status: done.
8. The production smoke starts from `goal-loop get_operator_console` and proves
   the first continuation hop into task-loop report and work-packet readback.
   Status: done for in-memory fixture state; live managed-session evidence is
   still needed.
9. Active incomplete Goals do not silently stall when all linked work is closed.
   Status: strengthened. `buildRecommendation` now returns `goal_complete` only
   for explicitly `done` Goals; running Goals with no open work route to
   continuation planning.

## Why This Advances the Larger Goal

The larger AMS goal is to progressively replace external AI affordances with an
owned agent operating layer. One of the key external affordances is continuity:
"What are we doing, what happened, and what should happen next?"

The current system has most of the state and readback needed for that. The next
constraint is making the operator path coherent enough that an agent can use it
without relying on chat history or human re-orientation.

This slice would make AMS more capable of owning continuation.

## Explicit Non-Goals

- Do not implement v2.
- Do not replace the prototype architecture.
- Do not create a separate `Milestone` abstraction.
- Do not add task statuses.
- Do not merge planning, governance, and autonomous queue into one page.
- Do not make the autonomous queue the canonical Goal-level selector until its
  ranking model is reconciled with `buildGoalWorkLoopClassification`.
- Do not make planning recommendations look like agent execution recommendations.

## Validation To Run For The Next Slice

Minimum:

```sh
npm run test:agent-work-loop-smoke
npx vitest run src/routes/app/goals/[goalId]/goal-detail-page.server.spec.ts src/routes/app/tasks/[taskId]/task-detail-page.server.spec.ts src/routes/app/governance/governance-page.svelte.spec.ts --project server
npm run check
```

Adjust focused test paths if the implementation touches client components
instead of only server read models.

Latest focused validation:

```sh
npx vitest run src/lib/server/agent-work-loop-smoke.spec.ts src/lib/server/agent-goal-loop.spec.ts --project server
```

Result: passed, 2 files / 11 tests.

Live read-side evidence:

- `node scripts/ams-cli.mjs context current` and
  `node scripts/ams-cli.mjs manifest --resource goal-loop` could not run in
  this shell because `AMS_AGENT_API_TOKEN` was not set.
- A temporary read-only Vitest probe against `data/app.sqlite` showed the
  runtime store has 19 projects, 57 goals, 508 tasks, 499 runs, 866 reviews,
  and 10 approvals.
- Before the fix, the running AMS long-term Goal returned `goal_complete` with
  no selected task. After the fix, the same live Goal returns:
  `kind=planning`, `surface=planning`,
  `href=/app/planning?goalId=goal_5c952025-6248-46eb-882e-9cca1b5b17c3`,
  `recommendationKind=create_planning_task`, and suggested commands
  `goal-loop:materialize_suggested_task` and
  `goal-loop:get_next_recommended_action`.
- The live read emitted the existing SQLite/JSON drift warning, confirming
  `data/app.sqlite` is the runtime source of truth and `data/control-plane.json`
  is not current.

Token-authenticated CLI/API evidence:

- Started the local Vite operator API on `127.0.0.1:5187` with a temporary
  `AMS_AGENT_API_TOKEN`.
- `node scripts/ams-cli.mjs manifest --resource goal-loop` succeeded through
  `AMS_AGENT_API_BASE_URL=http://127.0.0.1:5187` and bearer auth.
- `node scripts/ams-cli.mjs goal-loop get_operator_console --goal
  goal_5c952025-6248-46eb-882e-9cca1b5b17c3` succeeded through the same
  token-authenticated path.
- The CLI/API response resolved project
  `project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`, Goal
  `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`, no selected task, and returned
  `path.kind=planning`, `path.surface=planning`, the planning href, and
  suggested commands `goal-loop:materialize_suggested_task` and
  `goal-loop:get_next_recommended_action`.
- This proves the operator-console projection is usable through the real
  agent-facing CLI/API path for live runtime state. A fully managed task/run
  context still needs a launched AMS run with `AMS_AGENT_TASK_ID` or
  `AMS_AGENT_RUN_ID`.

Managed-run context evidence:

- The CLI now resolves `goal-loop get_operator_console` from
  `AMS_AGENT_THREAD_ID`, `AMS_AGENT_TASK_ID`, or `AMS_AGENT_RUN_ID` when no
  explicit `--project`, `--goal`, or `--task` is passed.
- A token-authenticated probe with only
  `AMS_AGENT_RUN_ID=run_e221d0b1-d097-48eb-8000-80dd4705ec25` first resolved
  current context to task `task_53988cc6-19fd-48f9-aaf0-6ced681724df`, project
  `project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`, and Goal
  `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`.
- Running `node scripts/ams-cli.mjs goal-loop get_operator_console` with only
  that managed run env var succeeded through the bearer-token API and returned
  the Goal-level continuation path.
- The selected task was terminal, so `selectedTaskReport.nextAction.action` was
  `no_action`; the operator path correctly used the Goal recommendation instead:
  `path.kind=planning`, `path.surface=planning`, and suggested commands
  `goal-loop:materialize_suggested_task` and
  `goal-loop:get_next_recommended_action`.
- The operator path now includes `continuationPolicy.mode=explicit_validate_first`
  for materializable suggested task drafts. The policy is: run
  `goal-loop materialize_suggested_task` with `validateOnly=true` first, require
  an explicit command to create the draft task, and never auto-launch the new
  task.
- This closes the managed-context proof for a completed current run and keeps
  continuation materialization explicit instead of adding scheduler behavior.

Validate-only materialization evidence:

- `node scripts/ams-cli.mjs goal-loop materialize_suggested_task --json
  '{"validateOnly":true}'` now resolves missing `projectId`/`goalId` from
  managed-run context when `AMS_AGENT_THREAD_ID`, `AMS_AGENT_TASK_ID`, or
  `AMS_AGENT_RUN_ID` is set.
- A token-authenticated probe with only
  `AMS_AGENT_RUN_ID=run_e221d0b1-d097-48eb-8000-80dd4705ec25` previewed the
  suggested planning task without explicit goal/project payload fields.
- The response returned `validationOnly=true`, `wouldCreateTask=true`,
  `createdTask=false`, `dedupedExistingTask=false`, and
  `safety.taskStateChanged=false`.
- The proposed draft task was `Plan next work for Agent and work management
  system long-term vision`, status `in_draft`, risk `low`, autonomy
  `A1_AGENT_MAY_ANALYZE_AND_PROPOSE`, and review requirement
  `SUMMARY_REVIEW`.
- This proves the explicit continuation policy can be executed through a
  managed-run CLI path without mutating runtime state. The next operator choice
  is whether to run the same command without `validateOnly` to create the
  planning task.

Explicit materialization and readback evidence:

- The explicit create checkpoint was executed through the same token-authenticated
  managed-run CLI path, with
  `AMS_AGENT_RUN_ID=run_e221d0b1-d097-48eb-8000-80dd4705ec25` and no explicit
  project/goal payload fields.
- `node scripts/ams-cli.mjs goal-loop materialize_suggested_task --json '{}'`
  returned `createdTask=true`, `validationOnly=false`,
  `safety.mutation=goal_loop_fallback_task_created`, and
  `safety.taskStateChanged=true`.
- The created task is
  `task_ea2e9503-3683-4d9b-986f-c18255fd0e76`, titled `Plan next work for Agent
  and work management system long-term vision`, with status `in_draft`,
  readiness `R2_SPECIFIED`, risk `low`, autonomy
  `A1_AGENT_MAY_ANALYZE_AND_PROPOSE`, and review requirement `SUMMARY_REVIEW`.
- `goal-loop get_task_loop_report --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76` reads the durable task back as
  linked to project `project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1` and Goal
  `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`, classified as
  `needs_planning`, with next action `plan_task` and work-packet command
  `work-packet:get_agent_work_packet --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76`.
- Direct task-scoped operator-console readback exposed and then fixed a
  context-resolution defect: `goal-loop get_operator_console --task <taskId>`
  now resolves the selected task's own project and Goal before building the
  recommendation. This prevents the selected task from being paired with a
  default or unrelated active Goal.
- For the materialized planning task, direct task-scoped readback now returns
  project `Agent Management System Prototype`, Goal `Agent and work management
  system long-term vision`, `path.kind=planning`, `path.taskId` set to the new
  task, and `continuationPolicy.mode=read_only`. Materialization policy remains
  `explicit_validate_first` only for materializable fallback drafts.
- `work-packet get_agent_work_packet --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76` initially exposed the same class
  of context-resolution bug: a task-only packet request could fall back to an
  unrelated default active Goal before considering the selected task. The packet
  selector now resolves the task's project and Goal before building the
  classification.
- Post-fix work-packet readback resolves project
  `project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`, Goal
  `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`, and task
  `task_ea2e9503-3683-4d9b-986f-c18255fd0e76`. It returns
  `mode=planner`, `recommendationKind=plan_task`, includes only the selected
  task, and instructs agents to read before work with
  `goal-loop:get_task_loop_report` and `goal-loop:explain_task_eligibility`.

Planning task execution and review evidence:

- The bounded planning packet for
  `task_ea2e9503-3683-4d9b-986f-c18255fd0e76` produced
  `docs/autonomous-work-loop-v0-5-next-task-plan.md`.
- The plan recommends the next implementation target as closing out the
  materialized planning task through AMS review before creating further
  follow-up tasks. It proposes concrete follow-up candidates for task closeout,
  task-only scope regression coverage, reviewed-progress apply design, and a
  deferred continuation-runner sketch.
- `intent prepare_task_for_review` was run validate-only first. The preview
  resolved the task to the AMS project/Goal, found no existing open review, and
  reported `valid=true` with `action=requestReview`.
- The non-preview `intent prepare_task_for_review` then executed
  `context:current`, `task:attach`, `task:request-review`, and
  `context:current`.
- The planning artifact was attached as
  `attachment_8cdf54b8-0db3-4bc5-b127-0c2d24fb2ab0`, copied under
  `agent_output/task-attachments/task_ea2e9503-3683-4d9b-986f-c18255fd0e76/`.
- AMS opened review `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2` with summary:
  "Planning task result ready for summary review. Artifact proposes the next
  concrete AMS tasks and recommends closing out this planning task before
  creating further follow-ups."
- Post-mutation `goal-loop get_task_loop_report --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76` reads the task as status
  `review`, classification `awaiting_review`, readiness mode `AWAITING_REVIEW`,
  with `hasOpenReview=true`.
- Post-mutation `goal-loop get_operator_console --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76` routes to `path.kind=review`,
  `path.surface=governance`, and `href=/app/governance`.
- This proves the created continuation task has moved through artifact
  attachment and review request using supported AMS operations. The next
  required action is human or reviewer resolution of
  `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2`; agents should not
  self-approve it.

Review recommendation evidence:

- The source planning artifact was revised after review opened to clarify the
  supported closeout path: use run-result evidence when a run exists, and use
  direct artifact attachment plus summary review when no run exists.
- `docs/autonomous-work-loop-v0-5-plan-review-recommendation.md` was created as
  a reviewer-facing recommendation. It recommends approving the revised planning
  result after confirming the revised artifact is the version under review.
- A validate-only attempt to run `intent prepare_task_for_review` again correctly
  failed with `task_review_already_open`, proving AMS preserved the existing
  review gate instead of creating a duplicate review.
- The narrower `task attach` command attached the revised plan as
  `attachment_b03932d8-d9c6-4921-9bf5-0006672c7a5e`.
- The narrower `task attach` command attached the review recommendation as
  `attachment_156d2f72-e39f-4d52-9f11-3973b537bde4`.
- Post-attachment `goal-loop get_task_loop_report --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76` still reads the task as status
  `review`, classification `awaiting_review`, and open review
  `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2`. The task now has three
  attachments: the original plan, the revised plan, and the review
  recommendation.
- The next required action remains review resolution. If the review is approved,
  the recommended follow-up is the task-only scope consistency regression smoke;
  if changes are requested, revise the plan before creating more work.

Review resolution preview evidence:

- `task approve-review task_ea2e9503-3683-4d9b-986f-c18255fd0e76
  --validate-only true` returned `valid=true` for review
  `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2`.
- The approval preview reports that approving the review would close the task
  with resulting status `done` because no pending approval remains.
- `task request-review-changes
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76 --validate-only true` returned
  `valid=true` for the same review.
- The changes-requested preview reports that requesting changes would set the
  task to `blocked` with blocked reason `Changes requested during review.`
- These previews make the human decision explicit without mutating review state.

Current gate recheck:

- A later readback through `goal-loop get_task_loop_report --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76` confirmed the task is still status
  `review`, classification `awaiting_review`, with open review
  `review_0b8ba260-01b8-4ab1-894d-105da26d9ab2`.
- `goal-loop get_operator_console --task
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76` still routes to
  `path.kind=review`, `path.surface=governance`, and `href=/app/governance`.
- The gate remains intentionally unresolved. The next mutation must be one of
  the explicit reviewer actions already previewed:
  `task approve-review task_ea2e9503-3683-4d9b-986f-c18255fd0e76` or
  `task request-review-changes
  task_ea2e9503-3683-4d9b-986f-c18255fd0e76`.

Continuation assessment approval:

- `task_5d58d051-4512-46a9-8752-959dc969781e` was approved through
  `task approve-review` for review
  `review_27ee331a-8349-4edd-b283-ec0524213971`.
- Post-approval `goal-loop get_task_loop_report --task
  task_5d58d051-4512-46a9-8752-959dc969781e` read the task as status `done`
  with no open review or pending approval.
- AMS recorded decision
  `decision_df5a0247-8a19-46ad-b306-c908fec79efc` with decision type
  `review_approved`.
- Goal-level operator-console readback then returned a planning fallback
  because the approved artifact's specific task recommendation was not yet a
  durable task record.

Task-only regression smoke execution:

- The approved continuation recommendation was materialized as
  `task_ec8a0d72-5832-4830-b8bd-d4a591bbf235`, titled `Add task-only scope
  consistency regression smoke for AMS goal-loop readback`.
- The implementation added a focused cross-surface regression test in
  `src/lib/server/task-loop-report.spec.ts`.
- The fixture includes a competing default project/Goal and a selected
  project/Goal, then calls operator console, task-loop report, and work-packet
  readback with only the selected task id.
- The assertions prove all three surfaces resolve the selected task's own
  project, Goal, task, recommendation, task-loop work-packet pointer, and packet
  context.
- Evidence artifact:
  `docs/autonomous-work-loop-v0-5-task-only-scope-regression-smoke.md`.
- Focused validation passed:
  `npx vitest run src/lib/server/operator-goal-loop-console.spec.ts
  src/lib/server/agent-work-packets.spec.ts
  src/lib/server/task-loop-report.spec.ts --project server`
  returned 3 files / 22 tests passed.
- Full validation passed: `npm run check` returned 0 errors / 0 warnings.
- The evidence artifact was attached as
  `attachment_f4c045f7-ff94-4137-b8c6-58fdc728380e` and copied under
  `agent_output/task-attachments/task_ec8a0d72-5832-4830-b8bd-d4a591bbf235/`.
- AMS opened review `review_66b8cf2f-b308-4d6c-be94-82d268f398ce` with summary:
  "Task-only scope consistency regression smoke ready for summary review.
  Focused tests and npm run check passed."
- Post-mutation `goal-loop get_task_loop_report --task
  task_ec8a0d72-5832-4830-b8bd-d4a591bbf235` reads the task as status
  `review`, classification `awaiting_review`, with no pending approval.
- Review decision previews:
  `task approve-review
  task_ec8a0d72-5832-4830-b8bd-d4a591bbf235 --validate-only true`
  returned `valid=true` and would close the task as `done`.
  `task request-review-changes
  task_ec8a0d72-5832-4830-b8bd-d4a591bbf235 --validate-only true`
  returned `valid=true` and would set the task to `blocked`.
- The next required action is review resolution for
  `review_66b8cf2f-b308-4d6c-be94-82d268f398ce`; agents should not
  self-approve it.

Regression smoke review resolution and closeout assessment:

- `task approve-review
  task_ec8a0d72-5832-4830-b8bd-d4a591bbf235` approved review
  `review_66b8cf2f-b308-4d6c-be94-82d268f398ce` and closed the task as `done`.
- Post-approval readback recorded decision
  `decision_980d2706-44f9-4745-8399-167f8bfefa12` with decision type
  `review_approved`.
- AMS then created continuation-planning task
  `task_e230f3bd-9735-4a40-8656-7736cedc0b3f` because the long-term Goal is
  still `running` and had no open scoped work.
- The continuation task's work packet confirms the scope is planning and
  reconciliation only, with non-goal: "Do not implement new product work inside
  this continuation-planning task."
- The resulting closeout assessment is
  `docs/autonomous-work-loop-v0-5-closeout-assessment.md`.
- The assessment recommends closing v0.5 as complete enough for
  stop-and-review and choosing the next milestone intentionally, rather than
  creating another generic v0.5 continuation task.
- The closeout assessment was attached as
  `attachment_e7e146aa-ffbf-4e72-81ba-14515ec8f00a` and copied under
  `agent_output/task-attachments/task_e230f3bd-9735-4a40-8656-7736cedc0b3f/`.
- AMS opened review `review_0eaf2323-9b07-4159-8720-5e0903f7a15e` with summary:
  "v0.5 closeout assessment ready for summary review. Artifact recommends
  closing v0.5 as complete enough for stop-and-review and selecting the next
  milestone intentionally."
- Post-mutation `goal-loop get_task_loop_report --task
  task_e230f3bd-9735-4a40-8656-7736cedc0b3f` reads the task as status
  `review`, classification `awaiting_review`, with no pending approval.
- Review decision previews:
  `task approve-review
  task_e230f3bd-9735-4a40-8656-7736cedc0b3f --validate-only true`
  returned `valid=true` and would close the task as `done`.
  `task request-review-changes
  task_e230f3bd-9735-4a40-8656-7736cedc0b3f --validate-only true`
  returned `valid=true` and would set the task to `blocked`.
- The next required action is review resolution for
  `review_0eaf2323-9b07-4159-8720-5e0903f7a15e`; agents should not
  self-approve it.

Closeout approval:

- `task approve-review
  task_e230f3bd-9735-4a40-8656-7736cedc0b3f` approved review
  `review_0eaf2323-9b07-4159-8720-5e0903f7a15e` and closed the task as `done`.
- Post-approval readback recorded decision
  `decision_c789a28e-e32d-46df-b39b-52ba8932c437` with decision type
  `review_approved`.
- `goal-loop get_operator_console --goal
  goal_5c952025-6248-46eb-882e-9cca1b5b17c3` still returns
  `recommendation.kind=create_planning_task` because the broader long-term Goal
  remains `running` and has no open execution work.
- Do not materialize that generic planning task as more v0.5 work. The accepted
  closeout assessment intentionally pauses v0.5 at a stop-and-review checkpoint.
- The next distinct milestone should be chosen intentionally. The strongest
  candidate remains `Autonomous Work Loop v0.6: Managed continuation runner
  proof`.
