# Contextual Procedural Knowledge v0

## Purpose

AMS should remember and reuse knowledge about how work is done without treating every principle as universal or task-specific. The system should accumulate reusable procedural knowledge such as workflows, task templates, skills, operating heuristics, design principles, and lessons from prior runs, then apply that knowledge based on the task context.

The v0 goal is placement and selection discipline, not a large ontology or an AI router. AMS should help agents find the right amount of context for the current purpose, audience, risk, ambiguity, and task type. It should not solve this by adding every possible field to task creation or dumping all project memory, skills, principles, workflows, and lessons into every prompt.

## Knowledge Types

- Task-specific details: the concrete request, expected outcome, scope, non-goals, acceptance criteria, validation steps, readiness, autonomy, risk, dependencies, attachments, and current blocker.
- Project memory: durable project context such as current state, constraints, non-goals, conventions, validation expectations, decision log, setup notes, and agent instruction paths.
- Goal context: strategic intent, success signal, planning priority, target dates, confidence, and relationships between goals and tasks.
- Task templates: reusable task shapes that prefill execution contract, governance, routing, and skill/capability requirements for similar future tasks.
- Workflows: ordered or parallelizable sequences of work with steps, dependencies, roles, instantiated tasks, and rollup state.
- Skills / playbooks: reusable procedural expertise with trigger conditions, workflow steps, references, tools, and failure shields.
- Agent instructions / `AGENTS.md`: repository or environment-specific instructions that should apply broadly while working in a repo.
- Design principles / operating heuristics: reusable tradeoff-based guidance such as context-sensitive information architecture, cognitive load management, or "inspect existing models before adding abstractions."
- Decision records: durable choices that explain why AMS is moving in one direction and not another.
- Run feedback / lessons learned: evidence from actual runs, reviews, failures, blockers, stale work, or reuse gaps that can update tasks, project memory, workflows, templates, or skills.

## Conflict Resolution Policy

Conflicting process instructions are defects, not harmless context. When two docs, prompts, or UI paths disagree about where work should happen, resolve the conflict in the source material before building around it.

For managed agent work, the canonical review surface is the linked task and `/app/governance`. Runs are evidence: logs, artifacts, validation, blockers, summaries, and diagnostics. Human accept/reject/needs-revision decisions belong to task review, approval, decision, and task-state records. Do not add a manual "paste/import run result" path for managed runs when AMS can capture run output automatically.

If a legacy instruction asks for a conflicting fallback, either remove it or narrow it explicitly to unmanaged external work. Do not leave both the old and new behavior described as normal.

## Knowledge Placement Matrix

| Knowledge type                           | What belongs there                                                                                                                                                                                                              | What should not belong there                                                                                                          | Example                                                                                                       | Scope                                               | Agent use                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task-specific details                    | The exact work request, desired output, acceptance criteria, validation, scope, non-goals, blocker, dependencies, risk, autonomy, and review expectation.                                                                       | Broad design principles, generic best practices, unrelated project history, or reusable process notes that would apply to many tasks. | "Build this exact feature in this repo."                                                                      | Task-specific                                       | Treat as the primary source of truth for the current run. Stop if ready condition, autonomy, risk, or validation context conflicts with execution.              |
| Project memory                           | Current project direction, constraints, coding conventions, default validation commands, default governance, important links, setup notes, project non-goals, and decision log.                                                 | Step-by-step instructions for a single task or every lesson from every run.                                                           | "This project is currently focused on solo-operator autonomous progress, not multi-team enterprise features." | Project-specific                                    | Include when it changes decisions, narrows scope, or sets validation/governance expectations. Summarize when dense.                                             |
| Goal context                             | Why a set of tasks exists, success signal, planning priority, confidence, target date, and related tasks/projects.                                                                                                              | Detailed implementation instructions that belong on tasks or reusable procedural guidance that belongs in workflows/templates/skills. | "Improve autonomous queue selection so ready low-risk work is easier to find."                                | Project-specific / cross-task                       | Use to prioritize and interpret tradeoffs, not to override a task's concrete contract.                                                                          |
| Task templates                           | Reusable task defaults: title/instruction pattern, outcome, scope, non-goals, success criteria, validation, readiness, autonomy, risk, review requirement, required skills/capabilities/tools, desired role, and workflow link. | One-off project state, completed-run evidence, or principles that are not specific to this type of task.                              | "Create a reviewable documentation change with validation command and summary review."                        | Reusable, usually project-specific                  | Use to create consistent task contracts. Do not force basic task capture through a full template.                                                               |
| Workflows                                | Ordered or parallelizable work sequences, role expectations per step, dependencies, instantiated task rollups, and repeatable work paths.                                                                                       | Every skill instruction, every possible exception, or task-specific details that only matter after instantiation.                     | "Audit -> gap analysis -> implementation plan -> implementation -> review."                                   | Reusable, usually project-specific                  | Use when the work naturally has stages or handoffs. Instantiate tasks with only the relevant step context.                                                      |
| Skills / playbooks                       | Procedural expertise: when to use it, when not to use it, steps, required references/scripts/tools, quality bar, and failure shields.                                                                                           | Project facts that will go stale quickly or instructions that should apply to every repo regardless of domain.                        | "When changing AMS, inspect existing models before adding new abstractions."                                  | Reusable, project-specific or global                | Load only when the task domain, requested skill, or required expertise matches. Follow its references progressively.                                            |
| Agent instructions / `AGENTS.md`         | Repo-local defaults, durable process constraints, coding conventions, tool preferences, and safety rules that should apply across tasks in that repo.                                                                           | Detailed feature specs, temporary task context, or large catalogs of optional principles.                                             | "Check the current repository for local `AGENTS.md` and `.agents/skills` before acting."                      | Project-specific or global                          | Read before acting in a repo. Treat as baseline operating constraints, not a substitute for task context.                                                       |
| Design principles / operating heuristics | Tradeoff-based guidance with applicability, non-applicability, cognitive-load impact, failure modes, and examples.                                                                                                              | A mandatory checklist copied into every prompt or form.                                                                               | "Use context-sensitive information architecture; avoid overwhelming users with irrelevant structure."         | Reusable / global or domain-specific                | Include when the task involves the relevant product, design, architecture, or process tradeoff.                                                                 |
| Decision records                         | Durable choices, rationale, alternatives rejected, date/context, owner, and downstream implications.                                                                                                                            | Active task instructions or unresolved brainstorming.                                                                                 | "Use existing task/template/workflow models for v0 rather than a new knowledge graph."                        | Project-specific                                    | Consult when a task appears to reopen a settled direction or when project memory is ambiguous.                                                                  |
| Run feedback / lessons learned           | What happened in a run, validation outcome, review decision, failure mode, prompt/context fit, repeated blocker, and suggested improvement.                                                                                     | Polished universal rules without evidence, or noisy one-off comments that have no reuse value.                                        | "This workflow worked poorly because it generated too much prompt noise."                                     | Task/run-specific evidence that may become reusable | Use when recent, repeated, high-impact, or directly matched to the current task. Promote to knowledge/template/skill updates only when evidence supports reuse. |

## Contextual Application Rules

AMS should decide whether a knowledge asset applies by asking what decision it changes for the current work.

- User intent: planning, research, implementation, review, approval, or coordination modes need different context.
- Audience: a human operator, executor agent, reviewer agent, or delegated child task may need different density and framing.
- Task type: code change, documentation, product design, research, governance, release, and coordination tasks draw on different playbooks.
- Project type: repo-specific conventions, product phase, operator constraints, and domain assumptions should affect selection.
- Risk level: high-risk, external-state, security, data, deployment, or irreversible work needs stronger governance and validation context.
- Ambiguity level: unclear tasks need clarification/planning heuristics more than execution playbooks.
- Available tools: only include tool- or skill-specific instructions when the current agent/runtime can actually use them.
- Required expertise: selected skills should match declared task requirements, role context, or a strong contextual signal.
- Cognitive load: prefer short summaries, hierarchy, and the smallest useful context package over exhaustive inclusion.
- Information density: dense memory or long lessons should be summarized unless the exact text changes execution.
- Device or work context: mobile triage, desktop implementation, background queue selection, and review screens need different levels of structure.
- Validation needs: include validation commands, success criteria, prior failure modes, and review expectations when they affect confidence.
- Prior run outcomes: repeated or severe failures should be weighted higher than isolated low-impact feedback.

For v0, deterministic selection and human-visible rationale are better than opaque automation. A knowledge item should have enough trigger/applicability metadata for AMS to explain why it was included.

## Avoiding Context Stuffing

AMS should not concatenate every relevant-looking field, principle, workflow, skill, and run lesson into every generated prompt or work packet. Context stuffing raises cognitive load, hides the task contract, increases prompt noise, and can make agents follow stale or irrelevant guidance. It also makes task creation feel like a bloated form even when the user only needs to capture a lightweight idea.

Selective context guidance:

- Include only what is needed for the current mode.
- Prefer task-specific information first: outcome, scope, non-goals, success criteria, validation, risk, autonomy, and blockers.
- Include project memory when it changes decisions, constraints, validation, governance, or scope.
- Include goal context when prioritization or tradeoff interpretation matters.
- Include workflows and task templates when they materially guide execution or task creation.
- Include skills when required by the task, requested by the user, selected by the role, or strongly matched to the task domain.
- Include design principles only when relevant to the task's domain or tradeoffs.
- Include run lessons only when they are recent, repeated, high-impact, or directly matched to the current task.
- Summarize long memory and lessons before prompt inclusion; link or attach source artifacts when detailed review is needed.
- Keep basic task creation lightweight; add structure progressively when delegating, automating, reviewing, or converting work into reusable assets.

## Relationship to Existing AMS Concepts

- Tasks: `Task` in `src/lib/types/control-plane.ts` already stores the execution contract and governance metadata: `successCriteria`, `readyCondition`, `expectedOutcome`, `scope`, `nonGoals`, `validationSteps`, `readinessLevel`, `autonomyLevel`, `allowedActionNames`, `reviewRequirement`, `riskLevel`, dependencies, blockers, attachments, prompt skills, capabilities, and tools. Task create/edit flows are handled by `src/lib/server/task-form.ts`, `src/lib/server/task-update-action.ts`, `src/routes/app/tasks/+page.svelte`, and `src/lib/components/tasks/TaskDetailEditorForm.svelte`.
- Projects: `Project` already carries project memory fields including `projectBrief`, `currentStateMemo`, `decisionLog`, `agentInstructionsPath`, `setupNotes`, `validationCommands`, `codingConventions`, `approvalRequirements`, default governance, constraints, and non-goals. Project pages and APIs live under `src/routes/app/projects/[projectId]` and `src/routes/api/projects`.
- Goals: `Goal` includes summary, status, success signal, target date, planning priority, confidence, and linked project/task relationships. Goal context supports prioritization and tradeoffs without replacing task instructions.
- Workflows: `Workflow` and `WorkflowStep` represent repeatable sequences and step dependencies. Helpers in `src/lib/server/workflows.ts` compute rollups, runnable task counts, review gates, blockers, dependencies, and parallelizable steps. Workflow pages live under `src/routes/app/workflows`.
- Task templates: `TaskTemplate` mirrors task execution-contract and routing fields, with lifecycle support through `lifecycleStatus`, `sourceTaskTemplateId`, `forkReason`, and `supersededByTaskTemplateId`. Server/UI surfaces include `src/lib/server/task-templates.ts`, `src/lib/server/task-template-form-actions.ts`, `src/lib/task-templates/editor.ts`, and `src/lib/components/task-templates/TaskTemplateEditorForm.svelte`.
- Skills: Project and global skills are discovered from `SKILL.md` files by `src/lib/server/codex-skills.ts` and shown under `src/routes/app/skills`. Tasks/templates can require prompt skills through `requiredPromptSkillNames`; projects can set skill availability policies with notes.
- Runs/threads: `Run` records execution facts, prompt digest, thread links, status, artifacts, summaries, blockers, follow-up tasks, model, usage, and cost. Review state remains on review/governance records, with run detail pages acting as evidence surfaces. Thread prompting is built in `src/lib/server/task-threads.ts`; task launch planning is in `src/lib/server/task-launch-planning.ts`; run detail pages live under `src/routes/app/runs`.
- Planning: `src/lib/server/planning.ts`, `docs/autonomous-work-queue-v0.md`, and `src/lib/server/autonomous-queue.ts` organize backlog selection using readiness, autonomy, risk, priority, validation quality, dependencies, review/approval state, and effort.
- Delegation readiness: `docs/progressive-delegation-readiness-v0.md` and `src/lib/server/delegation-readiness.ts` keep simple task capture lightweight while adding structure when work is delegated, researched, planned, executed, reviewed, or converted into a template/skill.
- Agent instructions: Global instructions and any repo-level `AGENTS.md` define durable operating defaults. Project-local `.agents/skills` provide contextual playbooks. This repo currently has project-local skills such as `.agents/skills/ams-control-plane-operations/SKILL.md`.
- Knowledge assets / lessons: `src/lib/types/self-improvement.ts` and `src/lib/server/self-improvement-knowledge.ts` already model self-improvement knowledge items with `triggerPattern`, `recommendedResponse`, `applicabilityScope`, source task/run/thread/signal IDs, status, and match reasons. `src/lib/server/task-launch-planning.ts` retrieves up to three relevant published knowledge items, and `src/lib/server/task-threads.ts` includes them in launch prompts with reasons.
- Prompt/work-packet generation: `src/lib/workflow-prompts.ts` and `src/lib/server/task-threads.ts` already build mode-aware packets and task-thread prompts from selected task/project/run/knowledge fields. The existing approach should be tightened over time, not replaced by a generic all-context prompt.

## Minimal v0 Implementation Recommendations

Do not add a new knowledge graph or duplicate workflow/template/skill subsystem for v0. The current architecture already has the right primary homes:

- Task contracts stay on tasks and task templates.
- Durable project context stays on projects and decision logs.
- Repeatable sequences stay in workflows.
- Procedural expertise stays in skills/playbooks.
- Lessons from runs stay in self-improvement knowledge until they have enough evidence to update a workflow, template, skill, or project memory.

The smallest coherent implementation now is documentation plus selective use of the existing fields. Larger metadata additions should be deferred because adding `useWhen`, `avoidWhen`, `requiredInputs`, `expectedOutputs`, `tradeoffs`, `failureModes`, or richer maturity fields across workflows, task templates, and skills would require coordinated type, normalizer, form, UI, API, and test updates in a worktree that already has broad in-progress changes.

Current mappings that should be used before adding duplicates:

- `SelfImprovementKnowledgeItem.triggerPattern` maps to "use when."
- `SelfImprovementKnowledgeItem.applicabilityScope` maps to contextual scope.
- `SelfImprovementKnowledgeItem.recommendedResponse` maps to the suggested procedural move.
- `SelfImprovementKnowledgeItem.status` maps to draft/published/archived maturity for lessons.
- `TaskTemplate.lifecycleStatus`, `sourceTaskTemplateId`, `forkReason`, and `supersededByTaskTemplateId` map to a basic pattern lifecycle for templates.
- `Role.lifecycleStatus`, `sourceRoleId`, `forkReason`, and `supersededByRoleId` map to a basic pattern lifecycle for roles.
- Project `decisionLog` and `currentStateMemo` cover v0 project memory and decision placement.
- Run fields such as `summary`, `validationSummary`, `resultSummary`, `blockersFound`, and `followUpTaskIds` support run evidence without a new review model. Final review status and human decisions stay on review/governance records, not on the run.

Near-term low-risk improvements, after the current in-progress work settles:

- Add optional context-of-use metadata to task templates first, because templates are already reusable task patterns and already have lifecycle fields.
- Add optional workflow-level `useWhen`, `avoidWhen`, `requiredInputs`, `expectedOutputs`, `tradeoffs`, and `failureModes` only on workflow detail/edit screens, not basic task creation.
- Extend skill discovery metadata only if it can remain optional and compatible with plain `SKILL.md`.
- Add run evidence fields for "workflow/template/skill used," "fit for task," and "improvement note" only if they can be captured automatically or reviewed through the linked task/governance path.
- Keep launch-prompt knowledge retrieval capped and rationale-bearing. If more context is available than fits, summarize or rank it instead of appending it all.

## Future Work

- Knowledge asset library: a first-class view over published self-improvement knowledge, decision records, design principles, skills, workflows, and templates without merging them into one table.
- Skill/context routing: deterministic matching that explains why a skill, lesson, workflow, or template applies and lets the operator accept or reject the match.
- Capability fit: richer matching between task requirements, roles, skills, tools, execution surfaces, sandbox, model, validation ability, and risk ceiling.
- Uncertainty-aware task selection: route ambiguous tasks to clarification, research, or planning before execution.
- Run feedback improving workflows/templates/skills: promote repeated lessons into updated assets with provenance instead of keeping all feedback as raw run notes.
- Pattern lifecycle: draft, candidate, validated, specialized, deprecated, and superseded states for workflows, templates, skills, and lessons.
- Selective context assembly for agent work packets: mode-aware context budgets, summaries, source links, and inclusion reasons.
- Failure-mode tracking: record when a workflow/template/skill produced too much prompt noise, missed context, wrong expertise, insufficient validation, or poor task fit.
- Design principle library: store principles with applicability, non-applicability, tradeoffs, examples, evidence, and failure modes, then include them only for relevant product/design tasks.
