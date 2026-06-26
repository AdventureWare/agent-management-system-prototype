# Autonomous Goal-Directed Work Loop v0

## Goal Definition

AMS should let agents keep working toward active goals with minimal user intervention by selecting or creating appropriate next work, running or preparing agent tasks, recording results, updating state, and stopping only when done or legitimately blocked.

This target uses the existing AMS `Goal` concept. It is not a separate milestone abstraction. The current Goal is "Autonomous Goal-Directed Work Loop v0": AMS should enable AI agents to keep making legitimate progress toward active goals without requiring the user to repeatedly ask what is next, where the work stands, what is blocked, what needs approval, or whether the last task moved the goal forward.

The v0 loop should reuse existing projects, goals, tasks, task templates, workflows, skills, runs, threads, planning, readiness, review, approval, and project-memory records. Any new domain logic should be service/helper/controller logic that supports the existing Goal/Task/Run workflow, not a new product object called a milestone or engine.

## Current State Assessment

| Area | Assessment | Concrete repo state |
| --- | --- | --- |
| Goals | Partially usable; disconnected from the current managed task. | `Goal` already exists in `src/lib/types/control-plane.ts` with status, summary, success signal, parent goal, project IDs, task IDs, target date, planning priority, and confidence. Goal routes exist at `src/routes/app/goals`, `src/routes/app/goals/[goalId]`, `src/routes/api/goals`, and `src/routes/api/goals/[goalId]`. Goal context is included by `src/lib/workflow-prompts.ts`. This managed run resolved a project but no `goalId`, and `node scripts/ams-cli.mjs goal list --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1` returned a 500, so this planning task should document the active Goal rather than mutate persisted goal data. |
| Projects | Usable as-is for durable context; partially connected to continuation. | `Project` in `src/lib/types/control-plane.ts` stores `projectBrief`, `currentStateMemo`, `decisionLog`, `agentInstructionsPath`, setup notes, validation commands, coding conventions, approval requirements, default allowed/disallowed actions, default autonomy/risk/review, default rigor, constraints, non-goals, repo paths, artifact roots, sandbox, model, and skill policies. Project UI/API surfaces live under `src/routes/app/projects` and `src/routes/api/projects`. The missing piece is automatic or guided update after task results. |
| Tasks and subtasks | Usable as-is. | `Task` includes project/goal linkage, template/workflow linkage, parent task linkage, delegation packet/acceptance, execution contract fields, status, risk, approval mode, review requirement, dependencies, blockers, assignee/thread/run links, result/review metadata, and attachments in `src/lib/types/control-plane.ts`. Child handoff and decomposition routes exist at `src/routes/api/tasks/[taskId]/decompose` and `src/routes/api/tasks/[taskId]/child-handoff`. |
| Task status | Partially usable. | Status is currently `in_draft`, `ready`, `in_progress`, `review`, `blocked`, or `done` in `src/lib/types/control-plane.ts`. This is enough as the stored lifecycle. The loop still needs derived classifications such as actionable now, awaiting review, needs planning, needs research, needs clarification, approval required, unsafe, duplicate, or superseded. Those should be computed views, not necessarily new task statuses. |
| Blockers and dependencies | Usable as-is for v0; explanations need centralization. | Tasks have `blockedReason` and `dependencyTaskIds`; `taskHasUnmetDependencies`, `getOpenReviewForTask`, and `getPendingApprovalForTask` live in `src/lib/server/control-plane.ts`. `src/lib/server/autonomous-queue.ts`, `src/lib/server/delegation-readiness.ts`, `src/lib/server/planning.ts`, and `src/lib/server/workflows.ts` already reason about blockers and dependencies, but they do it for separate screens. |
| Planning | Partially usable. | Planning summaries and backlog buckets exist in `src/lib/server/planning.ts` and `/app/planning`. `docs/autonomous-work-queue-v0.md` and `src/lib/server/autonomous-queue.ts` select next work, while `buildPlannerPrompt` in `src/lib/workflow-prompts.ts` produces planner packets. Planner output is not yet captured as proposed tasks, blockers, questions, or state updates. |
| Workflows | Usable as-is for repeatable sequences. | `Workflow` and `WorkflowStep` exist in `src/lib/types/control-plane.ts`; `src/lib/server/workflows.ts` computes rollups, runnable task counts, dependencies, review gates, and parallelizable steps. Workflow pages live under `src/routes/app/workflows`. The goal loop should use workflow rollups for sequencing/parallelism instead of creating a duplicate workflow system. |
| Task templates | Usable as-is; should be reused for repeatable task shapes. | `TaskTemplate` mirrors task execution contract, governance, routing, skill, capability, tool, goal, and workflow fields in `src/lib/types/control-plane.ts`. Server/UI support exists in `src/lib/server/task-templates.ts`, `src/lib/server/task-template-form-actions.ts`, `src/lib/task-templates/editor.ts`, `src/lib/components/task-templates/TaskTemplateEditorForm.svelte`, and `/app/task-templates`. |
| Skills | Partially usable. | Skills are discovered by `src/lib/server/codex-skills.ts` and shown in `/app/skills`. Tasks/templates can require `requiredPromptSkillNames`. The repo-local `.agents/skills/ams-control-plane-operations/SKILL.md` gives managed-run control-plane guidance. The loop should use skill availability as an actionability factor but should not create a duplicate skill router for v0. |
| Runs and threads | Partially usable. | `Run` stores task ID, execution surface, provider, thread links, status, prompt digest/input, context summary, actions, validation, results, blockers, follow-up task IDs, rigor profile, model/usage/cost, and errors in `src/lib/types/control-plane.ts`. Thread launch/recovery lives in `src/lib/server/task-launch-planning.ts`, `src/lib/server/task-threads.ts`, routes under `src/routes/api/tasks/[taskId]/session-*`, and scripts under `scripts/`. Runs are good evidence records, but result-to-task/project/goal update behavior is not yet a full continuation loop. |
| Review and approval | Partially usable. | `Review` and `Approval` exist in `src/lib/types/control-plane.ts`; helper logic and sync live in `src/lib/server/control-plane.ts`; UI exists at `/app/governance`, task detail, and run detail. `docs/contextual-procedural-knowledge-v0.md` and `AGENTS.md` correctly say task detail and `/app/governance` are the decision surfaces, while runs are evidence. The loop needs more structured result classification and follow-up creation around these records. |
| Project memory/current state | Partially usable. | Project memory fields exist and are included in prompts by `src/lib/server/task-threads.ts` and `src/lib/workflow-prompts.ts`. Memory updates should happen through explicit project/task/run operations when a result changes project direction, constraints, validation expectations, or next work. |
| Readiness and delegation logic | Usable as-is for v0 classification. | `docs/progressive-delegation-readiness-v0.md` and `src/lib/server/delegation-readiness.ts` compute `CAPTURED`, `NEEDS_CLARIFICATION`, `NEEDS_PLANNING`, `NEEDS_RESEARCH`, `READY_FOR_EXECUTION`, `AWAITING_REVIEW`, and `AUTOMATION_CANDIDATE`, with missing information, risk flags, suggested actions, and rationale. Task detail and task list use the assessment. |
| Risk, autonomy, and rigor | Usable as-is; queue enforcement is partial. | `docs/task-readiness-autonomy-metadata.md`, `docs/contextual-rigor-profiles-v0.md`, `src/lib/rigor-profiles.ts`, `src/lib/server/delegation-readiness.ts`, `src/lib/server/task-launch-planning.ts`, and prompt builders support readiness, autonomy, risk, review, approval, and rigor profile. `src/lib/server/autonomous-queue.ts` excludes high/critical risk and A5 work, but profile-aware queue behavior remains future work. |
| Prompt and work-packet generation | Partially usable. | `src/lib/workflow-prompts.ts` builds planner, executor, research, and reviewer prompts from selected task/project/goal/run/review fields. `src/lib/server/task-threads.ts` builds managed-run prompts with project memory, validation, allowed actions, AMS CLI guidance, skills, and selected knowledge. The design is mode-aware and selective, but planner/result outputs still need structured ingestion. |
| Dashboards and queues | Partially usable; some overlap. | `/app/autonomous-queue` uses `src/lib/server/autonomous-queue.ts` to show recommended, blocked, needs-planning, and high-risk-review work. `/app/governance`, `/app/tasks`, `/app/planning`, `/app/runs`, and `/app/goals` expose adjacent pieces. The duplication/confusion risk is that queue, planning, governance, and goal detail each answer part of "what next?" instead of sharing one goal-loop classification. |
| AGENTS.md and durable agent instructions | Usable as-is with a minimal future update. | `AGENTS.md` points agents to goal-loop/readiness/rigor/contextual knowledge docs, says simple task capture stays lightweight, treats conflicts as defects, and requires result summaries and durable state updates when direction changes. |

## Required Behavior

AMS must be able to answer these questions from durable state and deterministic helper logic, with prompts used only to perform bounded work:

1. What is the active Goal?
2. Which projects, tasks, workflows, runs, reviews, approvals, and threads are connected to that Goal?
3. Which work is complete and accepted?
4. Which work is in progress?
5. Which work is awaiting review, approval, or child handoff?
6. Which work is blocked?
7. Which work is actionable now?
8. Why is each non-actionable task blocked or ineligible?
9. What should an agent do next?
10. Which tasks can run in parallel, and which depend on other tasks or workflow steps?
11. What requires user clarification?
12. What requires user approval?
13. What requires research or planning before execution?
14. What requires a safer or lower-autonomy mode?
15. What result did the last agent run produce?
16. Did that result advance the Goal's success criteria?
17. What task, run, review, approval, project, decision, memory, or goal state needs to be updated?
18. What follow-up work should be created?
19. Are the Goal success criteria met?
20. If the Goal is not met and no executable work remains, what planning, research, or clarification task should be created?

The answer should be explainable enough for the operator to trust the recommendation without reading every task or run. The answer should also be strict enough that AMS does not keep launching work that is blocked, risky, underspecified, awaiting review, or out of scope.

## Goal Success Criteria

The v0 Goal is complete when AMS can, using existing concepts as much as possible:

1. Represent or reference an active Goal with clear success criteria.
2. Link or associate projects, tasks, workflows, runs, reviews, approvals, and threads with that Goal.
3. Determine the current state of work for that Goal.
4. Classify tasks into useful derived states: actionable now, in progress, awaiting review, accepted/done, needs revision, blocked, needs clarification, needs research, needs planning, approval required, unsafe/out of allowed scope, duplicate, or superseded.
5. Explain why a task is or is not actionable.
6. Recommend the next task or set of tasks.
7. Identify when tasks can be worked in parallel versus when dependencies require sequencing.
8. Prepare a bounded agent/Codex work packet for an actionable task.
9. Record or ingest an agent run result.
10. Convert the run result into task, run, review, approval, project, decision, and goal state updates.
11. Create follow-up tasks from run results when needed.
12. Create planning, research, or clarification tasks when no execution task is currently available.
13. Stop and ask the user only for specific blockers, approvals, or decisions.
14. Avoid relying on the user to manually ask "what next?" after each task.
15. Avoid adding process that does not directly support the loop.

## Implementation Progress

As of June 25, 2026, the first goal-loop helper slices are implemented and accepted:

- Goal-scoped task classification exists in `src/lib/server/goal-work-loop.ts`.
- Next-action recommendation, parallel candidate selection, and planner/research/clarification fallback drafts exist in `src/lib/server/goal-work-loop.ts`.
- Goal detail surfaces the goal-loop recommendation and task classification summary.
- Run-result classification and proposed state-update preview exists in `src/lib/server/goal-run-result-preview.ts`.
- Run detail surfaces the run-result preview read-only for operator review.

The main remaining gaps are work-packet preparation from the selected recommendation, explicit guarded intent/API actions that consume run-result previews, follow-up task creation from run discoveries, and goal/project progress update previews.

## Work Selection Rules

A task is actionable for an agent only if:

- it is connected to the active Goal, a linked project, or an explicitly in-scope project
- it is not already accepted, done, cancelled, rejected, duplicate, or superseded
- it is not blocked by `blockedReason` or blocked status
- it is not awaiting review, approval, or child handoff acceptance
- all required task dependencies or workflow-step dependencies are complete or accepted
- it is within the current autonomy, risk, review, approval, and rigor limits
- it has enough clarity for the intended mode
- required context, tools, skills, execution surfaces, and access are available
- there is some way to validate or review the result

If a task is not actionable, AMS should classify why:

- dependency not complete
- missing user clarification
- missing research
- needs planning
- awaiting review
- approval required
- too risky for current autonomy level
- missing access, tool, execution surface, capability, or context
- insufficient acceptance or validation criteria
- no capable agent or required skill available
- out of scope for the current Goal
- duplicate or superseded

Selection order for v0:

1. Prefer resolving open review/approval/child-handoff gates before launching new execution when those gates block goal progress.
2. Prefer already-ready, low/medium-risk, validated tasks connected to the active Goal.
3. Prefer tasks whose dependencies are complete and whose workflow steps are parallelizable.
4. Prefer smaller bounded tasks when scores are otherwise close.
5. Route unclear work to planning, uncertain work to research, and user-intent gaps to clarification.
6. Exclude high/critical risk, A0, A5, production/high-stakes without approval, missing-tool, and unvalidated work from autonomous execution recommendations.

## Automatic Continuation Logic

AMS should not stop merely because a task is finished.

After a task/run result is accepted or recorded, AMS should:

1. Update the task/run state.
2. Update linked project/Goal progress if applicable.
3. Check whether dependent tasks or workflow steps became actionable.
4. Check whether follow-up tasks were created or should be created.
5. Check whether the Goal success criteria are now met.
6. If the Goal is not met, select the next actionable task.
7. If no actionable task exists, determine why.
8. If the issue is missing work definition, create or recommend a planning task.
9. If the issue is uncertainty, create or recommend a research task.
10. If the issue is missing user intent, ask a specific clarification question.
11. If the issue is approval or risk, request approval or downgrade to analysis-only mode.
12. If all remaining work is blocked, surface the minimal set of blockers for the user.

Continuation should be implemented as deterministic control-plane helper logic that can be called by queue, governance, task detail, goal detail, planning, and CLI/API surfaces. It should not depend on a long chat transcript, and it should not hide state changes inside prompt text.

## Planner Fallback

When the Goal is not complete but no actionable execution task exists, AMS should create or recommend a planning task that asks an agent to:

- review the active Goal
- review linked projects, tasks, workflows, runs, reviews, approvals, and threads
- review accepted/completed work
- review blockers and open questions
- review current project memory/docs
- identify remaining gaps
- create the next candidate tasks
- mark likely dependencies
- identify which tasks are safe for agent execution
- identify which tasks need research, clarification, or approval
- propose acceptance criteria for the next tasks

This planner fallback is part of the normal loop. It should not be modeled as a manual cycle-closeout or batch-planning ceremony. The Goal loop should be able to say "planning is the next appropriate work" whenever execution is unavailable.

Planner fallback output should be captured as draft/framed tasks, blocker updates, clarification questions, or project-memory suggestions through existing AMS task/project/decision paths. It should not remain only in a copied prompt or chat message.

## Result Handling

Agent results should be classified and converted into state changes:

| Result type | State changes | Next recommended action |
| --- | --- | --- |
| Completed and accepted | Mark task `done`; mark relevant review/approval approved; ensure latest run is `completed`; record validation/result summary; create decision record where appropriate; update project memory or Goal progress when direction changed. | Check Goal success criteria, then recommend newly unblocked or next actionable work. |
| Completed awaiting review | Keep or move task to `review`; create/open review or approval if required; attach artifacts; record run summary, validation summary, and result summary. | Route to `/app/governance` or task detail for review before more dependent work proceeds. |
| Partial completion | Record run as completed or blocked based on evidence; keep task `in_progress` or `blocked`; store remaining issues and partial result; create follow-up subtasks if bounded. | Recommend revision/planning for remaining work, or continue only if the next step is still within scope and allowed. |
| Needs revision | Mark task `blocked` or `review` with changes requested; preserve artifacts and validation gaps; optionally create focused revision task. | Recommend the smallest revision task that satisfies the original success criteria. |
| Blocked | Mark task `blocked`; store explicit blocker; record run blocker evidence; classify blocker as dependency, access/tool/context, clarification, research, approval, or scope. | Ask the specific question, request approval/access, or create planning/research work. |
| Failed | Mark run `failed`; keep task non-done; record error summary and validation failure; avoid treating attempted work as progress. | Recommend retry only if the cause is understood and bounded; otherwise create diagnosis task. |
| Out-of-scope follow-up discovered | Preserve the discovery in run/task notes; do not expand the current task silently. | Create or recommend a separate draft task only if it supports the active Goal or mark it out of scope. |
| Duplicate/superseded | Mark or classify task as non-actionable; reference the canonical task/result. | Continue with the canonical task or close duplicate during review. |
| Requires user decision | Open approval/clarification state or mark blocked with the decision needed. | Ask the smallest specific question or request approval; do not launch execution. |

## Progress Tracking

Progress toward the Goal should not be measured only by completed task count.

AMS should track:

- Goal success criteria satisfied
- accepted task outcomes
- blockers resolved
- important capabilities implemented
- validation passed
- review/approval completed
- follow-up work remaining
- rejected or failed work
- remaining gaps
- whether the system can continue without user intervention

For v0, progress can be computed as a goal-loop summary object that includes linked task counts, accepted outcomes, open gates, blocked reasons, actionable tasks, follow-up count, planner fallback status, and success-criteria coverage notes.

## Agent Drift Prevention

AMS should reduce agents trailing off, forgetting direction, or overbuilding by requiring:

- durable Goal/project instructions
- task-specific bounded work packets
- explicit allowed actions
- explicit stopping conditions
- current project/Goal context included selectively
- no reliance on long thread memory as the source of truth
- structured run result output
- result-to-state update after each run
- clear instruction to avoid duplicate abstractions
- clear instruction to avoid adding new pages/features unless tied to the Goal loop
- clear instruction to stop when ambiguity, risk, approval, or scope issues appear

`AGENTS.md` should point "Current Milestone" at this document and keep the active target in agent-facing language as "Autonomous Goal-Directed Work Loop v0." No separate closeout or batch-planning layer should be treated as a supporting abstraction.

## Minimal Implementation Plan

### 1. Anchor the Active Goal and Success Criteria

- Objective: Represent or clearly reference "Autonomous Goal-Directed Work Loop v0" using the existing `Goal` model and project linkage.
- Scope: Inspect/fix goal listing if needed, create or update the existing Goal only through supported AMS API/CLI if safe, and add success signal text. If persisted mutation remains unreliable, add a documented seed/current-state reference instead.
- Likely files/areas affected: `src/routes/api/goals`, `src/lib/server/agent-control-plane-api.ts`, `src/lib/server/control-plane.ts`, `data/control-plane.json` only through supported commands, docs if mutation is deferred.
- Dependencies: This document.
- Acceptance criteria: A running/active Goal can be read for the AMS project, has clear success criteria/success signal, and can be associated with tasks without creating any milestone abstraction.
- Risk level: Low-medium because goal API currently returned 500 in this run.
- Codex can safely implement now: Yes, after first reproducing the goal-list failure and using supported control-plane commands only.

### 2. Implement Goal-Scoped Actionability Classification

Status: Completed. Implemented in `src/lib/server/goal-work-loop.ts` with focused unit coverage.

- Objective: Add a reusable helper that classifies linked tasks for a Goal as actionable, in progress, awaiting review, accepted/done, needs revision, blocked, needs clarification, needs research, needs planning, approval required, unsafe/out of scope, duplicate, or superseded, with reasons.
- Scope: Pure/read-only helper first; reuse `taskHasUnmetDependencies`, review/approval helpers, `buildDelegationReadinessAssessment`, `resolveEffectiveRigorProfile`, queue validation quality, and workflow rollups.
- Likely files/areas affected: new or existing server helper under `src/lib/server`, tests near `autonomous-queue.spec.ts`, `delegation-readiness.spec.ts`, or a new goal-loop spec.
- Dependencies: Task 1 is helpful but not strictly required if the helper accepts `{ projectId, goalId }`.
- Acceptance criteria: Unit tests cover ready, dependency-blocked, review-blocked, approval-blocked, planning-needed, research-needed, high-risk/unsafe, and no-validation cases with explicit reason strings.
- Risk level: Low.
- Codex can safely implement now: Yes.

### 3. Add Next-Action Recommendation for an Active Goal

Status: Completed. The goal-loop helper now returns a recommendation with primary task IDs, parallel task IDs, reasons, and fallback task drafts.

- Objective: Recommend the next task or set of parallelizable tasks using the classification helper and existing queue/workflow logic.
- Scope: Read-only recommendation object with primary action, parallel candidates, blocked summary, and why each excluded task is not actionable.
- Likely files/areas affected: goal-loop helper/tests, possible reuse from `src/lib/server/autonomous-queue.ts` and `src/lib/server/workflows.ts`.
- Dependencies: Task 2.
- Acceptance criteria: Tests show review gates win before dependent execution, ready low-risk tasks are recommended, workflow-independent tasks can be parallel candidates, and no-actionable-work returns a planner/research/clarification recommendation.
- Risk level: Low.
- Codex can safely implement now: Yes after Task 2.

### 4. Add Planner Fallback Task Drafting

Status: Partially completed. Recommendation-only planner, research, clarification, and create-planning task drafts exist. Persisted task creation from those drafts remains future work and should happen only through a guarded action.

- Objective: When a Goal is incomplete and no execution task is actionable, create or recommend a bounded planning/research/clarification task using existing `Task` records.
- Scope: Start with recommendation/draft payload; only create a task through existing task create APIs when explicitly invoked by the operator or a managed intent.
- Likely files/areas affected: goal-loop helper, `src/routes/api/tasks`, `src/lib/server/agent-control-plane-api.ts`, planner prompt code in `src/lib/workflow-prompts.ts`.
- Dependencies: Task 3.
- Acceptance criteria: Fallback includes title, objective, scope, acceptance criteria, validation, dependencies, risk/autonomy/readiness, and classification as planning/research/clarification; no heavyweight mandatory metadata is added to basic task creation.
- Risk level: Medium.
- Codex can safely implement now: Yes as recommendation-only; saved creation should be separately reviewed.

### 5. Improve Agent Work Packet Preparation for Selected Tasks

- Objective: Use the next-action recommendation to prepare bounded planner, research, executor, or reviewer packets for the selected task without stuffing all context into prompts.
- Scope: Reuse `src/lib/workflow-prompts.ts` and `src/lib/server/task-threads.ts`; include active Goal context, reason for selection, allowed actions, stopping conditions, validation, and expected result shape.
- Likely files/areas affected: `src/lib/workflow-prompts.ts`, `src/lib/server/task-launch-planning.ts`, `src/lib/server/task-threads.ts`, prompt tests.
- Dependencies: Task 3.
- Acceptance criteria: Generated packets state why this task was selected, what mode it is in, what result structure to return, and when to stop; tests confirm unrelated project/task context is not dumped wholesale.
- Risk level: Medium.
- Codex can safely implement now: Yes after Task 3.

### 6. Add Run Result Classification and State Update Preview

Status: Completed as preview-only. The helper returns classification, confidence, reasons, proposed updates, next action, and follow-up task IDs. Run detail displays the preview read-only.

- Objective: Convert a latest run result into a proposed state update: accepted, awaiting review, partial, needs revision, blocked, failed, out-of-scope follow-up, duplicate/superseded, or requires user decision.
- Scope: Preview-first helper; use existing task status, review/approval records, run summaries, blockers, artifacts, and follow-up task IDs.
- Likely files/areas affected: task/governance helpers, `src/routes/app/runs/[runId]`, tests.
- Dependencies: Task 2 or Task 3.
- Acceptance criteria: For each result type, tests assert proposed task/run/review/approval updates and next recommended action; no automatic acceptance of ambiguous work.
- Risk level: Medium.
- Codex can safely implement now: Yes as preview-only.

### 7. Add Minimal Goal-Loop UI/API Integration

Status: Partially completed. Goal detail exposes goal-loop task classification and next action. Run detail exposes run-result preview. Remaining integration should focus on launch/work-packet preparation and guarded state transitions instead of more dashboard surface area.

- Objective: Expose current Goal progress, actionable work, blockers, open gates, planner fallback, and next recommended action in an existing surface.
- Scope: Prefer existing `/app/goals/[goalId]`, `/app/autonomous-queue`, `/app/governance`, `/app/tasks`, or `/app/planning`; do not add a random dashboard unless one existing surface cannot support the loop.
- Likely files/areas affected: goal detail route/page, autonomous queue route/page, governance page, task/planning pages, API route for goal-loop summary if needed.
- Dependencies: Tasks 2 and 3.
- Acceptance criteria: User can see active Goal state, next recommended action, reasons tasks are blocked/ineligible, review/approval needs, and planner fallback from one existing workflow path.
- Risk level: Medium.
- Codex can safely implement now: Not before the helper logic lands.

## Immediate Next Task

The single best next implementation task is Task 5: improve agent work-packet preparation for selected goal-loop tasks. The classification, recommendation, and run-result preview helpers already exist, so the next useful step is to make selected work launchable with a bounded packet that explains why the task was selected, what mode it is in, what context is relevant, and what result shape should come back.

Ready-to-paste Codex prompt:

```text
You are working in the Agent Management System prototype repo.

Implement the next read-only/work-packet helper for Autonomous Goal-Directed Work Loop v0: goal-loop selected-task work packet preparation.

Before editing, read AGENTS.md, docs/autonomous-goal-directed-work-loop-v0.md, docs/progressive-delegation-readiness-v0.md, docs/contextual-rigor-profiles-v0.md, and the existing helpers in src/lib/server/goal-work-loop.ts, src/lib/workflow-prompts.ts, src/lib/server/task-launch-planning.ts, src/lib/server/task-threads.ts, and src/lib/server/control-plane.ts.

Do not create a milestone model, engine, route, page, schema migration, or automatic launcher. Use the existing Goal, Project, Task, Workflow, Run, Review, Approval, readiness, risk, autonomy, rigor, dependency, blocker, and workflow-prompt concepts.

Add a read-only server helper that accepts control-plane data plus a selected goal-loop recommendation/task and returns a bounded work packet for planner, research, executor, or reviewer mode.

The packet should include active goal context, project/task identity, why the task was selected, mode, allowed actions, stopping conditions, validation expectations, relevant dependencies/gates, and a structured result shape the agent should return. Reuse `buildPlannerPrompt`, `buildExecutorPrompt`, `buildResearchPrompt`, and `buildReviewerPrompt` where appropriate instead of creating a second prompt system.

Add focused unit tests that prove the packet includes the selection reason and active goal context, routes planner/research/reviewer/executor modes correctly, includes validation and stopping conditions, and does not dump unrelated project/task context wholesale.

Keep task creation, launch behavior, and state mutation unchanged. Do not make broad UI changes. Run the relevant tests and report validation.
```

## What Not To Build

- new milestone abstraction separate from Goal
- manual cycle-closeout ceremony
- batch planning as a product ceremony
- random dashboards/pages not connected to goal-directed continuation
- heavyweight enterprise workflow
- mandatory metadata for every simple task
- duplicate task/workflow/skill/template systems
- prompt stuffing
- assuming all work is software development
- full autonomous merge/deploy/spend/contact behavior
- relying on thread memory instead of durable AMS state
- broad refactors before the current state is understood

## Open Questions

- Should AMS automatically create or update the persisted "Autonomous Goal-Directed Work Loop v0" Goal once the current goal-list API failure is resolved, or should this remain a documented project goal until the operator explicitly approves data mutation?
- Which existing surface should become the primary operator view for the goal loop: goal detail, autonomous queue, governance, tasks, planning, or a consolidated section inside one of those pages?
- When a run result appears complete and low-risk, may AMS mark it accepted automatically under any v0 conditions, or should every acceptance remain a review/approval decision?
