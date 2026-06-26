# Progressive Delegation Readiness v0

## Product Principle

Simple task capture stays simple. A title-only task is valid, and the base create/edit path does not require readiness, risk, acceptance criteria, validation, skills, assumptions, or context fields.

Structure is added progressively when the task is being delegated, prepared for autonomous work, blocked by uncertainty, made reviewable, or turned into a repeatable workflow/template/skill. The readiness layer is derived where possible and uses optional task enrichment fields that already exist in AMS.

## Current Implementation

The v0 domain layer lives in `src/lib/server/delegation-readiness.ts`. It exports `buildDelegationReadinessAssessment`, a pure deterministic assessment helper that returns:

- `recommendedMode`
- `readinessLabel`
- `canExecute`
- `needsClarification`
- `needsResearch`
- `needsReview`
- `riskFlags`
- `missingInformation`
- `suggestedNextActions`
- `rationale`

Task detail data computes this assessment in `src/lib/server/task-detail-page-data.ts` using the current task, project-installed prompt skills, runs, reviews, approvals, dependencies, providers, and execution surfaces.

Task detail renders a compact secondary panel in `src/lib/components/tasks/TaskDelegationReadinessPanel.svelte`, wired from `src/routes/app/tasks/[taskId]/TaskDetailPageContent.svelte`. The panel shows the readiness label, rationale, suggested next action, and a collapsed improvement checklist.

The task list computes the same assessment in `src/routes/app/tasks/+page.server.ts` and reuses it for filtering and badges in `src/routes/app/tasks/+page.svelte`. The list can filter by delegation mode, readiness level, autonomy level, risk, and blocker state.

Task creation and editing still allow lightweight capture. `src/routes/app/tasks/+page.server.ts` and `src/lib/server/task-update-action.ts` require a task name and project, but no longer require instructions/description.

Mode-aware prompt generation is implemented in `src/lib/workflow-prompts.ts` and task detail. The explicit executor/reviewer prompt buttons remain, and the new suggested prompt action chooses planner, research, execution, or review packet based on the computed readiness mode.

## Readiness Modes

`CAPTURED`: The task exists as lightweight capture but lacks enough framing for delegation. The task may have only a title or a very short description and no outcome, scope, validation, skill, capability, or tool requirements.

`NEEDS_CLARIFICATION`: The task has a blocker or ambiguity that requires user intent, preference, confirmation, or a decision before delegation.

`NEEDS_PLANNING`: The goal is understandable, but the task needs breakdown or a clearer execution contract such as outcome, acceptance criteria, scope, or validation.

`NEEDS_RESEARCH`: The task has uncertainty that should be reduced before execution. v0 detects this from blocker or summary language such as research, investigate, unknown, uncertain, spike, compare, verify, or find out.

`READY_FOR_EXECUTION`: The task is ready, unblocked, has no unmet dependencies or open review/approval, has enough outcome and validation context, uses executable readiness/autonomy levels, is low or medium risk, and does not declare missing skills/capabilities/tools.

`AWAITING_REVIEW`: The task has an open review, pending approval, review status, or a latest completed/blocked run.

`AUTOMATION_CANDIDATE`: The task is executable and appears repeatable because it is template-backed, workflow-backed, marked `R5_AUTOMATABLE`, or duplicates an existing task title.

## Progressive Enhancement UX

The task detail page does not push a giant form into the default reading path. The new readiness panel is a secondary card after the task overview. Its improvement checklist is collapsed by default.

The basic task capture flow still works with a title and project. Optional fields such as expected outcome, scope, non-goals, validation steps, readiness level, autonomy level, allowed actions, review requirement, blocked reason, required skills, capabilities, and tools remain progressive enrichment rather than mandatory capture fields.

The task list adds filters and badges so the user can find work by next useful step without opening every task. These filters reuse the same server-side readiness assessment instead of storing another task state.

## Prompt / Work Packet Behavior

Prompt generation is not the implementation of readiness. The readiness service is used independently by task detail and task-list filtering.

Generated work packets are mode-aware and selective:

- `CAPTURED`, `NEEDS_CLARIFICATION`, `NEEDS_PLANNING`, and `AUTOMATION_CANDIDATE` use a planner packet.
- `NEEDS_RESEARCH` uses a research packet that asks for evidence, uncertainty reduction, assumptions, and next-mode recommendations.
- `READY_FOR_EXECUTION` uses the executor packet with task contract, project memory, allowed actions, stopping conditions, and validation expectations.
- `AWAITING_REVIEW` uses the reviewer packet with task, run, review, artifacts, and accept/reject/needs-revision guidance.

The packets use relevant task/project/run fields instead of concatenating every possible object into a generic prompt.

## Future Work

- Capability fit: Replace simple provider/execution-surface checks with a first-class fit object that explains current assignee, eligible surfaces, missing runtime requirements, sandbox mismatch, and risk ceilings.
- Skill matching: Extend `SKILL.md` discovery or project skill policy metadata with required tools, context assumptions, validation expectations, risk limits, and task-fit keywords.
- Uncertainty tracking: Split blockers into structured open questions, research questions, assumptions, and decisions so the system can distinguish clarification from research more reliably.
- Delegation planner / expertise router: Add a workflow that proposes required capabilities, prompt skills, role, runtime, context package, and next task mode before launching work.
- Autonomous queue scoring: Build on delegation readiness with deterministic value, effort, risk, validation, and capability-fit scoring.
- Run feedback updating task/project memory: After review, write validation results, blockers, follow-up tasks, decisions, and current-state memo updates back into AMS records.
