# Functional Alignment Audit

Date: 2026-06-29

## Scope

This audit maps the existing Agent Management System (AMS) to the intended function: helping a constrained human move from ambiguous intent to reviewable progress under uncertainty while preserving judgment, quality, and durable state.

This is not a greenfield architecture proposal. The repository already has substantial domain, UI, API, CLI, and agent-facing infrastructure. The recommended changes below reuse existing `Goal`, `Project`, `Task`, `Run`, `Review`, `Approval`, `Workflow`, `TaskTemplate`, `Role`, `Provider`, `ExecutionSurface`, `Skill`, and decision concepts.

No functional code changes are proposed as part of this audit.

## Current System Map

### Runtime Storage and Source of Truth

- Defined in: `src/lib/types/control-plane.ts`, `src/lib/server/control-plane.ts`, `src/lib/server/db/control-plane-store.ts`, `src/lib/server/db/migrations/001-app-foundation.sql`.
- Stored in: `data/app.sqlite` as generic `control_plane_records` rows keyed by collection and ID. `data/control-plane.json` is a tracked seed/export/recovery snapshot, not the live writable store.
- Created/updated through: server helpers in `src/lib/server/control-plane.ts`, repository helpers in `src/lib/server/control-plane-repository.ts`, SvelteKit actions/routes, API routes, `scripts/ams-cli.mjs`, and generated MCP capability surfaces.
- Important policy: `docs/runtime-data-policy.md` and `AGENTS.md` prohibit direct edits to `data/control-plane.json` when a supported AMS operation exists.

The repo uses typed JSON domain records on top of SQLite rather than one SQL table per domain entity. Schema evolution therefore mostly means TypeScript type changes, normalization/factory changes, API validation changes, and migration/export compatibility work.

### Project and Subproject

- Defined in: `Project` in `src/lib/types/control-plane.ts`.
- Stored in: `projects` collection.
- Created/updated through: `createProject`, project normalization/update logic in `src/lib/server/control-plane.ts`, agent API helpers in `src/lib/server/agent-control-plane-api.ts`, `/api/projects`, `/api/projects/[projectId]`, `scripts/ams-cli.mjs project *`, and project UI actions.
- UI/API surfaces: `/app/projects`, `/app/projects/[projectId]`, `/api/projects`, manifest project commands.
- Relationships: `parentProjectId` supports subprojects; helpers such as `getProjectChildProjects`, `getProjectDescendantProjectIds`, `getProjectScopeProjectIds`, `getProjectLineage`, and `wouldCreateProjectCycle` live in `src/lib/server/control-plane.ts`.
- Functional fields: project brief, current state memo, decision log, `agentInstructionsPath`, setup notes, validation commands, coding conventions, approval requirements, allowed/disallowed actions, default autonomy/risk/review/rigor, constraints, non-goals, repo paths, artifact roots, sandbox/model defaults, and skill policy.

Fit: project state is a strong durable context container. The biggest gap is not storage; it is safely updating project memory and decision state from reviewed outcomes without making agents self-authoritative.

### Goal and Subgoal

- Defined in: `Goal` and `GOAL_STATUS_OPTIONS` in `src/lib/types/control-plane.ts`.
- Stored in: `goals` collection.
- Created/updated through: `createGoal`, goal normalization, `applyGoalRelationships`, `wouldCreateGoalCycle`, `src/lib/server/agent-control-plane-api.ts`, `/api/goals`, `/api/goals/[goalId]`, `scripts/ams-cli.mjs goal *`.
- UI/API surfaces: `/app/goals`, `/app/goals/[goalId]`, `/api/goals`, `/api/agent-goal-loop/[command]`, CLI goal-loop commands, MCP tools generated from the manifest.
- Relationships: `parentGoalId` supports subgoals; `projectIds` links goals to projects; `taskIds` links goals to tasks; `goalLinksProject` and `src/lib/server/goal-relationships.ts` maintain relationships.
- Functional fields: status, summary, artifact path, success signal, target date, planning priority, confidence.

Fit: goals are a good anchor for the autonomous work loop. They do not yet directly store assumptions, constraints, uncertainties, open questions, or decision hypotheses except as prose in summary/success signal or linked task/decision records.

### Task, Subtask, and Delegation

- Defined in: `Task`, `DelegationPacket`, `DelegationAcceptance`, task status/risk/readiness/autonomy/review enums in `src/lib/types/control-plane.ts`.
- Stored in: `tasks` collection.
- Created/updated through: `createTask`, task normalization/update logic, `createTaskRecord`, `updateTaskRecord`, `mutateTaskCollections`, `src/lib/server/agent-control-plane-api.ts`, `/api/tasks`, `/api/tasks/[taskId]`, task page server actions, CLI task commands.
- UI/API surfaces: `/app/tasks`, `/app/tasks/[taskId]`, task detail components in `src/lib/components/tasks/*`, `/api/tasks`, task session/decompose/review/approval/attachment routes.
- Relationships: `projectId`, `goalId`, `workflowId`, `taskTemplateId`, `parentTaskId`, `dependencyTaskIds`, `latestRunId`, `agentThreadId`, attachments, and follow-up links from runs.
- Functional fields: summary, success criteria, ready condition, expected outcome, scope, non-goals, validation steps, rigor profile, readiness level, autonomy level, allowed actions, review requirement, risk level, approval mode, required sandbox, desired role, assigned execution surface, required prompt skills, required capabilities, required tools, blocked reason, estimates, target date, closeout fields.

Fit: task records already contain most of the acceptance, routing, validation, risk, and review metadata needed for reviewable work. The weakest part is representing the reasoning behind a task, especially assumptions, alternatives considered, unresolved questions, and why this is the next useful work.

### Workflow and Task Template

- Defined in: `Workflow`, `WorkflowStep`, and `TaskTemplate` in `src/lib/types/control-plane.ts`.
- Stored in: `workflows`, `workflowSteps`, and `taskTemplates` collections.
- Created/updated through: `createWorkflow`, `createWorkflowStep`, `createTaskTemplate`, workflow/task-template form actions, workflow template instantiation helpers.
- UI/API surfaces: `/app/workflows`, `/app/workflows/[workflowId]`, `/app/workflows/new`, `/app/task-templates`, `/app/task-templates/[taskTemplateId]`.
- Services: `src/lib/server/workflows.ts`, `src/lib/server/workflow-actions.ts`, `src/lib/server/workflow-template-instantiation.ts`, `src/lib/server/task-templates.ts`.
- Relationships: tasks can reference workflows and templates; workflow steps encode desired roles and step dependencies.

Fit: workflows and templates support repeatable decomposition without a duplicate planning system. They are less agent-facing than tasks/goals today, but goal-loop helpers can consume workflow state without exposing broad workflow mutation tools.

### Relationships and Dependencies

- Hierarchical relationships:
  - Projects: `parentProjectId`.
  - Goals: `parentGoalId`.
  - Tasks: `parentTaskId`.
  - Workflows: `WorkflowStep.dependsOnStepIds`.
- Non-hierarchical relationships:
  - Task dependencies: `dependencyTaskIds`.
  - Goal/project/task links: `Goal.projectIds`, `Goal.taskIds`, `Task.projectId`, `Task.goalId`.
  - Evidence links: `Run.taskId`, `Run.followUpTaskIds`, `Review.taskId/runId`, `Approval.taskId/runId`, `Decision.taskId/goalId/runId/reviewId/approvalId/planningSessionId`.
- Services: `taskHasUnmetDependencies`, `getOpenReviewForTask`, `getPendingApprovalForTask`, `src/lib/server/goal-work-loop.ts`, `src/lib/server/workflows.ts`, `src/lib/server/planning.ts`.

Fit: relationships are supported, including hierarchy and dependencies. Missing relationship semantics include explicit "derived from assumption", "answers research question", "requires human decision", "alternative to", "supersedes task" for arbitrary tasks, and "created because of run finding" beyond run follow-up IDs and prose.

### Executor, Role, Provider, Tool, and Execution Surface Routing

- Defined in: `Role`, `Provider`, `ExecutionSurface`, execution surface enums, and task routing fields in `src/lib/types/control-plane.ts`.
- Stored in: `roles`, `providers`, `executionSurfaces`, and task/template routing fields.
- Created/updated through: control-plane factories, `/app/roles`, `/app/providers`, `/app/execution-surfaces`, execution surface registration/heartbeat/poll/claim/update routes, CLI/API helpers.
- Services: `src/lib/server/execution-surface-api.ts`, `src/lib/server/execution-capability-catalog.ts`, `src/lib/server/direct-provider-task-fit.ts`, `src/lib/server/task-launch-planning.ts`, `src/lib/server/task-execution-preflight.ts`.
- Functional fields: desired role, assigned execution surface, provider capabilities, surface capacity/status/location, sandbox/model, required skills/capabilities/tools, cost/usage on runs.

Fit: executor routing is partially supported. The system can record desired roles, providers, surfaces, and required capabilities/tools. It does not yet have a fully explicit "best executor among human, ChatGPT, Codex, script, local tool, local model, external collaborator" decision object with rationale and confidence.

### Run, Thread, Artifacts, and Evidence

- Defined in: `Run` in `src/lib/types/control-plane.ts`; thread types in `src/lib/types/agent-thread.ts`.
- Stored in: `runs` collection plus app-managed agent-thread state in SQLite/files under `data/agent-threads`.
- Created/updated through: task launch/recovery helpers, `scripts/agent-thread-runner.mjs`, execution-surface routes, run-result commands in `src/lib/server/agent-run-results.ts`.
- UI/API surfaces: `/app/runs`, `/app/runs/[runId]`, `/app/threads`, `/app/threads/[threadId]`, `/api/runs/[runId]`, `/api/agents/threads/*`, `/api/agent-run-results/[command]`, `scripts/agent-thread-cli.mjs`, `scripts/ams-cli.mjs run-result *`.
- Functional fields: status, prompt digest/input, context summary, actions taken, validation summary, result summary, blockers, follow-up task IDs, artifacts, effective rigor profile, model, usage, estimated cost, provider/source metadata.

Fit: run records are strong evidence records. Guarded run-result APIs now support evidence recording, validation recording, blocker recording, follow-up recommendations, draft follow-up creation, review request from run evidence, blocked-task update from run evidence, and progress preview. Acceptance remains intentionally review-gated.

### Review, Approval, and Decisions

- Defined in: `Review`, `Approval`, `Decision`, status/type enums in `src/lib/types/control-plane.ts`.
- Stored in: `reviews`, `approvals`, `decisions` collections.
- Created/updated through: `src/lib/server/task-governance.ts`, review/approval API routes, review commands, approval commands, task closeout/update helpers, child-handoff helpers.
- UI/API surfaces: `/app/governance`, task detail governance panel, run detail preview, `/api/tasks/[taskId]/review-*`, `/api/tasks/[taskId]/approval-*`, `/api/agent-reviews/[command]`, CLI/MCP task governance commands.
- Relationships: reviews and approvals link to task/run; decisions link to task/goal/run/review/approval/planning session.

Fit: human review checkpoints and approval gates are well represented. The system should keep using these instead of adding a parallel approval model.

### Planning, Queue, Goal Loop, and Work Packets

- Planning page/service: `/app/planning`, `src/lib/server/planning.ts`.
- Autonomous queue: `/app/autonomous-queue`, `src/lib/server/autonomous-queue.ts`.
- Goal loop: `src/lib/server/goal-work-loop.ts`, `/api/agent-goal-loop/[command]`, CLI/MCP goal-loop commands.
- Readiness: `src/lib/server/delegation-readiness.ts`, `docs/progressive-delegation-readiness-v0.md`.
- Work packets: `src/lib/workflow-prompts.ts`, `src/lib/server/goal-work-packets.ts`, `src/lib/server/agent-work-packets.ts`, `/api/agent-work-packets/[command]`.
- Current context and prior runs: `src/lib/server/agent-current-context.ts`, `src/lib/server/agent-prior-runs.ts`, `/api/agent-context/*`.
- Capability manifest: `src/lib/server/agent-capability-manifest.ts`, `src/lib/server/agent-capability-commands.js`, `scripts/ams-cli.mjs manifest`, `scripts/ams-control-plane-mcp.mjs`.

Fit: the system already computes derived readiness and goal-loop classifications instead of overloading stored statuses. It can recommend next work, create planner/research/clarification fallback drafts, and prepare bounded work packets. The remaining gap is turning interpretation/planning output into durable task/goal/project updates with reviewable provenance and without creating work churn.

### Self-Improvement

- Defined/implemented in: `src/lib/types/self-improvement.ts`, `src/lib/server/self-improvement.ts`, `src/lib/server/self-improvement-store.ts`, `src/lib/server/self-improvement-store-db.ts`, `src/lib/server/self-improvement-knowledge.ts`, `src/lib/server/self-improvement-suggestion-policy.ts`, migration `003-self-improvement-foundation.sql`.
- UI/API/test surfaces: self-improvement specs, knowledge/policy tests, and related skill/agent-use areas.

Fit: self-improvement exists as a distinct concern with policy tests. The safe direction is to keep self-improvement as reviewable suggestions and knowledge updates, not autonomous mutation of core AMS behavior.

### Durable Agent Instructions

- Present: `AGENTS.md`, `.agents/skills/ams-agent-interface/SKILL.md`, `.agents/skills/ams-control-plane-operations/SKILL.md`.
- Supporting docs: `docs/autonomous-goal-directed-work-loop-v0.md`, `docs/agent-facing-ams-interface-v0.md`, `docs/contextual-rigor-profiles-v0.md`, `docs/task-readiness-autonomy-metadata.md`, `docs/contextual-procedural-knowledge-v0.md`, `docs/ams-cli-reference.md`.

Fit: durable agent-facing guidance is present and aligned with the current product direction. It should be kept synchronized as implementation changes.

## Functional Fit Analysis

| Intended function | Classification | Evidence | Gap |
| --- | --- | --- | --- |
| Messy intent capture | Partially supported | Lightweight task creation remains valid; task summary can hold long unstructured intent; assistant plan/execute routes exist; current task was captured from a broad prompt. | No first-class "intent interpretation" record that separates raw intent from assumptions, constraints, uncertainties, candidate goals, and proposed mappings. |
| Goal clarification | Partially supported | Goals have summary, success signal, status, parent goal, project/task links, priority, confidence. Goal-loop success criteria helpers exist. | Assumptions, constraints, open questions, and decision needs are mostly prose or implied by tasks/blockers. |
| Hierarchical relationships | Supported | Project, goal, task, and workflow-step hierarchy/dependency fields exist with cycle guards and helpers. | The UI/API may not yet make all hierarchy types equally visible in one operator view. |
| Non-hierarchical relationships | Partially supported | Task dependencies, goal/project/task links, run/review/approval/decision links, follow-up task IDs. | Relationship type/reason is often implicit. There is no general typed relation such as "answers", "depends on decision", "alternative", "derived from assumption", or "supersedes". |
| Uncertainty tracking | Partially supported | Blocked reason, readiness modes, research/clarification detection in `delegation-readiness.ts`, decisions collection. | Uncertainty is not first-class. Research questions, assumptions, clarification questions, and decisions are not separated enough for reliable routing. |
| Decomposition into tasks/experiments/research/decisions | Partially supported | Task decomposition route, parent tasks, templates, workflows, planner/research/clarification fallback drafts, decision records. | Planner output is still at risk of staying as prose; task types are inferred from readiness/routing fields rather than explicit work-item kind. |
| Executor/tool routing | Partially supported | Roles, providers, execution surfaces, required skills/capabilities/tools, assignee surface, launch planning, execution preflight. | "Why this executor" is not consistently captured as a durable routing rationale; human/ChatGPT/script/external collaborator are not all equally modeled as execution choices. |
| Acceptance criteria and quality gates | Supported | Task success criteria, ready condition, expected outcome, validation steps, risk, autonomy, rigor, review requirement, approval mode, review/approval records. | Existing captured tasks may have empty quality fields; generation/update flows need stronger progressive prompting to fill them when work becomes delegated. |
| Human review checkpoints | Supported | Review/approval domain, `/app/governance`, task detail governance panel, guarded review/approval commands, no self-approval policy. | Review summaries could better surface "criteria satisfied vs not satisfied" and "what state changes are being approved". |
| Feedback/learning loop | Partially supported | Runs store results, validation, blockers, follow-ups, cost; run-result APIs and progress previews exist; decisions and project memory exist. | Reviewed outcomes do not yet flow smoothly into project memory, goal progress, task-generation rules, or skill/template updates as reviewable proposals. |
| Self-improvement proposals | Partially supported | Self-improvement types/store/policy/knowledge services and tests exist. | Need clear operator-facing path from observed recurring issue to proposed task/template/skill/doc change with review gate. |
| Cost/risk/dependency tracking | Partially supported | Risk/autonomy/rigor/dependencies are strong; run usage/cost fields exist; execution surface capacity exists. | Cost and cognitive load are not used strongly in next-action recommendation; dependency reasons are present but not yet a general typed blocker model. |
| Support for scarce human attention/energy | Partially supported | Goal-loop recommendations, queue, governance, readiness panels, current context, work packets, review gates. | Multiple pages answer overlapping "what next?" questions; missing interpretation records may create extra task churn instead of reducing cognitive load. |

## Conceptual Gap Analysis

### 1. Tasks Store Work Better Than They Store Why the Work Exists

Tasks can store scope, expected outcome, validation, risk, and dependencies. They do not consistently store:

- source intent
- assumptions made during interpretation
- alternatives considered
- why this task is the next appropriate chunk
- what uncertainty this task reduces
- what decision it supports
- what would make it unnecessary

Current workaround: prose in `summary`, `blockedReason`, run summaries, or decisions. This is flexible but weak for routing, review, dedupe, and progress-per-attention optimization.

### 2. Goals Are Not Yet Connected Enough to Uncertainty and Decisions

Goals have success signals and confidence, and decisions can link to goals. However, a goal cannot yet directly answer:

- which assumptions must hold for this goal to be worth pursuing
- which uncertainties are currently blocking decomposition
- which decisions are pending and what options exist
- which constraints come from the user versus inferred context

The goal loop can classify tasks, but it cannot yet fully explain goal uncertainty without reading task prose and blockers.

### 3. AI and Tool Routing Is Present but Still Often Implicit

The system can record desired role, assigned execution surface, required skills, capabilities, tools, provider, sandbox, model, and run cost. It still lacks a durable routing rationale such as:

- recommended executor
- rejected executors and reasons
- required context packet
- expected cost/attention burden
- confidence in routing
- escalation path if the executor is not available

Without that, the system can launch work but cannot always explain why Codex, ChatGPT, a script, a human, or an external collaborator is the right next executor.

### 4. Quality Standards Exist but Are Not Always Mandatory at the Right Moment

The system intentionally keeps capture lightweight, which is correct. The problem is not lightweight capture; it is the transition from captured/framed work to delegated work.

When a task becomes executable or reviewable, the system should ensure the task has enough acceptance criteria, validation expectations, risks, required context, review requirement, and done condition. `delegation-readiness.ts` already detects missing information, but task-generation and task-update flows should use that more explicitly.

### 5. Self-Improvement Needs Tight Review Boundaries

Self-improvement should remain a reviewable proposal loop:

1. detect recurring friction or failure
2. propose a doc, task-template, skill, workflow, UI, or service change
3. require human or summary review
4. apply the change through normal code/docs/task workflows

The unsafe version would let agents rewrite operating rules, schemas, routing, or review policy based only on their own outputs. Existing policy tests are a good foundation; the operator workflow should keep that boundary visible.

### 6. The System Could Create Work Faster Than It Reduces Cognitive Load

The system already contains many ways to create or recommend work: task create, decomposition, planner prompts, follow-up tasks, goal-loop fallback drafts, queue recommendations, planning backlog, self-improvement suggestions. This is powerful but risky.

The central load-reduction question should be: does the proposed task reduce uncertainty, unblock a decision, satisfy an acceptance criterion, or lower future coordination cost? If not, it may be work inflation.

### 7. Documentation and Implementation Drift Was Minor

Earlier docs treated explicit project/goal progress-preview generation as a future gap, while `src/lib/server/agent-run-results.ts` includes `preview_progress_updates` and `src/lib/server/goal-run-result-preview.ts` defines project/goal progress preview structures. Current source-of-truth docs should distinguish that implemented preview-only behavior from the remaining guarded apply/update gap, so agents do not recreate completed preview work.

## Recommended Minimal Changes

### Documentation-Only Changes

1. Keep goal-loop and agent-interface docs reconciled with implemented run progress previews.
   - Rationale: avoid agents duplicating already-implemented `preview_progress_updates`.
   - Benefit: clearer next work selection.
   - Risk: low.
   - Size: small.
   - Dependencies: inspect current manifest and tests.
   - Timing: ongoing maintenance; the initial reconciliation is complete.

2. Add an "interpretation record" design note that maps raw human intent to existing entities.
   - Rationale: make assumptions, constraints, uncertainties, candidate goals, candidate tasks, and routing rationale explicit before schema work.
   - Benefit: prevents premature schema changes and helps define smallest useful representation.
   - Risk: low.
   - Size: small/medium.
   - Dependencies: this audit, `docs/progressive-delegation-readiness-v0.md`, `docs/agent-facing-ams-interface-v0.md`.
   - Timing: now.

3. Add guidance for "work-reduction test" in agent-facing docs.
   - Rationale: avoid creating tasks that increase cognitive load without reducing uncertainty or advancing goals.
   - Benefit: keeps automation aligned with scarce attention.
   - Risk: low.
   - Size: small.
   - Dependencies: AGENTS.md and AMS skills.
   - Timing: now.

### Schema/Model Changes

1. Add a small structured uncertainty/interpretation model only after a design note.
   - Rationale: current blockers/prose are insufficient for assumptions, questions, research needs, and decisions.
   - Benefit: better clarification/research routing and reviewable task generation.
   - Risk: medium because it touches shared data shape and migration/normalization.
   - Size: medium.
   - Dependencies: design note and focused tests.
   - Timing: later, after documentation/design.

2. Add typed task relation reason metadata only if existing fields cannot cover provenance.
   - Rationale: follow-up and dependency links need "why" for review and dedupe.
   - Benefit: clearer task graph and less repeated work.
   - Risk: medium; avoid a generic graph system too early.
   - Size: medium.
   - Dependencies: run-result follow-up path and task dependency helpers.
   - Timing: later.

3. Do not add a separate milestone or duplicate planning object.
   - Rationale: `Goal`, `Workflow`, `Task`, and `PlanningSession` already exist.
   - Benefit: source-of-truth discipline.
   - Risk: none.
   - Size: none.
   - Timing: not yet / avoid.

### UI Changes

1. Add an "interpretation and uncertainty" panel to task or goal detail after the model is defined.
   - Rationale: operators need to review assumptions/questions before work fans out.
   - Benefit: better human judgment at the point of leverage.
   - Risk: medium; page clutter if added before the model is stable.
   - Size: medium.
   - Dependencies: interpretation/uncertainty design.
   - Timing: later.

2. Consolidate "what next?" signals across goal detail, autonomous queue, planning, governance, and task detail.
   - Rationale: overlapping surfaces create cognitive load.
   - Benefit: clearer operator flow.
   - Risk: medium; easy to overbuild.
   - Size: medium/large if done broadly; should start with a small shared summary component.
   - Dependencies: goal-loop classification and current context helpers.
   - Timing: later.

3. Show routing rationale beside executor/launch controls.
   - Rationale: the operator should know why Codex/local tool/human/script is recommended.
   - Benefit: safer delegation and easier correction.
   - Risk: low/medium.
   - Size: small/medium.
   - Dependencies: execution fit/routing helper.
   - Timing: later.

### Workflow/Service Changes

1. Implement a read-only intent interpretation helper before mutation.
   - Rationale: classify raw intent into assumptions, constraints, uncertainties, candidate mappings, and suggested next work without changing state.
   - Benefit: reviewable interpretation and safer task generation.
   - Risk: low if read-only.
   - Size: medium.
   - Dependencies: design note and existing goal/task/project APIs.
   - Timing: now/later boundary; design first, helper next.

2. Add an executor-routing rationale helper.
   - Rationale: use existing roles, providers, execution surfaces, skills, capabilities, tools, risk, autonomy, and rigor to explain routing.
   - Benefit: explicit delegation decisions.
   - Risk: medium if it becomes a second scheduler; keep it explanatory first.
   - Size: medium.
   - Dependencies: `execution-surface-api.ts`, `task-launch-planning.ts`, `delegation-readiness.ts`.
   - Timing: later.

3. Extend run-result progress preview into a reviewed project/goal update application flow, not automatic writes.
   - Rationale: run evidence should update project/goal memory only after review.
   - Benefit: closes learning loop without unsafe self-modification.
   - Risk: medium.
   - Size: medium.
   - Dependencies: existing `preview_progress_updates`.
   - Timing: later.

### Task-Generation Changes

1. Turn planner/research/clarification fallback drafts into validate-only task proposal packets.
   - Rationale: the system already drafts fallback tasks; proposals should be inspectable before creation.
   - Benefit: fewer duplicate or low-value tasks.
   - Risk: low/medium.
   - Size: medium.
   - Dependencies: goal-loop recommendation and task create validation.
   - Timing: now/later boundary.

2. Require "why this task reduces load or uncertainty" in generated task proposals.
   - Rationale: task creation should reduce cognitive burden, not merely expand the queue.
   - Benefit: stronger prioritization and review.
   - Risk: low.
   - Size: small.
   - Dependencies: task-writing assist and goal-loop drafts.
   - Timing: now.

3. Keep lightweight manual task capture lightweight.
   - Rationale: forcing structure too early would make capture harder.
   - Benefit: preserves low-friction capture.
   - Risk: none.
   - Size: none.
   - Timing: ongoing.

### Review/Quality Changes

1. Strengthen review packets around criteria satisfaction.
   - Rationale: review should decide whether acceptance criteria, validation, risk, and follow-ups are satisfied.
   - Benefit: better closure and fewer ambiguous "done" states.
   - Risk: low.
   - Size: small/medium.
   - Dependencies: `workflow-prompts.ts`, `goal-work-packets.ts`, task governance UI.
   - Timing: now/later boundary.

2. Add a reviewable apply/update flow for project memory and goal progress proposals.
   - Rationale: learning should update durable state, but not silently.
   - Benefit: closes the loop from run evidence to system model.
   - Risk: medium.
   - Size: medium.
   - Dependencies: `goal-run-result-preview.ts`, project update APIs.
   - Timing: later.

3. Keep automatic acceptance out of scope.
   - Rationale: review and approval are human-decision surfaces.
   - Benefit: preserves quality and contact with reality.
   - Risk: none.
   - Size: none.
   - Timing: not yet.

### Future/Optional Changes

1. Introduce a general typed relationship model only if repeated concrete relation fields become unmanageable.
   - Rationale: arbitrary graph systems can become expensive and opaque.
   - Benefit: flexible provenance and knowledge graph semantics if needed.
   - Risk: high.
   - Size: large.
   - Dependencies: evidence from smaller relation fields failing.
   - Timing: not yet.

2. Add explicit capacity/attention budgeting to recommendations.
   - Rationale: scarce human attention is a product constraint.
   - Benefit: better prioritization.
   - Risk: medium because estimates can become false precision.
   - Size: medium.
   - Dependencies: planning/backlog and run cost/usage data.
   - Timing: later.

3. Model external collaborators as execution surfaces or providers only after local routing is clearer.
   - Rationale: collaborator work has social bandwidth and trust costs.
   - Benefit: avoids prematurely expanding scope.
   - Risk: medium/high.
   - Size: medium.
   - Dependencies: executor-routing rationale and review expectations.
   - Timing: later.

## Proposed Next Tasks

### 1. Completed: Reconcile Goal-Loop Docs With Implemented Progress Preview

- Purpose: remove stale "missing progress preview" language or clarify what remains missing.
- Relevant files/components: `docs/autonomous-goal-directed-work-loop-v0.md`, `docs/agent-facing-ams-interface-v0.md`, `src/lib/server/agent-run-results.ts`, `src/lib/server/goal-run-result-preview.ts`, `docs/ams-cli-reference.md`.
- Recommended executor: Codex.
- Required context: this audit, manifest output for run-result commands, relevant tests.
- Expected output: docs patch that distinguishes implemented preview-only behavior from missing guarded apply/update behavior.
- Acceptance criteria: docs mention `preview_progress_updates`; no claim that all project/goal progress previews are absent; remaining gaps are stated as reviewable apply/update flows.
- Risks/uncertainties: confirm CLI reference generation includes the command before editing command docs.
- Status: completed by the documentation reconciliation task; keep this as an acceptance record, not a next implementation recommendation.

### 2. Design Intent Interpretation Record Using Existing Entities First

- Purpose: define how raw human intent becomes explicit assumptions, constraints, uncertainties, candidate goals/tasks, decisions, and routing recommendations.
- Relevant files/components: new doc under `docs/`, `src/lib/types/control-plane.ts`, `src/lib/server/delegation-readiness.ts`, `src/lib/server/goal-work-loop.ts`, `src/lib/server/task-writing-assist.ts`, `AGENTS.md`.
- Recommended executor: Codex for design draft; human review required.
- Required context: this audit, readiness docs, goal-loop docs, current task/create APIs.
- Expected output: design note with proposed fields, storage options, non-goals, and migration-free first slice.
- Acceptance criteria: explicitly reuses Goal/Task/Run/Decision/Review; does not add a second planning system; separates raw intent, assumptions, constraints, uncertainties, candidate mappings, and review state.
- Risks/uncertainties: user judgment needed on whether interpretation should live on Task, Goal, Decision, or a small new record.
- Why next: it addresses the largest functional gap without changing schema prematurely.

### 3. Add Validate-Only Intent Interpretation Helper

- Purpose: produce a structured interpretation proposal from messy intent without mutating AMS state.
- Relevant files/components: `src/lib/server/assistant/intent.ts`, `src/lib/server/task-writing-assist.ts`, `src/lib/server/agent-capability-manifest.ts`, possible `/api/assistant/plan` or new agent capability route.
- Recommended executor: Codex.
- Required context: approved interpretation design note.
- Expected output: read-only helper and focused tests returning assumptions, constraints, uncertainties, candidate entity mappings, recommended next action, and proposed task fields.
- Acceptance criteria: no state mutation; bounded output; includes source text; includes confidence and review notes; tests cover ambiguous, research-heavy, execution-ready, and approval-gated intent.
- Risks/uncertainties: avoid model-dependent behavior in core deterministic tests.
- Why next: it creates a safe bridge from messy intent to reviewable state.

### 4. Improve Generated Task Proposals With Reasoning and Load-Reduction Test

- Purpose: ensure generated follow-up/planner tasks explain why they are worth creating.
- Relevant files/components: `src/lib/server/goal-work-loop.ts`, `src/lib/server/agent-run-results.ts`, `src/lib/server/task-writing-assist.ts`, `src/lib/server/goal-work-loop.spec.ts`, `src/lib/server/agent-run-results.spec.ts`.
- Recommended executor: Codex.
- Required context: this audit and existing goal-loop/run-result tests.
- Expected output: generated task drafts include rationale, uncertainty/load reduction, dependencies, acceptance criteria, and review metadata where appropriate.
- Acceptance criteria: existing lightweight manual capture remains unchanged; generated tasks include a "why now" rationale in summary or a future structured field; tests verify no duplicate task creation for same title/project/goal.
- Risks/uncertainties: without a structured interpretation model, rationale may initially be stored as prose.
- Why next: it improves task quality before adding schema.

### 5. Add Executor Routing Rationale Read Helper

- Purpose: explain the best available executor/tool for a task using existing state.
- Relevant files/components: `src/lib/server/execution-surface-api.ts`, `src/lib/server/direct-provider-task-fit.ts`, `src/lib/server/task-launch-planning.ts`, `src/lib/server/delegation-readiness.ts`, task execution panel.
- Recommended executor: Codex.
- Required context: current roles/providers/execution surfaces, readiness/risk/autonomy docs.
- Expected output: read-only helper returning recommended executor, rejected options, missing capabilities/tools, risk gates, and confidence.
- Acceptance criteria: no launches or mutations; handles human-only, analysis-only, Codex-capable, script/tool-missing, high-risk, and no-capacity cases.
- Risks/uncertainties: external collaborators and ChatGPT may need user-defined provider/surface semantics.
- Why next: routing is central to distributing work intelligently without pretending one AI can do everything.

### 6. Add Reviewable Project/Goal Memory Update Apply Flow

- Purpose: turn reviewed run evidence and existing `preview_progress_updates` proposals into selected project current-state, decision-log, and goal-progress updates.
- Relevant files/components: `src/lib/server/goal-run-result-preview.ts`, `src/lib/server/agent-run-results.ts`, project update APIs, goal detail/run detail UI, governance page.
- Recommended executor: Codex with summary review.
- Required context: existing `preview_progress_updates`, project update commands, review/approval policy.
- Expected output: apply flow for selected preview proposals where agents can propose memory/progress changes but not silently apply them.
- Acceptance criteria: preview is read-only; apply requires review or explicit operation; readback verifies project/goal/task state; tests cover accepted result, partial result, blocker, and out-of-scope follow-up.
- Risks/uncertainties: user must decide how much project memory should be agent-proposed versus manually curated.
- Why next: it closes the feedback loop from execution to durable model updates.

### 7. Audit Operator "What Next?" Surfaces

- Purpose: reduce overlap between planning, autonomous queue, goal detail, task detail, governance, and current-context recommendations.
- Relevant files/components: `/app/planning`, `/app/autonomous-queue`, `/app/goals/[goalId]`, `/app/tasks/[taskId]`, `/app/governance`, `src/lib/server/goal-work-loop.ts`, `src/lib/server/agent-current-context.ts`.
- Recommended executor: Codex for audit; human review for UX priority.
- Required context: screenshots/manual use of current UI, goal-loop classifications.
- Expected output: UI/service consolidation proposal, not immediate broad UI rewrite.
- Acceptance criteria: identifies duplicated signals, recommends one shared summary source, preserves existing workflows, and proposes one small first UI change.
- Risks/uncertainties: operator preference matters; avoid hiding useful specialized views.
- Why next: reducing operator attention cost is a core product goal.

### 8. Define Safe Self-Improvement Proposal Path

- Purpose: ensure recurring AMS failures become reviewable improvements without unsafe autonomous rule/schema changes.
- Relevant files/components: `src/lib/server/self-improvement*.ts`, `src/lib/types/self-improvement.ts`, self-improvement tests, `AGENTS.md`, AMS skills.
- Recommended executor: Codex for design/test plan; human review required.
- Required context: existing self-improvement policy tests and project constraints.
- Expected output: concise policy/design doc and follow-up implementation tasks.
- Acceptance criteria: proposals link to evidence, suggest docs/task-template/skill/workflow/code changes, require review, and cannot self-approve.
- Risks/uncertainties: balance between helpful adaptation and overfitting to agent errors.
- Why next: self-improvement is valuable only if it stays bounded and reviewable.

## Proposed Task Seed File Decision

No separate machine-readable proposed task seed file was created. The repository already has AMS task state, CLI/API task creation, goal-loop recommendations, and docs-based planning artifacts. Adding `planning/proposed-tasks.yaml`, `docs/proposed-next-tasks.md`, or `data/seed/proposed_tasks.yaml` would introduce a new planning format without an obvious existing convention.

The proposed next tasks above are intentionally written so they can be entered into AMS one at a time through the existing task API/CLI after review.

## Files and Areas Inspected

- Durable guidance: `AGENTS.md`, `.agents/skills/ams-agent-interface/SKILL.md`, `.agents/skills/ams-control-plane-operations/SKILL.md`.
- Core docs: `docs/autonomous-goal-directed-work-loop-v0.md`, `docs/agent-facing-ams-interface-v0.md`, `docs/progressive-delegation-readiness-v0.md`, `docs/task-readiness-autonomy-metadata.md`, `docs/contextual-rigor-profiles-v0.md`, `docs/runtime-data-policy.md`, `docs/ams-cli-reference.md`.
- Domain/types/storage: `src/lib/types/control-plane.ts`, `src/lib/server/control-plane.ts`, `src/lib/server/control-plane-repository.ts`, `src/lib/server/db/migrations/001-app-foundation.sql`.
- Goal/work-loop/readiness/evidence services: `src/lib/server/goal-work-loop.ts`, `src/lib/server/delegation-readiness.ts`, `src/lib/server/goal-work-packets.ts`, `src/lib/server/agent-run-results.ts`, `src/lib/server/goal-run-result-preview.ts`, `src/lib/server/agent-current-context.ts`.
- Planning/workflow/routing services: `src/lib/server/planning.ts`, `src/lib/server/workflows.ts`, plus route/service inventories under `src/routes/app` and `src/routes/api`.
- AMS state readback: `node scripts/ams-cli.mjs doctor`, `manifest`, `context current`, project/task readback, and snapshot collection counts from `data/control-plane.json`.

## Summary Judgment

AMS is already much closer to the target than a task tracker. It has durable project/goal/task/run/review/approval state, goal-loop classification, readiness/risk/rigor metadata, work packets, agent-facing CLI/API/MCP surfaces, execution surfaces, roles, skills, and review gates.

The main alignment gaps are not broad architecture gaps. They are narrower representation and workflow gaps:

- make interpretation of messy intent explicit
- represent assumptions, uncertainties, research questions, and clarification needs better than free text
- capture routing rationale for executor/tool choice
- turn planner/research output into reviewable state proposals
- close the run-result to project/goal memory loop safely
- prevent task generation from increasing cognitive load
- keep docs reconciled with implemented progress-preview behavior

With progress-preview docs reconciled, the recommended next move is to design the intent interpretation record using existing entities first.
