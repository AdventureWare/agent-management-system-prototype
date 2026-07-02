# Agent-Facing AMS Interface v0

## Purpose

AMS should be usable by AI agents through structured tools, APIs, and durable state, not only through human UI paths or copied prompt instructions. Prompt text can orient an agent, but AMS state and AMS operations should remain the source of truth for goals, tasks, context, runs, blockers, approvals, reviews, and next actions.

The purpose of the Agent-Facing AMS Interface v0 is to support the Autonomous Goal-Directed Work Loop:

Given an active `Goal`, agents should be able to find actionable work, do or prepare allowed work, record results, update state, create follow-up work, and stop only when the goal is met or legitimately blocked.

This design reuses the existing `Goal` concept. It does not introduce a milestone abstraction, duplicate tasks, duplicate workflows, duplicate skills, duplicate run records, or a separate planning system.

## Current State Assessment

The current working tree is broad and in progress. The assessment below references existing and uncommitted files as the present repo state, not necessarily committed baseline.

| Area                                | Classification                          | Current repo state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Agent-facing implication                                                                                                                                                                                                                                        |
| ----------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goals                               | Usable by agents now                    | `Goal` and `GOAL_STATUS_OPTIONS` live in `src/lib/types/control-plane.ts`. App/API routes exist at `src/routes/app/goals`, `src/routes/app/goals/[goalId]`, `src/routes/api/goals`, and `src/routes/api/goals/[goalId]`. Agent list/get/create/update support exists in `src/lib/server/agent-control-plane-api.ts`, `scripts/ams-cli.mjs`, and `/api/agent-capabilities`. Goal-scoped classification exists in `src/lib/server/goal-work-loop.ts`; goal detail uses it through `src/routes/app/goals/[goalId]/+page.server.ts` and `+page.svelte`. Manifest-backed goal-loop routes exist under `/api/agent-goal-loop/*`.                                                                                                                            | Agents can list and inspect goals and use `list_active_goals`, `get_goal_context`, `get_goal_progress`, `get_goal_success_criteria`, `get_goal_blockers`, `get_actionable_work`, `get_blocked_work`, `get_awaiting_review`, `get_next_recommended_action`, and `explain_task_eligibility` through CLI/API/MCP. |
| Projects                            | Usable by agents now                    | `Project` stores project memory, current state, decisions, instructions path, validation commands, constraints, non-goals, roots, sandbox defaults, default autonomy/risk/review/rigor, and skill policy in `src/lib/types/control-plane.ts`. Project API support exists in `src/routes/api/projects`, `src/lib/server/agent-control-plane-api.ts`, and the manifest/CLI.                                                                                                                                                                                                                                                                                                      | Agents can read and update projects now. Future tools should expose a more selective `get_project_context` rather than requiring agents to parse full project records or prompt text.                                                                           |
| Tasks/subtasks                      | Usable by agents now                    | `Task` includes goal/workflow/template links, parent task links, dependency IDs, delegation packet fields, execution contract fields, status, risk/autonomy/readiness/rigor, review/approval metadata, run/thread links, blockers, and attachments in `src/lib/types/control-plane.ts`. Task create/update/list/get and attachment operations are exposed through `src/routes/api/tasks`, `src/lib/server/agent-control-plane-api.ts`, `scripts/ams-cli.mjs`, and the MCP plugin. Subtask/delegation support exists in `src/routes/api/tasks/[taskId]/decompose`, `src/lib/server/task-decomposition-action.ts`, and `src/lib/server/task-child-handoffs.ts`. | The raw operations exist. `run-result create_followup_task` now creates or links a draft follow-up task from run evidence with same-project/goal title dedupe. Remaining gaps are first-class task-to-goal/dependency helper commands and richer source-reason metadata beyond the current run evidence path. |
| Task status                         | Partially usable                        | Stored statuses are `in_draft`, `ready`, `in_progress`, `review`, `blocked`, `done`, and `canceled` in `src/lib/types/control-plane.ts`. `done` is completed work; `canceled` is terminal non-actionable work that should not appear in open queues. Derived readiness modes are computed by `src/lib/server/delegation-readiness.ts`. Goal-loop classifications such as `actionable_now`, `awaiting_review`, `needs_planning`, and `approval_required` are computed in `src/lib/server/goal-work-loop.ts`.                                                                                                                                                                                                                                                                                            | Stored lifecycle is adequate. Agents need structured derived classifications and explanations instead of inventing status semantics from prompt text.                                                                                                           |
| Blockers/dependencies               | Partially usable                        | Tasks have `blockedReason` and `dependencyTaskIds`. Helpers such as `taskHasUnmetDependencies`, `getOpenReviewForTask`, and `getPendingApprovalForTask` live in `src/lib/server/control-plane.ts`. Goal-loop helpers explain unmet dependencies in `src/lib/server/goal-work-loop.ts`. `get_goal_blockers`, `get_blocked_work`, `explain_task_eligibility`, `record_blocker`, and `mark_task_blocked_from_run` are manifest-backed.                                                                                                                                                                                                                                                                                                                                                 | Agents can inspect blockers and record run blocker evidence now. Blocker type, open question, missing access, and research-vs-clarification remain mostly inferred, and there is no first-class clarification object yet. |
| Planning                            | Partially usable                        | Planning routes exist under `src/routes/app/planning`. Planner prompt generation lives in `src/lib/workflow-prompts.ts`. Goal-loop fallback task drafts exist in `src/lib/server/goal-work-loop.ts`, and autonomous queue helpers can identify tasks that need planning.                                                                                                                                                                                                                                                                                                                                        | Planning still often exits as prose. Agent-facing tools should turn planner output into draft/framed tasks, blockers, questions, or task updates through existing task/project APIs.                                                                            |
| Workflows                           | Human-UI-only / partially usable        | `Workflow` and `WorkflowStep` exist in `src/lib/types/control-plane.ts`. Server logic in `src/lib/server/workflows.ts` computes rollups, runnable task counts, blockers, and parallelizable steps. UI routes live under `src/routes/app/workflows`.                                                                                                                                                                                                                                                                                                                                                                                                                            | Workflows are useful state, but they are not yet first-class in the manifest/MCP surface. Defer broad workflow mutation tools; v0 agent work selection should consume workflow state through goal/task classification.                                          |
| Task templates                      | Human-UI-only / partially usable        | `TaskTemplate` mirrors task execution contract and governance fields in `src/lib/types/control-plane.ts`. Server/UI support exists in `src/lib/server/task-templates.ts`, `src/lib/server/task-template-form-actions.ts`, `src/lib/task-templates/editor.ts`, and `/app/task-templates`.                                                                                                                                                                                                                                                                                                                                                                                       | Agents should not create a duplicate template system. Template read/apply tools can come later; v0 can recommend templates as relevant context when generating work packets.                                                                                    |
| Skills                              | Partially usable                        | Repo-local skills live under `.agents/skills`. Installed Codex skills are discovered by `src/lib/server/codex-skills.ts` and shown under `/app/skills`. Tasks/templates can require `requiredPromptSkillNames`. The AMS control-plane skill is `.agents/skills/ams-control-plane-operations/SKILL.md`; the agent work-loop skill now lives at `.agents/skills/ams-agent-interface/SKILL.md`.                                                                                                                                                                                                                                                                                   | Skills guide agent behavior, but they should not be the source of truth for state. The agent-interface skill should teach the structured Goal/task/run/review loop while the control-plane skill covers lower-level CLI/API/MCP discipline.                     |
| Runs/threads                        | Usable for launch, coordination, and result evidence | `Run` stores status, task/thread links, prompt input/digest, context summary, actions, validation, result summaries, blockers, follow-up task IDs, model/usage/cost, and effective rigor profile in `src/lib/types/control-plane.ts`. Launch/recovery lives in `src/lib/server/task-launch-planning.ts`, `src/lib/server/task-session-actions.ts`, `src/lib/server/task-threads.ts`, and task session routes. Thread APIs live under `src/routes/api/agents/threads`. Run-result routes live under `src/routes/api/agent-run-results/[command]` and are backed by `src/lib/server/agent-run-results.ts`.                                                                                                                                                                                                          | Run launch, thread coordination, result recording, validation recording, blocker recording, follow-up recommendations, draft follow-up creation, review request from run evidence, blocked-task update from run evidence, project/goal progress previews, and selected reviewed progress application are agent-usable now through manifest-backed CLI/API/MCP. |
| Review/approval                     | Usable by agents now / partially usable | `Review` and `Approval` are modeled in `src/lib/types/control-plane.ts`. Governance actions live in `src/lib/server/task-governance.ts`, task API routes under `src/routes/api/tasks/[taskId]/review-*` and `approval-*`, CLI commands, and manifest playbooks. `/app/governance` is the human decision surface.                                                                                                                                                                                                                                                                                                                                                               | Agents can request review/approval and apply decisions when authorized. v0 should distinguish `submit_for_review`, `request_user_approval`, and `get_review_status`, with dry-run support for higher-risk mutations.                                            |
| Project memory/current state        | Partially usable                        | Project memory fields exist on `Project`. Launch prompts include current state and decision log through `src/lib/server/task-threads.ts` and `src/lib/workflow-prompts.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                     | Agents should update durable project state only through structured project update or future memory-update draft tools. Chat memory should not be treated as project memory.                                                                                     |
| Readiness/delegation logic          | Usable by agents now as domain logic    | `src/lib/server/delegation-readiness.ts` computes `CAPTURED`, `NEEDS_CLARIFICATION`, `NEEDS_PLANNING`, `NEEDS_RESEARCH`, `READY_FOR_EXECUTION`, `AWAITING_REVIEW`, and `AUTOMATION_CANDIDATE`. It is used by task detail/list and by goal-loop classification.                                                                                                                                                                                                                                                                                                                                                                                                                 | This should back `explain_task_eligibility` and work-selection tools. It should not be reimplemented inside prompts or MCP handlers.                                                                                                                            |
| Risk/autonomy/rigor                 | Partially usable                        | Task autonomy, risk, review, approval, and rigor fields live in `src/lib/types/control-plane.ts`. Rigor guidance is in `src/lib/rigor-profiles.ts`. Launch planning and readiness use these fields in `src/lib/server/task-launch-planning.ts` and `src/lib/server/delegation-readiness.ts`.                                                                                                                                                                                                                                                                                                                                                                                   | Agents can inspect these fields now. Mutation tools must enforce them instead of merely asking the model to behave. High-stakes and A5 actions should remain approval-gated.                                                                                    |
| Prompt/work-packet generation       | Usable as an agent-facing packet surface | Mode-specific prompts live in `src/lib/workflow-prompts.ts`. Goal-loop work packets live in `src/lib/server/goal-work-packets.ts`, and `src/lib/server/agent-work-packets.ts` exposes `work-packet get_agent_work_packet` through `/api/agent-work-packets/get_agent_work_packet`, CLI, and MCP. Managed-run prompts are built by `src/lib/server/task-threads.ts`. Task execution UI displays packet details in `src/lib/components/tasks/TaskExecutionPanel.svelte`.                                                                                                                                                                                                                                                                                                                                                                       | Work packets are now selective structured outputs with an optional rendered prompt. Remaining work is prompt boilerplate reduction in managed-run launch prompts and continued migration from repeated prose instructions to manifest/context/work-packet readback. |
| Existing APIs/routes/server actions | Usable by agents now / partially usable | Agent-facing capability discovery is in `src/routes/api/agent-capabilities/+server.ts` and `src/lib/server/agent-capability-manifest.ts`. Current context is in `src/routes/api/agent-context/current/+server.ts` and `src/lib/server/agent-current-context.ts`. Read-only intent interpretation is exposed at `src/routes/api/agent-intent-interpretation/[command]/+server.ts` through `intent interpret_intent`; mutation intent wrappers remain in `src/routes/api/agent-intents/[intent]/+server.ts` and `src/lib/server/agent-intent-actions.ts`. Goal-loop, work-packet, run-result, review, project, goal, task, and thread routes are listed in `docs/ams-cli-reference.md`; generated MCP definitions are backed by the same capability registry.                                                                                                                                                                                                            | The foundational manifest-backed API/MCP surface exists. The next v0 work should reduce prompt boilerplate, consolidate operator workflows, and expose only guarded state transitions with validation and readback. |
| AGENTS.md or durable instructions   | Usable by agents now                    | `AGENTS.md` points to goal-loop/readiness/rigor/context docs, warns against duplicate abstractions and manual paste/import flows, and requires concise result summaries.                                                                                                                                                                                                                                                                                                                                                                                                                                         | Keep `AGENTS.md` short; detailed agent-usage behavior belongs in a skill and API docs.                                                                                                 |

## Prompt Boilerplate Audit

| Current location                                                                       | What it does                                                                                                                                                                                  | Better home                                                           | Recommendation                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/task-threads.ts` `buildTaskThreadPrompt()` coordination section        | Injects a long map of AMS CLI commands, manifest usage, current-context commands, intent examples, thread commands, environment variables, and failure guidance into each managed-run prompt. | API/tool call, MCP tool, Skill instructions, and short prompt pointer | Move command discovery to `/api/agent-capabilities`, MCP metadata, and `.agents/skills/ams-agent-interface/SKILL.md`. Keep only a short prompt instruction: discover capabilities, resolve current context, use structured tools, read back state.                                                  |
| `docs/ams-cli-reference.md` and `.agents/skills/ams-control-plane-operations/SKILL.md` | Provide reliable operational guidance for CLI/API use.                                                                                                                                        | Skill instructions and documentation                                  | Keep these. They are useful fallback docs, but managed prompts should link to or summarize them rather than copying large sections.                                                                                                                                                                 |
| `src/lib/workflow-prompts.ts` planner/research/executor/reviewer packets               | Include task contract, project memory, goal context, rigor guidance, recent runs, and result-shape instructions.                                                                              | Prompt/work-packet generation backed by structured app state          | Keep as prompt text temporarily, because it is task-specific execution guidance. Tighten by returning structured packet sections from domain logic so future agents can consume JSON rather than only prose.                                                                                        |
| `src/lib/server/goal-work-packets.ts` `wrapPrompt()`                                   | Wraps base prompts with goal-loop stopping conditions, expected result shape, and selection reason.                                                                                           | Prompt/work-packet generation plus API output                         | Keep, but expose the same data as structured fields. The prompt should be a rendering of the packet, not the packet's only representation.                                                                                                                                                          |
| Task summary text in managed-run prompts                                               | Current task instructions can contain large copied task specs.                                                                                                                                | Structured task fields                                                | Important execution contract data should be stored on `Task`: `expectedOutcome`, `scope`, `nonGoals`, `successCriteria`, `readyCondition`, `validationSteps`, risk/autonomy/review/approval fields, dependencies, and blockers. Summary should remain human-readable, not become the only contract. |
| Project memory included in prompts                                                     | Carries current state, decision log, validation commands, constraints, and instructions.                                                                                                      | Structured project state and selective context API                    | Keep selective inclusion, but work packets should include only project memory that changes the current decision. Do not dump all project memory into every mode.                                                                                                                                    |
| Skill list in managed-run prompts                                                      | Lists installed skills and required prompt skills.                                                                                                                                            | Skill metadata and agent skill loader                                 | Keep short availability hints. Do not copy all skill bodies into work packets; agents should load the relevant skill when triggered.                                                                                                                                                                |
| Planner outputs requested as prose                                                     | Planner prompts ask for proposed tasks, blockers, questions, and metadata updates, but output can remain in chat.                                                                             | Domain/service logic and task/project mutation tools                  | Add structured follow-up operations: create draft task, update task contract, mark blocker, request clarification, create review packet.                                                                                                                                                            |
| Completion result instructions                                                         | Ask the agent to state changes, validation, follow-ups, and whether durable state should change.                                                                                              | Run-result recording API and review/task update services              | Keep short completion instructions temporarily, but prefer `record_run_result`, `record_validation_result`, `record_blocker`, `record_followup_recommendations`, `create_followup_task`, `request_review_from_run`, and `mark_task_blocked_from_run` so result evidence becomes durable state before task/review mutations. |

## Interface Layering

1. AMS domain/app logic owns goals, tasks, runs, state transitions, eligibility, next action, permissions, and review state.

   Existing homes include `src/lib/server/control-plane.ts`, `src/lib/server/control-plane-repository.ts`, `src/lib/server/delegation-readiness.ts`, `src/lib/server/goal-work-loop.ts`, `src/lib/server/goal-work-packets.ts`, `src/lib/server/task-launch-planning.ts`, `src/lib/server/task-governance.ts`, and `src/lib/server/goal-run-result-preview.ts`.

2. AMS API/server actions expose structured operations to UI and future agent tools.

   Existing homes include `/api/agent-capabilities`, `/api/agent-context/current`, `/api/agent-intents/[intent]`, `/api/projects`, `/api/goals`, `/api/tasks`, `/api/tasks/[taskId]/*`, `/api/agents/threads/*`, and `src/lib/server/agent-control-plane-api.ts`.

3. MCP server exposes safe AMS operations to external agents/Codex.

   Existing plugin: `plugins/ams-control-plane`. It already exposes manifest-backed task, goal, project, governance, session, thread, goal-loop, work-packet, review, and run-result tools. New mutation tools should be added only when domain helpers can validate them and return readback.

4. AMS Skill teaches agents how to use AMS correctly.

   Existing convention: repo-local skills live under `.agents/skills/<skill-name>/SKILL.md`. The current control-plane operations skill is `.agents/skills/ams-control-plane-operations/SKILL.md`. A new skill should focus on the work loop and source-of-truth behavior, not duplicate the full CLI reference.

5. `AGENTS.md` guides Codex when modifying the AMS codebase itself.

   It should stay short and repo-wide: use the existing Goal concept, avoid duplicate systems, prefer structured state over prompt stuffing, read existing docs/models first, keep capture lightweight, and close out work with validation and durable-state notes.

6. Prompt/work-packet generation creates selective, mode-aware context for a specific task.

   It must not replace structured state or tools. It should render task/project/goal/run/review data into a bounded packet for a specific mode and should include enough IDs for agents to read/update the canonical state through API/MCP/CLI.

## Proposed Agent Tool Surface

Status values below mean:

- `v0`: should be implemented in the first agent-facing surface.
- `later`: useful after v0 stabilizes.
- `deferred`: do not implement until the adjacent domain model or permission story is clearer.

### Goal/context tools

| Tool                        | Purpose                                            | Inputs                                               | Outputs                                                                                       | Permission/safety                              | Existing support                                                             | Status |
| --------------------------- | -------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| `list_active_goals`         | Find active/running/reviewable goals for an agent. | Optional `projectId`, `status`, `limit`.             | Goal summaries with linked project/task counts.                                               | Read-only.                                     | `listAgentApiGoals`, `/api/goals`, `goal list`.                              | v0     |
| `get_goal_context`          | Return the bounded context for a goal.             | `goalId`; optional `projectId`, `includeRecentRuns`. | Goal, linked projects, task summary, open gates, relevant docs/constraints.                   | Read-only; omit noisy unrelated fields.        | `Goal`, `Project`, `Task`; `buildGoalWorkLoopClassification`.                | v0     |
| `get_goal_progress`         | Summarize progress toward goal success.            | `goalId`.                                            | Counts by classification, accepted outcomes, open gates, blockers, remaining gaps.            | Read-only; mark inferred progress as inferred. | `src/lib/server/goal-work-loop.ts`. | v0     |
| `get_goal_success_criteria` | Extract success signal and measurable criteria.    | `goalId`.                                            | Success signal, linked task acceptance criteria, gaps.                                        | Read-only.                                     | `Goal.successSignal`, task criteria fields.                                  | v0     |
| `get_goal_blockers`         | List blockers blocking goal progress.              | `goalId`; optional blocker type.                     | Blocked tasks, unmet dependencies, approvals, reviews, clarification/research/planning needs. | Read-only.                                     | Goal-loop classifications, task blockers, review/approval helpers.           | v0     |

### Work selection tools

| Tool                          | Purpose                                                          | Inputs                                                           | Outputs                                                                                             | Permission/safety                                                                             | Existing support                                                                                   | Status |
| ----------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| `get_actionable_work`         | Return tasks that can be worked now.                             | `goalId` or `projectId`; optional risk/autonomy/profile filters. | Actionable task list with reasons and parallel candidates.                                          | Read-only; must exclude high/critical/A5/high-stakes unless explicitly requested as analysis. | `buildGoalWorkLoopClassification`, `buildAutonomousQueue`.                                         | v0     |
| `get_blocked_work`            | Return non-actionable blocked work.                              | `goalId` or `projectId`.                                         | Blocked tasks grouped by dependency, clarification, research, approval, review, risk, missing tool. | Read-only.                                                                                    | Goal-loop classification and readiness.                                                            | v0     |
| `get_awaiting_review`         | Return work needing review, approval, or child-handoff decision. | `goalId` or `projectId`.                                         | Tasks/runs/reviews/approvals with evidence IDs.                                                     | Read-only.                                                                                    | `/app/governance`, review/approval helpers.                                 | v0     |
| `get_next_recommended_action` | Return one best next operation for the goal.                     | `goalId` or `projectId`; optional mode.                          | Recommendation kind, task IDs, reason, suggested readback, optional draft task.                     | Read-only; no launch/mutation.                                                                | `GoalWorkLoopRecommendation` in `goal-work-loop.ts`; manifest recommendations for current context. | v0     |
| `explain_task_eligibility`    | Explain why a task can or cannot be worked.                      | `taskId`; optional `goalId`.                                     | Classification, readiness mode, risk/autonomy gates, dependencies, missing info.                    | Read-only.                                                                                    | `delegation-readiness.ts`, `goal-work-loop.ts`, `task-launch-planning.ts`.                         | v0     |

### Task tools

| Tool                     | Purpose                                                     | Inputs                                                                   | Outputs                                                    | Permission/safety                                                                            | Existing support                                                           | Status                 |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------- |
| `create_task`            | Create lightweight or framed task.                          | Title, project ID, optional goal ID, summary/contract/governance fields. | Created task.                                              | Mutation; validate project/goal IDs; keep title-only capture allowed.                        | `createAgentApiTask`, `/api/tasks`, CLI/MCP.                               | v0                     |
| `update_task`            | Update task fields.                                         | `taskId`, patch.                                                         | Updated task.                                              | Mutation; validate enums, dependencies, paths, review/approval restrictions.                 | `updateAgentApiTask`, `/api/tasks/[taskId]`, CLI/MCP.                      | v0                     |
| `link_task_to_goal`      | Attach existing task to goal.                               | `taskId`, `goalId`.                                                      | Updated task/goal relationship.                            | Mutation; avoid cycles and conflicting goal scope.                                           | Task update and goal relationship helpers.                                 | v0                     |
| `link_task_dependency`   | Record dependency relationship.                             | `taskId`, `dependencyTaskId`.                                            | Updated task.                                              | Mutation; reject self/cycles when supported.                                                 | Task update; launch planner dependency validation.                         | v0                     |
| `mark_task_blocked`      | Mark task blocked with explicit reason.                     | `taskId`, `reason`, optional blocker type.                               | Updated task and optional run blocker.                     | Mutation; reason required.                                                                   | Task update; run blocker fields.                                           | v0, blocker type later |
| `mark_task_needs_review` | Move task into review state or open review.                 | `taskId`, `summary`, optional artifact.                                  | Review record/task readback.                               | Mutation; use validate-only for previews.                                                    | `requestTaskReview`, intent `prepare_task_for_review`.                     | v0                     |
| `mark_task_accepted`     | Accept completed task after review/approval.                | `taskId`, summary/validation/follow-ups.                                 | Updated task, decision, run updates.                       | Mutation; should require review authority; avoid agents self-accepting when review required. | Review approval and task update helpers. | later                  |
| `create_followup_task`   | Create a linked task from run result evidence. | Source `runId`, title, summary, optional relation reason.              | Draft follow-up task linked to source run/task/project/goal, or existing duplicate link. | Mutation; dedupes by open task title in the same project/goal.                                         | `run-result create_followup_task`, `/api/agent-run-results/create_followup_task`, `src/lib/server/agent-run-results.ts`. | implemented for run evidence; blocker/review variants later |

### Context/work-packet tools

| Tool                      | Purpose                                            | Inputs                                           | Outputs                                                                                 | Permission/safety                           | Existing support                                                      | Status |
| ------------------------- | -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- | ------ |
| `get_project_context`     | Return selective project context for a mode.       | `projectId`, `mode`, optional task/goal ID.      | Current state, constraints, validation commands, instructions path, selected decisions. | Read-only; cap length and include reasons.  | `Project` fields; prompt builders.                                    | v0     |
| `get_task_context`        | Return structured task contract and related state. | `taskId`, optional `mode`.                       | Task contract, dependencies, blockers, latest run/review/approval, readiness.           | Read-only.                                  | Task detail load/data helpers.                                        | v0     |
| `get_relevant_prior_runs` | Return recent relevant run evidence.               | `taskId` or `goalId`, optional limit/status.     | Run summaries, validation, blockers, artifacts, follow-ups.                             | Read-only; omit huge logs unless requested. | `Run` records; task execution panel.                                  | v0     |
| `get_agent_work_packet`   | Return selective packet for next work.             | `goalId`/`projectId`, optional `taskId`, `mode`. | Structured packet fields plus rendered prompt.                                          | Read-only; packet must identify source IDs. | `src/lib/server/goal-work-packets.ts`, `src/lib/workflow-prompts.ts`. | v0     |

### Run tools

| Tool                              | Purpose                                              | Inputs                                                             | Outputs                                                   | Permission/safety                                                        | Existing support                                              | Status                                      |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------- |
| `create_run`                      | Create a run record or launch managed task session.  | `taskId`, execution surface/provider/model options.                | Run/session IDs and launch readback.                      | Mutation; enforce launch preflight, approval, sandbox, tool fit.         | `task launch-session`, `task-launch-planning.ts`.             | v0 for launch, later for generic run create |
| `update_run_status`               | Update run status.                                   | `runId`, status, summary/error.                                    | Updated run.                                              | Mutation; restrict terminal/status transitions.                          | `Run` model, execution-surface task update routes.            | later                                       |
| `record_run_result`               | Record structured completion/partial/failure result. | `runId`, summary, result, changed files/artifacts, classification. | Updated run evidence plus result preview.                 | Mutation; run evidence only, no task/review/approval state change.        | `run-result record_run_result`, `src/lib/server/agent-run-results.ts`. | v0 |
| `record_validation_result`        | Record validation commands and outcome.              | `runId`, commands, pass/fail, output summary.                      | Updated run validation fields plus result preview.        | Mutation; run evidence only, keep output summaries bounded.               | `run-result record_validation_result`, `Run.validationSummary`. | v0 |
| `record_blocker`                  | Record blocker found during a run.                   | `runId`, `taskId`, blocker text/type.                              | Updated run blocker evidence plus result preview.         | Mutation; marks the run blocked, but does not block the task unless `mark_task_blocked_from_run` is used. | `run-result record_blocker`, `Run.blockersFound`. | v0 |
| `record_followup_recommendations` | Save proposed follow-ups without creating tasks yet. | `runId`, recommendations or follow-up task IDs.                    | Run follow-up recommendation data or task references.     | Mutation; does not create tasks.                                          | `run-result record_followup_recommendations`, `Run.followUpTaskIds`. | v0 |
| `create_followup_task`            | Create or link a draft follow-up task from run evidence. | `runId`, title, summary.                                           | Draft task plus run follow-up link/readback.              | Mutation; dedupes by open task title in same project/goal.                | `run-result create_followup_task`, `src/lib/server/agent-run-results.ts`. | v0 |
| `request_review_from_run`         | Open task review from completed run evidence.          | `runId`, summary, optional `validateOnly`.                         | Preview or review request/task readback.                  | Guarded mutation; no approval or acceptance.                              | `run-result request_review_from_run`. | v0 |
| `mark_task_blocked_from_run`      | Mark linked task blocked from run blocker evidence.    | `runId`, blocker, optional `validateOnly`.                         | Preview or blocked task readback.                         | Guarded mutation; no review/approval changes.                             | `run-result mark_task_blocked_from_run`. | v0 |

### Review/approval tools

| Tool                         | Purpose                                      | Inputs                                        | Outputs                                                           | Permission/safety                           | Existing support                                                    | Status                                 |
| ---------------------------- | -------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------- |
| `request_user_approval`      | Open approval gate.                          | `taskId`, mode, summary, optional artifact.   | Approval record/readback.                                         | Mutation; validate mode; dry-run supported. | `requestTaskApproval`, CLI/MCP, intent `prepare_task_for_approval`. | v0                                     |
| `request_user_clarification` | Record a specific question/blocker for user. | `taskId` or `goalId`, question, why needed.   | Blocked task or clarification item.                               | Mutation; no broad task expansion.          | Task blocked reason; no first-class clarification model.            | v0 via task blocker, later first-class |
| `submit_for_review`          | Open review gate with evidence.              | `taskId`, summary, optional run/artifact IDs. | Review record/readback.                                           | Mutation; no self-approval.                 | `requestTaskReview`, intent `prepare_task_for_review`.              | v0                                     |
| `get_review_status`          | Inspect review/approval state.               | `taskId` or `goalId`.                         | Open reviews, pending approvals, decisions, required next action. | Read-only.                                  | Review/approval helpers; `/app/governance`.                         | v0                                     |

## Agent Skill Recommendation

Create and maintain a repo-local skill at:

```text
.agents/skills/ams-agent-interface/SKILL.md
```

The skill teaches agents to use AMS as the source of truth:

- Start from the active `Goal`: resolve current context, list active goals if needed, inspect goal progress, then select work.
- Inspect existing work before creating tasks: search goal/project tasks, check blocked/awaiting-review/actionable classifications, and avoid duplicates.
- Classify work as actionable, blocked, needs planning, needs research, needs clarification, awaiting review, or approval required using AMS tool output rather than chat memory.
- Create or update tasks through structured operations, keeping basic task capture lightweight and adding structure only when delegation/review/reuse requires it.
- Record run results, validation, blockers, and artifacts through run/task operations.
- Create follow-up tasks only when they support the active goal, carry a source reason, and do not duplicate existing work.
- Stop when user input, approval, missing access, risk, ambiguity, or scope conflict blocks progress.
- Treat long chat threads as evidence at most, never as the source of truth.
- Prefer manifest/MCP/API tools; fall back to `scripts/ams-cli.mjs` only when needed.

The existing `.agents/skills/ams-control-plane-operations/SKILL.md` should remain as the lower-level operations skill for CLI/API/MCP command discipline. The agent-interface skill is the higher-level work-loop skill. It should reference the control-plane skill instead of copying the full command map.

## MCP Server Recommendation

AMS should expose an MCP server for agent interaction. It already has a repo-local plugin in `plugins/ams-control-plane`, and that is the right direction.

MCP currently exposes the manifest-backed core surface:

- Capability discovery: manifest and current context.
- Read-only goal/project/task/run/review context, including relevant prior runs.
- Goal-loop read tools: active goals, goal context, goal progress, success criteria, blockers, actionable work, blocked work, awaiting review, next recommended action, task eligibility.
- Work-packet reads: `ams_work_packet_get_agent_work_packet`, returning selective packet output with rendered prompt as one field.
- Safe mutations already supported by domain logic: create/update task, request review, request approval, attach artifact, decomposition, child handoff decisions, session launch/recovery, draft follow-up task creation from run evidence, run result recording, validation recording, blocker recording, review request from run evidence, and blocked-task update from run evidence.
- Preview-and-apply run-result tools: `ams_run_result_preview_progress_updates` returns proposed project memory, decision-log, blocker, follow-up, and goal-progress updates without mutating state; `ams_run_result_apply_progress_updates` applies selected reviewed project/goal proposals through guarded structured updates.

Still-missing or intentionally deferred MCP/API coverage includes richer follow-up creation from review/blocker evidence, first-class task-goal/dependency helper commands beyond task updates, workflow/template/skill mutation, and any automatic acceptance path.

MCP should not expose:

- Raw control-plane file edits.
- Arbitrary database writes.
- Broad workflow/template/skill mutation before those APIs and review gates are explicit.
- High-risk/A5/external-state execution.
- Tools that hide important state changes inside a generated prompt.
- A generic "stuff everything into prompt" tool.

Read-only tools should be available first and require only a valid local operator token. Mutation tools should require:

- Bearer token authentication through the existing operator API.
- Domain validation and enum parsing from existing server helpers.
- Dry-run/`validateOnly` support for approval, decomposition, child handoff, review, and thread coordination.
- Readback after mutation.
- Clear error guidance with `errorCode`, `details`, and `suggestedNextCommands`.
- Risk/autonomy/approval checks before launch, acceptance, external-state, or high-stakes transitions.

Implemented v0 path:

1. `src/lib/server/agent-capability-commands.js` and `src/lib/server/agent-capability-manifest.ts` include read-only intent interpretation, goal-loop, work-packet, review, and run-result capabilities.
2. API routes under `src/routes/api/agent-intent-interpretation`, `src/routes/api/agent-goal-loop`, `src/routes/api/agent-work-packets`, and `src/routes/api/agent-run-results` are backed by `src/lib/server/intent-interpretation.ts`, `src/lib/server/agent-intent-interpretation.ts`, `src/lib/server/goal-work-loop.ts`, `src/lib/server/agent-work-packets.ts`, `src/lib/server/goal-work-packets.ts`, and `src/lib/server/agent-run-results.ts`.
3. `plugins/ams-control-plane` and `scripts/ams-control-plane-mcp.mjs` expose generated MCP tools from the shared capability registry.
4. MCP/manifest coverage lives in `src/lib/server/ams-control-plane-mcp.spec.ts`, `src/lib/server/agent-capability-manifest.spec.ts`, `src/lib/server/agent-work-packets.spec.ts`, and `src/lib/server/agent-run-results.spec.ts`.
5. Mutation tools are limited to existing domain helpers and guarded run-result transitions with validation/readback.

Deferred:

- Workflow/template/skill creation tools.
- Autonomous task launch loops.
- Automatic acceptance of work.
- Production/external-state mutation.
- Rich permission roles beyond the current local operator/token model.

## AGENTS.md Recommendation

Current `AGENTS.md` is directionally correct after the goal-loop update. It tells agents to read the goal-loop/readiness/rigor/context docs, keep simple capture lightweight, treat conflicts as defects, inspect existing models before adding abstractions, use task/governance as review surfaces, and produce concise result summaries.

Recommended minimal additions:

- Add this document to the current-milestone reading list for agent-facing work.
- Add a source-of-truth bullet: prefer structured AMS domain/API/MCP operations over prompt stuffing.
- Keep the existing warning against duplicate milestone/task/workflow/skill systems.

This is low-risk and should be made with this design task.

## Work Packet Generation Rules

Work packets should be selective, mode-aware renderings of structured AMS state. They should include source IDs and enough context to do the work, but should not dump all known project data.

Common rules:

- Always include task/goal/project IDs needed for readback and state updates.
- Include the active goal only when it changes prioritization, scope, or success criteria.
- Include project memory only when it changes constraints, validation, governance, setup, or non-goals.
- Include recent runs only when they are evidence for this task/goal/mode.
- Include skills only when required or strongly relevant.
- Include stopping conditions derived from risk, autonomy, approval, rigor, blockers, and scope.
- Include expected result shape so run results can be recorded structurally.
- Prefer structured fields plus an optional rendered prompt over prompt-only output.

Planning work packet:

- Include active goal summary and success signal.
- Include current task classification counts and the specific tasks needing planning.
- Include project constraints, non-goals, validation expectations, and relevant decisions.
- Include accepted work and unresolved blockers only when they affect the plan.
- Output should be task contract updates, proposed tasks, dependencies, risk/autonomy/readiness/review recommendations, and questions.

Research work packet:

- Include the research question, blocker/uncertainty, linked task/goal, relevant project constraints, and evidence expectations.
- Include source requirements if rigor profile demands them.
- Exclude implementation instructions unless the research explicitly needs local code inspection.
- Output should be findings, evidence checked, remaining uncertainty, and recommended next mode.

Execution work packet:

- Include task contract: expected outcome, scope, non-goals, success criteria, ready condition, validation, dependencies, blockers, risk/autonomy/review/approval/rigor, allowed/disallowed actions.
- Include project setup, validation commands, coding conventions, and relevant constraints.
- Include recent failed/blocked runs for the same task when they change execution.
- Exclude unrelated backlog, unrelated project memory, and full skill bodies.
- Output should be changed files/artifacts, criteria satisfied, validation result, blockers, risks, follow-ups, and review readiness.

Review work packet:

- Include task contract, run evidence, artifacts, validation, open review/approval state, and relevant prior decisions.
- Include goal context only when acceptance affects goal progress.
- Exclude implementation guidance except for reviewer standards.
- Output should be accept/reject/needs-revision decision recommendation, evidence, validation credibility, risks, and follow-up tasks.

Clarification/approval packet:

- Include the exact decision/question, why it blocks progress, affected goal/task/run IDs, options when known, risk/autonomy/approval reason, and recommended default if safe.
- Exclude broad project context unless it changes the decision.
- Output should be a specific user decision, an approval request, or a blocked-state update.

## Minimal Implementation Plan

### 1. Normalize goal-loop read operations into the agent API

Status: Implemented. Manifest readback lists `goal-loop list_active_goals`, `get_goal_context`, `get_goal_progress`, `get_goal_success_criteria`, `get_goal_blockers`, `get_actionable_work`, `get_blocked_work`, `get_awaiting_review`, `get_next_recommended_action`, and `explain_task_eligibility`.

- Objective: expose goal context, progress, blockers, actionable work, awaiting review, next action, and task eligibility as structured read APIs.
- Scope: read-only API/domain integration; no new UI beyond tests.
- Likely files/areas: `src/lib/server/goal-work-loop.ts`, `src/lib/server/goal-work-packets.ts`, `src/lib/server/agent-control-plane-api.ts`, `src/routes/api/agent-capabilities/+server.ts`, new route(s) under `src/routes/api/agent-goal-loop` or manifest-backed command handlers, tests.
- Dependencies: existing goal-loop helpers and current context.
- Acceptance criteria: manifest lists the new read tools; each returns JSON with IDs, classifications, reasons, and suggested readback; tests cover actionable, blocked, awaiting review, and approval-required cases.
- Risk level: low-medium.
- Safe for Codex now: yes.

### 2. Implement structured agent work-packet API

Status: Implemented. Manifest readback lists `work-packet get_agent_work_packet` at `/api/agent-work-packets/get_agent_work_packet`, with MCP tool `ams_work_packet_get_agent_work_packet`.

- Objective: expose `get_agent_work_packet` as structured JSON plus optional rendered prompt.
- Scope: adapt existing `buildGoalLoopWorkPacket` and `workflow-prompts` output into an API/MCP-ready shape.
- Likely files/areas: `src/lib/server/goal-work-packets.ts`, `src/routes/api/...`, `src/lib/server/agent-capability-manifest.ts`, `plugins/ams-control-plane`, tests.
- Dependencies: task 1 for tool discovery; existing work-packet helper.
- Acceptance criteria: packet output includes mode, source IDs, selection reason, included task/run IDs, stopping conditions, validation expectations, expected result shape, structured sections, and rendered prompt.
- Risk level: low.
- Safe for Codex now: yes.

### 3. Draft the AMS agent-interface skill

- Objective: add repo-local guidance for agents using AMS structured tools.
- Scope: documentation/skill only.
- Likely files/areas: `.agents/skills/ams-agent-interface/SKILL.md`, optional cross-reference in `.agents/skills/ams-control-plane-operations/SKILL.md`.
- Dependencies: this design doc.
- Acceptance criteria: skill explains active-goal start, inspect-before-create, dedupe, classifications, task updates, result recording, follow-up creation, stopping conditions, and source-of-truth discipline.
- Risk level: low.
- Safe for Codex now: yes.

### 4. Add read-only AMS MCP tools for goal loop and packets

Status: Implemented. `plugins/ams-control-plane/README.md` and `scripts/ams-control-plane-mcp.mjs` expose generated goal-loop and work-packet tools from the shared registry.

- Objective: make the new read APIs available to external agents/Codex through MCP.
- Scope: read-only MCP exposure and tests.
- Likely files/areas: `plugins/ams-control-plane`, `src/lib/server/agent-capability-commands.js`, `src/lib/server/agent-capability-manifest.ts`, `src/lib/server/ams-control-plane-mcp.spec.ts`.
- Dependencies: tasks 1 and 2.
- Acceptance criteria: MCP exposes read-only goal-loop/work-packet tools; descriptions match manifest; tests verify generated definitions and request handling.
- Risk level: low-medium.
- Safe for Codex now: yes after APIs exist.

### 5. Add structured run-result recording and preview-backed mutations

Status: Implemented for recording, preview, selected reviewed progress application, and selected guarded transitions. Run evidence commands exist for `record_run_result`, `record_validation_result`, `record_blocker`, and `record_followup_recommendations`; guarded preview/mutation commands exist for `request_review_from_run`, `mark_task_blocked_from_run`, and `apply_progress_updates`; `preview_progress_updates` returns preview-only project/goal progress proposals. Automatic acceptance remains intentionally unimplemented.

- Objective: let agents record run results, validation, blockers, and follow-up recommendations without auto-accepting ambiguous work.
- Scope: run record updates and preview/readback; no automatic final acceptance.
- Likely files/areas: `src/lib/server/goal-run-result-preview.ts`, `src/lib/server/run-records.ts`, `src/routes/api/runs/[runId]/+server.ts`, agent capability registry, tests.
- Dependencies: stable readback and current-context behavior.
- Acceptance criteria: agents can record result summary, validation result, blockers, and artifacts; preview proposes task/review/project/goal updates; no review-required task is silently accepted.
- Risk level: medium.
- Safe for Codex now: yes if record-only; acceptance mutations should stay separate.

### 6. Add safe follow-up task creation from run/review evidence

Status: Implemented for run evidence. `run-result create_followup_task` creates or links a draft follow-up task from a run result and dedupes by open task title in the same project/goal. Review/blocker-specific variants remain future work unless they can reuse the run evidence path.

- Objective: create draft/framed follow-up tasks linked to source task/run/goal with dedupe checks.
- Scope: task creation wrapper, not a new planning system.
- Likely files/areas: `src/lib/server/agent-intent-actions.ts`, `src/lib/server/agent-control-plane-api.ts`, task create helpers, run result preview, tests.
- Dependencies: task 5.
- Acceptance criteria: follow-up task is linked to project/goal/source, has objective/scope/criteria/validation when available, starts draft/framed, and reports possible duplicates.
- Risk level: medium.
- Safe for Codex now: yes as draft-only.

### 7. Add safe mutation MCP tools with permissions and dry-runs

- Objective: expose selected mutation tools after state transitions and safety gates are clear.
- Scope: MCP wrappers for existing API operations, with validate-only where supported.
- Likely files/areas: `plugins/ams-control-plane`, capability registry, `src/lib/server/agent-intent-actions.ts`, tests.
- Dependencies: tasks 4-6.
- Acceptance criteria: mutation tools require token, return readback, respect validate-only, produce structured errors, and do not allow high-risk/external-state actions without approval.
- Risk level: medium.
- Safe for Codex now: partially; implement after read-only tools and run-result recording settle.

## Immediate Next Tasks

The single best next implementation task is no longer goal-loop API normalization, progress-preview generation, or reviewed progress application; those surfaces exist in manifest readback. The next work should target one of these remaining gaps:

1. Prompt boilerplate reduction in managed-run launch packets.
2. Operator workflow consolidation across goal detail, governance, task detail, planning, and queue surfaces.
3. Additional guarded state transitions only where validation/readback semantics are explicit.

The prior ready-to-paste prompt for reviewed progress application is complete. New task prompts should target one of the remaining gaps above.

## What Not To Build

- Giant prompt prefixes as the primary integration method.
- Dumping every field into every work packet.
- Duplicate task, goal, workflow, skill, run, planning, or milestone systems.
- A new milestone abstraction separate from `Goal`.
- Broad UI pages not connected to agent affordances.
- Full autonomous high-risk execution.
- MCP mutation tools before permissions and state transitions are clear.
- Enterprise process bloat.
- Assumptions that all agents are Codex forever.
- Long chat threads as the source of truth.
- Manual paste/import flows for managed run results when AMS can capture results through launcher, runner, thread, execution-surface, or structured run-result paths.
