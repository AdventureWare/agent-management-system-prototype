# Autonomous Progress Loop v0 Audit

## Executive Summary

AMS is not a greenfield system. It already has a broad control-plane model for projects, goals, tasks, subtasks, task templates, workflows, runs, reviews, approvals, roles, providers, execution surfaces, skills, planning sessions, decisions, and agent-facing CLI/API operations.

Product direction: managed agent work should be reviewed through the linked task, not through a separate manual "paste a run result" workflow. Runs are evidence records. Reviews, approvals, blockers, follow-up tasks, and final human decisions should be surfaced on task detail and `/app/governance`. If a requirement asks for manual result entry while the system can already capture managed run output, resolve the conflict by removing or rewriting the stale requirement; do not leave both directions in place.

The shortest path to Autonomous Progress Loop v0 is to extend existing project and task records instead of introducing parallel models. The strongest reusable base is:

- `Task` already carries much of an execution contract: `successCriteria`, `readyCondition`, `expectedOutcome`, `priority`, `riskLevel`, `approvalMode`, `requiresReview`, dependencies, required skills/capabilities/tools, sandbox, assignee, runs, attachments, and delegated child-task fields.
- `/app/planning` already computes deterministic backlog buckets and scores from priority, status, goal priority, dates, blockers, dependencies, effort, and execution-surface availability.
- `/app/governance` already acts as a human intervention inbox for reviews, approvals, blockers, dependency holds, and stale runs.
- Task launch already checks readiness status, active runs, project root access, approval gates, dependencies, execution contract fields, role context, skill/tool requirements, model/sandbox settings, and workspace access before starting a thread.

The main gaps are explicit project memory fields, delegation-readiness computation, an autonomous queue view/API, clearer planner output capture, branch/worktree isolation policy, run-level skill/context tracking, and richer review records. These should be added as small extensions to existing `Project`, `Task`, `PlanningSession`, `Run`, `Review`, and `Decision` records, persisted through the current collection-record storage.

## Existing System Map

### Architecture and Persistence

- App framework: SvelteKit routes under `src/routes/app` and APIs under `src/routes/api`.
- Core domain types: `src/lib/types/control-plane.ts`.
- Control-plane load/normalization/factory helpers: `src/lib/server/control-plane.ts`.
- Collection mutation helpers: `src/lib/server/control-plane-repository.ts`.
- SQLite persistence: `src/lib/server/db/control-plane-store.ts`.
- SQLite schema: `src/lib/server/db/migrations/001-app-foundation.sql` stores all control-plane domain objects in `control_plane_records(collection, id, position, payload)`.
- Legacy JSON still exists at `data/control-plane.json`; `loadControlPlane()` normalizes legacy records and syncs into SQLite when needed.
- Current collections: `providers`, `roles`, `projects`, `goals`, `workflows`, `workflowSteps`, `taskTemplates`, `executionSurfaces`, `tasks`, `runs`, `reviews`, `approvals`, `planningSessions`, `decisions`.

Migration convention: add fields to TypeScript domain types and normalizers first; no new SQL table is needed unless query volume or relational constraints justify leaving the collection-record model.

### Projects

- Model: `Project` in `src/lib/types/control-plane.ts`.
- Fields: `name`, `summary`, hierarchy, `projectRootFolder`, `defaultArtifactRoot`, repo path/URL/branch, `additionalWritableRoots`, `defaultThreadSandbox`, `defaultModel`, project skill availability policies.
- Pages: `/app/projects` and `/app/projects/[projectId]`.
- Load/update: `src/routes/app/projects/[projectId]/+page.server.ts`.
- UI: `src/routes/app/projects/[projectId]/+page.svelte`.
- API: `src/routes/api/projects/+server.ts`, `src/routes/api/projects/[projectId]/+server.ts`.
- Agent API support: `AgentCreateProjectInput`, `AgentUpdateProjectInput`, project list/create/update functions in `src/lib/server/agent-control-plane-api.ts`.
- Tests: `src/routes/app/projects/[projectId]/project-detail-page.server.spec.ts`, `project-detail-page.svelte.spec.ts`, `projects-page.svelte.spec.ts`, plus project API coverage in `src/lib/server/agent-control-plane-api.spec.ts`.

Current state: partial project memory. Repo/root/artifact/sandbox/model defaults exist, but project brief, current state memo, explicit AGENTS.md link, constraints, non-goals, validation commands, and default autonomy policy are not first-class fields.

### Goals

- Model: `Goal` in `src/lib/types/control-plane.ts`.
- Fields: hierarchy, linked projects/tasks, `successSignal`, `targetDate`, `planningPriority`, `confidence`.
- Pages: `/app/goals`, `/app/goals/[goalId]`.
- APIs: `src/routes/api/goals/+server.ts`, `src/routes/api/goals/[goalId]/+server.ts`.
- Planning action updates: `src/routes/app/planning/+page.server.ts`.
- Relationship helpers: `src/lib/server/goal-relationships.ts`.
- Tests: `goal-detail-page.*.spec.ts`, `goals-page.*.spec.ts`, `goal-relationships.spec.ts`, agent API goal tests.

Current state: reusable. Goals already provide strategic context and planning priority for autonomous queue ranking.

### Tasks and Subtasks

- Model: `Task` and `DelegationPacket` in `src/lib/types/control-plane.ts`.
- Current execution fields: `summary`, `successCriteria`, `readyCondition`, `expectedOutcome`, `scope`, `nonGoals`, `validationSteps`, `readinessLevel`, `autonomyLevel`, `allowedActionNames`, `reviewRequirement`, `priority`, `status`, `riskLevel`, `approvalMode`, `requiredThreadSandbox`, `requiresReview`, `desiredRoleId`, `assigneeExecutionSurfaceId`, required prompt skills/capabilities/tools, `blockedReason`, dependencies, estimate, target date, artifact path, attachments.
- Subtasks: represented by `parentTaskId`, `delegationPacket`, and `delegationAcceptance`; no separate subtask table.
- Form parsing: `src/lib/server/task-form.ts`.
- Detail update: `src/lib/server/task-update-action.ts`, `src/lib/server/task-plan-updates.ts`.
- Task list/detail pages: `/app/tasks`, `/app/tasks/[taskId]`.
- Task UI components: `src/lib/components/tasks/TaskDetailEditorForm.svelte`, `TaskExecutionPanel.svelte`, `TaskGovernancePanel.svelte`, `TaskResourcesPanel.svelte`, `TaskDetailOverview.svelte`.
- Work item composition: `src/lib/server/task-work-items.ts`, `src/lib/types/task-work-item.ts`.
- APIs: `src/routes/api/tasks/+server.ts`, `src/routes/api/tasks/[taskId]/+server.ts`, plus review, approval, attachments, child handoff, decompose, session launch, and recovery routes under `src/routes/api/tasks/[taskId]/`.
- Tests: `src/lib/task-execution-contract.spec.ts`, `src/lib/task-thread-context.spec.ts`, task detail/list specs, `src/lib/server/task-detail-*.spec.ts`, `task-session-actions.spec.ts`, `agent-control-plane-api.spec.ts`.

Current state: strong partial support for task readiness. Explicit readiness/autonomy fields already exist in `Task`, task forms, task templates, normalizers, and agent API paths, including `TASK_READINESS_LEVEL_OPTIONS` (`R0_IDEA` through `R5_AUTOMATABLE`) and `TASK_AUTONOMY_LEVEL_OPTIONS` (`A0_HUMAN_ONLY` through `A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE`). The remaining gap is making those fields drive delegation readiness, autonomous queue filtering, launch gating, and run/review traceability.

### Task Templates

- Model: `TaskTemplate` in `src/lib/types/control-plane.ts`.
- Pages: `/app/task-templates`, `/app/task-templates/[taskTemplateId]`.
- Editor: `src/lib/components/task-templates/TaskTemplateEditorForm.svelte`.
- Server actions: `src/lib/server/task-template-form-actions.ts`, `src/lib/task-templates/editor.ts`.
- Directory/decorators: `src/lib/server/task-template-directory.ts`, `src/lib/server/task-templates.ts`.
- Tests: `task-templates-page.*.spec.ts`, `task-template-detail-page.*.spec.ts`.

Current state: reusable for canonical ready-task shapes. Templates already carry execution-contract and routing fields, but should inherit any new readiness/autonomy fields added to `Task`.

### Workflows

- Models: `Workflow`, `WorkflowStep` in `src/lib/types/control-plane.ts`.
- Pages: `/app/workflows`, `/app/workflows/[workflowId]`, `/app/workflows/new`.
- Server helpers: `src/lib/server/workflows.ts`.
- Instantiation: `src/lib/server/workflow-template-instantiation.ts`.
- UI: `src/lib/components/workflows/WorkflowStepEditor.svelte`.
- Tests: workflow page specs and `workflow-create-page.*.spec.ts`.

Current state: reusable. Workflows roll up task states and identify runnable counts, review gates, blockers, dependencies, and parallelizable steps.

### Runs and Threads

- Model: `Run` in `src/lib/types/control-plane.ts`.
- Agent-thread types: `src/lib/types/agent-thread.ts`.
- Run pages: `/app/runs`, `/app/runs/[runId]`.
- Run record composition: `src/lib/server/run-records.ts`, run telemetry in `src/lib/server/run-telemetry.ts`.
- Thread pages: `/app/threads`, `/app/threads/[threadId]`.
- Thread store: `src/lib/server/db/agent-threads-store.ts`; migration `002-agent-thread-foundation.sql`.
- Thread helpers: `src/lib/server/agent-threads.ts`.
- CLI: `scripts/agent-thread-cli.mjs`, `scripts/agent-thread-runner.mjs`, `scripts/agent-thread-runner-args.mjs`.
- Task-thread context: `src/lib/task-thread-context.ts`, `src/lib/server/task-thread-compatibility.ts`.
- APIs: `src/routes/api/agents/threads/*`, `src/routes/api/runs/[runId]/+server.ts`, `src/routes/api/execution-surfaces/*`.
- Tests: `agent-thread-store.spec.ts`, `thread-detail-page.svelte.spec.ts`, `runs-page.svelte.spec.ts`, `run-detail-page.svelte.spec.ts`, thread recovery specs.

Current state: reusable. Runs capture status, timestamps, thread links, summary, error summary, artifacts, model, token usage, and cost. Missing structured validation result fields and branch/worktree metadata.

### Roles

- Model: `Role` in `src/lib/types/control-plane.ts`.
- Pages: `/app/roles`, `/app/roles/[roleId]`.
- Role context for launch: `src/lib/server/task-role-context.ts`.
- Role picker: `src/lib/components/RolePicker.svelte`.
- Tests: role page specs and `RolePicker.svelte.spec.ts`.

Current state: reusable for planner/executor/reviewer role routing.

### Providers and Execution Surfaces

- Models: `Provider`, `ExecutionSurface`, `ProviderModelPricing` in `src/lib/types/control-plane.ts`.
- Provider pages: `/app/providers`, `/app/providers/[providerId]`.
- Execution surface pages: `/app/execution-surfaces`, `/app/execution-surfaces/[executionSurfaceId]`.
- Assignment and workload: `src/lib/server/execution-surface-api.ts`.
- Preflight: `src/lib/server/task-execution-preflight.ts`.
- Model selection: `src/lib/server/task-launch-model.ts`.
- Workspace checks: `src/lib/server/task-execution-workspace.ts`.
- APIs: `src/routes/api/execution-surfaces/register/+server.ts`, `heartbeat`, `poll`, `tasks/claim`, `tasks/update`.
- Tests: `execution-capability-catalog.spec.ts`, `execution-requirement-inventory.spec.ts`, `task-execution-workspace.spec.ts`.

Current state: reusable for autonomous execution safety and capacity checks.

### Governance and Access

- Reviews/approvals/decisions: `Review`, `Approval`, `Decision` in `src/lib/types/control-plane.ts`.
- Governance actions: `src/lib/server/task-governance.ts`.
- Governance inbox: `/app/governance`.
- Governance panel: `src/lib/components/tasks/TaskGovernancePanel.svelte`.
- Task governance labels: `src/lib/task-governance-ui.ts`.
- Access dashboard: `/app/access`, `src/lib/server/access-dashboard.ts`, `src/lib/server/project-access.ts`, `src/lib/server/access-probe-store.ts`.
- Operator auth: `src/hooks.server.ts`, `src/lib/server/operator-auth.ts`, auth routes under `src/routes/auth`.
- Tests: `task-governance-ui.spec.ts`, `governance-page.svelte.spec.ts`, `access-probe-store.spec.ts`, `operator-auth.spec.ts`.

Current state: strong partial support. The inbox already surfaces review, approval, blocked, dependency, and stale work; review records need richer validation/diff/blocker fields.

### Skills

- Project-local skills: `.agents/skills/*` and `.agents/*`.
- App skill discovery: `src/lib/server/codex-skills.ts`, `src/lib/server/external-skills.ts`, `src/lib/server/skill-management.ts`.
- Skills pages: `/app/skills`, `/app/skills/[skillId]`.
- Project skill inventory: project detail page and `src/lib/server/execution-capability-catalog.ts`.
- Tests: `codex-skills.spec.ts`, `external-skills.spec.ts`, `skills-page.server.spec.ts`, skill detail specs.

Current state: reusable. Required prompt skills can already be attached to tasks and templates.

## Skills, Context, and Delegation Readiness

AMS should treat task readiness as relative to the delegate: the same task may be safe for one agent/runtime with the right skills, context, tools, sandbox, and validation path, and unsafe for another. The current system already has most of the raw ingredients, but the match is spread across task fields, roles, projects, providers, execution surfaces, prompt construction, and UI inventories.

### Current Skill Representation

Skills are represented in three related but distinct ways:

- Codex prompt skills are discovered from `SKILL.md` files by `src/lib/server/codex-skills.ts`. The discovered record is lightweight: `id`, `description`, whether it is global or project-local, and a source label. The parser reads frontmatter `name` and `description`; it does not model prerequisites, risk limits, required tools, context needs, or validation commands.
- Project skill availability policies live on `Project.skillAvailabilityPolicies` and `Project.skillAvailabilityPolicyEvents` in `src/lib/types/control-plane.ts`, with updates handled by `src/lib/server/skill-management.ts`. These policies can mark a skill as default/enabled/disabled for a project with notes.
- Execution capabilities are modeled separately from Codex prompt skills. `Provider.capabilities`, `Provider.launcher`, `ExecutionSurface.skills`, and execution-surface status/capacity are rolled up by `src/lib/server/execution-capability-catalog.ts` and `src/lib/server/execution-requirement-inventory.ts`.

Current support: partial and reusable. The system can discover installed skills, show project-local/global skill availability, detect missing task-requested skills, and compare task capability/tool requirements against providers and execution surfaces. It does not yet expose a unified skill/playbook metadata schema for delegation readiness.

### Links to Tasks, Projects, Workflows, Agents, Providers, and Runs

Existing links:

- Projects: `Project.skillAvailabilityPolicies` controls project-level skill availability; project detail shows installed and missing requested skills.
- Tasks: `Task.requiredPromptSkillNames`, `Task.requiredCapabilityNames`, and `Task.requiredToolNames` express prompt-skill and execution requirements.
- Task templates: `TaskTemplate.requiredPromptSkillNames`, `requiredCapabilityNames`, and `requiredToolNames` mirror task requirement fields.
- Roles: `Role.skillIds`, `Role.toolIds`, and `Role.mcpIds` express preferred expertise/tools/MCPs for a role.
- Execution surfaces: `ExecutionSurface.skills` acts like runnable capability labels; `supportedRoleIds`, status, capacity, concurrency, sandbox override, and model override further constrain assignment.
- Providers: `Provider.capabilities`, `launcher`, `authMode`, `enabled`, `setupStatus`, default sandbox, and default model describe available runtime capability.
- Runs: `Run` stores task/runtime execution facts such as provider, execution surface, assumed role, model, thread, artifact paths, token usage, cost, summary, and error summary.
- Workflows: `WorkflowStep.desiredRoleId` can encode role/expertise preference for a workflow step; tasks link to workflows via `workflowId`.

Missing or weak links:

- Runs do not record which prompt skills were actually selected or loaded for a run.
- Runs do not record the context package that was generated, beyond `promptDigest` and thread links.
- Skill metadata does not declare required tools, context assumptions, risk ceilings, or validation expectations.
- Workflows do not directly express required skills/capabilities/tools at the step level beyond `desiredRoleId`; instantiated tasks can carry those fields after creation.

### Task Requirement Expressiveness

Tasks currently express:

- Task clarity: `summary`, `scope`, `nonGoals`, `successCriteria`, `readyCondition`, `expectedOutcome`.
- Validation quality: `validationSteps` plus legacy `successCriteria` and `readyCondition`.
- Readiness/autonomy: `readinessLevel`, `autonomyLevel`, `allowedActionNames`, `reviewRequirement`, `riskLevel`, `approvalMode`, `requiresReview`.
- Required prompt skills: `requiredPromptSkillNames`.
- Required execution capabilities/tools: `requiredCapabilityNames`, `requiredToolNames`.
- Required runtime context: `projectId`, `goalId`, `workflowId`, `parentTaskId`, `delegationPacket`, dependencies, artifact path, attachments, desired role, assignee execution surface, thread sandbox.
- Blockers: `blockedReason` and `dependencyTaskIds`.

Missing pieces:

- `requiredContextItems` or equivalent structured context checklist.
- Explicit ambiguity/assumption policy, such as "stop and ask," "state assumptions and continue," or "planner-only until clarified."
- Differentiation between tools required to perform the task (`requiredToolNames`) and tools/actions the agent is allowed to use (`allowedActionNames`) in queue scoring and launch checks.
- A computed readiness explanation that tells the user which dimension failed: clarity, skill match, context sufficiency, tools, validation, risk, or ambiguity.

### Agent, Provider, and Runtime Capability Expressiveness

Agents/runtimes currently express:

- Providers: kind, service, enabled/setup status, auth mode, launcher, capabilities, default model, default sandbox, model pricing.
- Execution surfaces: provider, supported roles, status, capacity, skills, weekly capacity, focus factor, max concurrent runs, sandbox override, model override, heartbeat/auth token.
- Roles: family, lifecycle status, skill/tool/MCP IDs, system prompt, checklist, approval/escalation policy.
- Threads: reusable run context, topic matching, active/idle state, and contact/recovery surfaces.

Missing pieces:

- Explicit allowed actions on providers/execution surfaces.
- Risk ceilings per role, provider, execution surface, or thread.
- Context limits: max prompt/context budget, max attachment size, max repository scope, or whether the runtime can inspect prior thread state.
- Validation capability: which runtimes can run tests, inspect diffs, use browser automation, call external APIs, or create PRs.
- Provider/tool safety policy separate from raw provider capability.

### Delegation Readiness Computation

Minimal v0 should compute a delegation-readiness record per task/runtime candidate instead of treating `Task.status === 'ready'` as enough. A helper such as `buildDelegationReadiness(data, task, candidate)` could return a score, status, and reasons across these dimensions:

- Task clarity: pass when `summary`, `expectedOutcome`, `successCriteria`, and `scope` or `readyCondition` are adequate; warn on broad or empty fields.
- Skill match: pass when `requiredPromptSkillNames` are installed/enabled for the project or supplied by the role; warn when missing or disabled.
- Context sufficiency: pass when project root exists, AGENTS/instructions path or project memory exists, dependencies are done, attachments/artifacts are accessible, and delegation packet is complete for child tasks.
- Tool availability: pass when provider/execution surface covers `requiredCapabilityNames` and `requiredToolNames`, and allowed actions do not exceed runtime policy.
- Validation quality: pass when `validationSteps` or concrete success criteria exist; stronger pass when validation commands are executable by the selected runtime.
- Risk level: pass for low-risk bounded/autonomous tasks; require review/approval or planner mode for medium/high/critical risk.
- Ambiguity level: derive an initial signal from empty scope/non-goals/validation, high-risk plus low readiness, or explicit assumption policy once added.

Display this as badges and reason lists in `/app/tasks`, task detail execution preflight, `/app/planning`, and the future autonomous queue. The existing `buildTaskExecutionPreflight()`, `buildExecutionCapabilityCatalog()`, `buildTaskExecutionContractStatus()`, `buildTaskWorkItems()`, and planning backlog scoring should be reused rather than replaced.

### Skill Selection

Skill selection should happen in layers:

- Manual by the user: keep `requiredPromptSkillNames` on tasks/templates and project skill availability controls for explicit operator judgment.
- Automatically by task metadata: suggest skills from task title/summary/scope, goal/project labels, required capabilities, role, and workflow step.
- Through planner/delegation workflow: planner should propose missing skills or update task requirements before a task becomes `R5_AUTOMATABLE`.
- Through Codex Skill descriptions: current `SKILL.md` frontmatter descriptions are useful for matching, but v0 should treat them as suggestions, not hard policy.

Recommended minimal path:

- Preserve manual skill selection as the source of truth for v0.
- Add non-mutating suggestions in planner/task detail before auto-applying skills.
- Track which suggested/required skills were actually included when launching a run.

### Reusing Existing Concepts Without Duplicates

Do not create new "Expertise," "SkillRequirement," or "AgentProfile" models for v0. Reuse:

- `Task.requiredPromptSkillNames` for Codex skill requirements.
- `Task.requiredCapabilityNames` for work capability requirements.
- `Task.requiredToolNames` for runtime/tool availability requirements.
- `Task.allowedActionNames` for permission bounds.
- `Role.skillIds`, `toolIds`, and `mcpIds` for expertise bundles.
- `ExecutionSurface.skills` and `Provider.capabilities` for delegate capability.
- `TaskTemplate` for reusable delegation-ready task specs.
- `WorkflowStep.desiredRoleId` plus instantiated task requirements for workflow expertise.
- `Project.skillAvailabilityPolicies` for project-specific skill enable/disable decisions.

### Minimal v0 Recommendations

Required capabilities on tasks:

- Keep `requiredCapabilityNames`, `requiredToolNames`, `requiredPromptSkillNames`, and `allowedActionNames`.
- Add computed readiness, not new fields, to determine whether those requirements are satisfied by a selected execution surface/provider/role.
- Rename UI copy carefully so users understand the difference between prompt skills, capabilities, runtime tools, and allowed actions.

Skill/playbook metadata:

- Extend skill discovery with optional metadata only when present in `SKILL.md` or adjacent files: `requiredTools`, `riskCeiling`, `contextNeeds`, `validationHints`, and `defaultAllowedActions`.
- Keep this optional and advisory; do not require all existing skills to be migrated for v0.

Context package generation:

- Formalize the context package produced by `buildTaskThreadPrompt()` as a structured object before rendering to text.
- Include project memory links, task clarity fields, required skills/capabilities/tools, allowed actions, role context, relevant knowledge items, dependencies, artifacts, validation steps, and stopping conditions.
- Store a digest plus a compact summary on `Run`; avoid storing huge prompts repeatedly unless needed.

Agent/run skill selection tracking:

- Add run-level fields such as `promptSkillNamesUsed`, `capabilityNamesMatched`, `toolNamesMatched`, `contextPackageDigest`, and `contextPackageSummary`.
- Populate these from `buildTaskLaunchPlan()` and `resolveTaskRolePromptContext()`.
- Display them on run detail and governance review cards.

Future Delegation Planner or Expertise Router:

- Implement as a workflow/helper, not a new domain hierarchy.
- Input: project memory, task/template metadata, role catalog, skill catalog, providers, execution surfaces, current threads, risk/autonomy policies.
- Output: recommended role, required prompt skills, execution surface/provider candidates, missing context, required validation, ambiguity questions, and whether the task should be planner-only, ready for bounded execution, or stopped for review.
- Store accepted recommendations by updating the existing task fields and recording a `Decision`.

### Planning

- Planning model: `PlanningSession` in `src/lib/types/control-plane.ts`.
- Planning page: `/app/planning`.
- Planner data and deterministic backlog scoring: `src/lib/server/planning.ts`.
- Planning actions: update goal planning fields, capture planning sessions in `src/routes/app/planning/+page.server.ts`.
- Goal/task writing assists: `src/lib/server/goal-writing-assist.ts`, `src/lib/server/task-writing-assist.ts`.
- APIs for assistant plan/execute: `src/routes/api/assistant/plan/+server.ts`, `src/routes/api/assistant/execute/+server.ts`.
- Tests: `planning-page.server.spec.ts`.

Current state: partial. Planning can summarize and rank existing work, but it does not yet store planner-generated task specs, proposed next tasks, blockers, project status summaries, or user questions as structured outputs.

### Agent-Facing Control Plane

- CLI: `scripts/ams-cli.mjs`.
- CLI docs: `docs/ams-cli-reference.md`.
- Capability manifest: `src/lib/server/agent-capability-manifest.ts`, command definitions in `src/lib/server/agent-capability-commands.js`, playbooks in `src/lib/server/agent-capability-playbooks.js`.
- Agent current context: `src/routes/api/agent-context/current/+server.ts`, `src/lib/server/agent-current-context.ts`.
- Agent intents: `src/routes/api/agent-intents/[intent]/+server.ts`, `src/lib/server/agent-intent-actions.ts`.
- Agent API: `src/lib/server/agent-control-plane-api.ts`.
- MCP wrapper: `plugins/ams-control-plane/README.md`, `scripts/ams-control-plane-mcp.mjs`.
- Tests: `agent-control-plane-api.spec.ts`, `ams-control-plane-mcp.spec.ts`, `agent-use-reliability.spec.ts`.

Current state: strong reusable base for managed runs. During this audit, the local operator API was not reachable at `http://127.0.0.1:3000`, so task state could not be read back through the CLI.

## Target Capability Gap Analysis

### 1. Project Memory

Current support: partial.

- `Project` has summary, root folder, artifact root, repo defaults, additional writable roots, sandbox, model, and skill policies.
- `Decision` provides a durable log, but decisions are global records linked by optional `taskId`, `goalId`, `runId`, review/approval/session IDs.
- `PlanningSession` captures planning windows and linked decisions.
- Project detail shows scoped goals, tasks, permissions, skills, and defaults.

Missing pieces:

- First-class project brief path/content.
- Current state memo path/content.
- AGENTS.md or equivalent instruction file path.
- Explicit constraints, non-goals, validation commands, and default autonomy policy.
- Project-scoped decision log view/filter.

Reusable existing pieces:

- Extend `Project`; reuse `Decision` for logs and `projectRootFolder` for AGENTS.md discovery.
- Reuse project detail page, access dashboard, skill inventory, and task launch prompt builder.

Recommended implementation approach:

- Add memory fields to `Project`, not a new project-memory table.
- Add a compact "Project Memory" section to project detail and include these fields in task launch prompts.
- Add a project-scoped decisions panel by filtering decisions through project-linked tasks/goals.

Risks / duplication concerns:

- Avoid creating separate "memory document" records before there is a real need for versioning or rich editing.
- Do not duplicate `Decision`; use it as the decision log and add project filtering/indexing behavior.

### 2. Task Readiness System

Current support: partial, with most of the needed metadata already present.

- Existing `Task` fields cover outcome, acceptance-ish criteria, validation-ish ready condition, scope, non-goals, validation steps, readiness level, autonomy level, allowed actions, review requirement, risk, priority, approval mode, blockers, dependencies, required prompt skills/capabilities/tools, sandbox, assignee, target date, and estimate.
- `src/lib/task-execution-contract.ts` checks `successCriteria`, `readyCondition`, and `expectedOutcome`.
- `buildTaskLaunchPlan()` blocks non-ready tasks, active duplicate runs, pending before-run approvals, missing project roots, execution-surface gaps, workspace access issues, and contract gaps.

Missing pieces:

- Explicit `acceptanceCriteria` separate from current free-text `successCriteria`, unless the product decides to rename rather than duplicate.
- Computed readiness reasons that combine task clarity, skill match, context sufficiency, tool availability, validation quality, risk, and ambiguity.
- Launch/queue enforcement that uses `readinessLevel`, `autonomyLevel`, `allowedActionNames`, and `reviewRequirement`.
- Clear review requirement semantics: currently split across `reviewRequirement`, `requiresReview`, and `approvalMode`.

Reusable existing pieces:

- `successCriteria`, `readyCondition`, `expectedOutcome`, `scope`, `nonGoals`, `validationSteps`, `readinessLevel`, `autonomyLevel`, `allowedActionNames`, `reviewRequirement`, `blockedReason`, `dependencyTaskIds`, `riskLevel`, `approvalMode`, `requiresReview`, `requiredThreadSandbox`, `requiredPromptSkillNames`, `requiredCapabilityNames`, `requiredToolNames`.
- Task forms, task templates, execution contract helper, launch preflight, governance inbox.

Recommended implementation approach:

- Keep `successCriteria`; optionally relabel in UI as "Acceptance criteria" after migration rather than adding a duplicate field.
- Add a pure helper such as `buildTaskReadinessAssessment(data, task, candidate)` that returns `isAgentReady`, `blockers`, `warnings`, and dimension scores for clarity, skills, context, tools, validation, risk, and ambiguity.
- Thread existing readiness/autonomy fields into autonomous queue filtering, launch preview, and review explanations.

Risks / duplication concerns:

- `requiredToolNames` means "tools needed to do the work," not "tools the agent is allowed to use." Keep allowed actions separate.
- `readyCondition` currently means "what must be true before launch" and should not become acceptance criteria.

### 3. Autonomous Queue

Current support: partial.

- `/app/planning` already produces Now/Next/Later backlog buckets and deterministic scores in `src/lib/server/planning.ts`.
- `buildTaskWorkItems()` decorates tasks with reviews, approvals, dependency state, linked threads, latest runs, and staleness.
- Workflow rollups identify runnable tasks.
- Launch preflight checks execution surface and workspace constraints.

Missing pieces:

- A queue specifically filtered to "safe ready autonomous work."
- Queue explanation fields focused on agent execution safety.
- An API/CLI command to list launchable autonomous candidates.
- Validation quality scoring.
- Default policy that excludes risky or ambiguous tasks.

Reusable existing pieces:

- Planning backlog scoring, task freshness, task execution contract, task governance, execution-surface availability, dependency checks.

Recommended implementation approach:

- Add `src/lib/server/autonomous-queue.ts` that composes existing helpers.
- Initial deterministic filter:
  - status is `ready`
  - no unmet dependencies
  - no pending approval
  - no open review
  - `riskLevel === 'low'`
  - `autonomyLevel` is at least `A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE` for code-changing work, or at least `A2_AGENT_MAY_DRAFT_ARTIFACTS` for documentation/artifact work
  - readiness assessment passes
  - executable surface/direct provider is available
  - validation steps or success criteria are present
- Rank by planning score, priority, goal planning priority, target date, and estimated effort.
- Surface the queue on `/app/tasks` or a small `/app/autonomous-queue` page.

Risks / duplication concerns:

- Do not fork planning scoring. Extract or reuse `buildBacklogItem` logic if possible.
- Keep launch gating in one place; queue eligibility should explain why a launch would pass, not bypass launch checks.

### 4. Planner Workflow

Current support: partial.

- `/app/planning` summarizes goals, scheduled/unscheduled tasks, workload/capacity, and backlog buckets.
- Goal planning updates create `Decision` records.
- `PlanningSession` captures a review window with linked goals/tasks/decisions.
- Task/goal writing assists exist.

Missing pieces:

- Structured planner output: better task specs, proposed next tasks, identified blockers, project status summary, and questions for the user.
- A clear planner mode that cannot mutate code and only creates/updates planning artifacts.
- Review step for accepting proposed tasks.

Reusable existing pieces:

- `PlanningSession`, `Decision`, task draft creation, task templates, writing assists, `/api/assistant/plan`.

Recommended implementation approach:

- Extend `PlanningSession` with optional fields:
  - `statusSummary: string`
  - `identifiedBlockers: string[]`
  - `proposedTaskIds: string[]`
  - `questionItems: string[]`
  - `plannerMode: 'manual' | 'agent_assisted'`
- Planner should create draft tasks with `status: 'in_draft'` and `autonomyLevel: 'A1_AGENT_MAY_ANALYZE_AND_PROPOSE'` until accepted.
- Add a "Capture planner recommendations" action to `/app/planning`.

Risks / duplication concerns:

- Avoid creating a separate "PlannerTask" model. Draft tasks plus planning-session links are enough for v0.

### 5. Executor Workflow

Current support: partial to strong.

- `launchTaskSession()` only launches `ready` tasks and prevents duplicate active runs.
- `buildTaskLaunchPlan()` assembles project context, role context, execution contract, skills, capabilities/tools, sandbox/model, self-improvement knowledge, compatible thread reuse, and workspace checks.
- `launchTaskFromPlan()` creates runs, starts/reuses agent threads, updates task state, and records prompt digest/model data.
- Execution surfaces support capacity, concurrency, skills/capabilities/tools, status, heartbeat, and task claiming/updating.

Missing pieces:

- Explicit bounded-work stopping conditions beyond the prompt and execution contract.
- Branch/worktree isolation preference for code changes.
- Enforcement of structured allowed actions policy.
- Validation command capture and result storage.
- Automatic launch from autonomous queue.

Reusable existing pieces:

- Task launch plan, project repo fields, sandbox fields, run model/usage telemetry, agent threads, execution surfaces.

Recommended implementation approach:

- Add `Project.defaultWorktreePolicy: 'none' | 'prefer_worktree' | 'require_worktree_for_code'`.
- Add only missing task fields such as `stoppingConditions`; reuse existing `validationSteps`, `allowedActionNames`, and `autonomyLevel`.
- Add run fields for `branchName`, `worktreePath`, `validationSummary`, and `validationStatus`.
- Keep actual launching through `launchTaskSession()` so all existing preflight remains enforced.

Risks / duplication concerns:

- Do not create a second executor queue runner that writes task/run state directly. It should call existing task launch/session APIs.

### 6. Reviewer Workflow

Current support: partial.

- `Review` and `Approval` records exist.
- `/app/governance` is already a queue for reviews, approvals, blocked work, dependency holds, and stale runs.
- Task governance panel shows open review, pending approval, decision history, child handoff state, dependencies, and review/approval actions.
- Runs have summaries, artifact paths, error summaries, model/usage/cost fields.

Missing pieces:

- Review item fields for validation results, artifacts/diffs, blockers, and follow-up tasks on the task/governance review surface.
- Direct diff/artifact integration in governance queue cards.
- Structured follow-up task creation from review.

Reusable existing pieces:

- `Review.status` already has `open`, `approved`, `changes_requested`, `dismissed`.
- `Run.artifactPaths`, `Task.attachments`, artifact APIs, `Decision`, child handoff actions, task decomposition.

Recommended implementation approach:

- Extend `Review` minimally:
  - `validationSummary: string`
  - `artifactPaths: string[]`
  - `diffSummary: string`
  - `blockers: string[]`
  - `followUpTaskIds: string[]`
- Add governance card links for run detail, artifact browser, and diff preview.
- Add "Create follow-up task" from review with parent/dependency prefilled.
- Do not add a primary run-detail form that asks the operator to paste managed Codex results. Managed run output should be captured by the launcher/runner/execution-surface update path, then shown as evidence while reviewing the task.

Risks / duplication concerns:

- Do not duplicate `Run.artifactPaths`; copy only review-relevant artifact references or derive them from the linked run when possible.
- Do not store final human decisions on `Run`. Human accept/reject/needs-revision decisions belong to `Review`, `Approval`, `Decision`, and the linked `Task` state.

## Recommended Data Model Changes

### Add to `Project`

Add fields to `Project` in `src/lib/types/control-plane.ts` and normalize them in `src/lib/server/control-plane.ts`:

- `projectBriefPath: string`
- `currentStateMemoPath: string`
- `agentInstructionsPath: string`
- `constraints: string`
- `nonGoals: string`
- `validationCommands: string[]`
- `defaultAutonomyPolicy: 'manual' | 'plan_only' | 'bounded_low_risk' | 'autonomous_low_risk'`
- `defaultWorktreePolicy: 'none' | 'prefer_worktree' | 'require_worktree_for_code'`

Migration considerations: because control-plane records store JSON payloads, this is a normalizer/default-field migration rather than a SQL schema migration. Add empty-string/empty-array/default enum fallbacks.

### Reuse Existing `Task` and `TaskTemplate` Readiness Fields

The following fields already exist on `Task` and `TaskTemplate` and should be reused rather than re-added:

- `scope: string`
- `nonGoals: string`
- `validationSteps: string`
- `readinessLevel: TaskReadinessLevel`
- `autonomyLevel: TaskAutonomyLevel`
- `allowedActionNames: string[]`
- `reviewRequirement: TaskReviewRequirement`
- `requiredPromptSkillNames: string[]`
- `requiredCapabilityNames: string[]`
- `requiredToolNames: string[]`

Add only small missing fields when needed:

- `stoppingConditions: string`
- `requiredContextItems: string[]`
- `assumptionPolicy: 'stop_and_ask' | 'state_assumptions_and_continue' | 'planner_only_until_clarified'`

Do not add `acceptanceCriteria` yet. Reuse `successCriteria` and consider a UI label change to "Acceptance criteria" after confirming naming.

### Add to `PlanningSession`

- `statusSummary: string`
- `identifiedBlockers: string[]`
- `proposedTaskIds: string[]`
- `questionItems: string[]`
- `plannerMode: 'manual' | 'agent_assisted'`

### Add to `Run`

- `branchName: string | null`
- `worktreePath: string | null`
- `validationStatus: 'not_run' | 'passed' | 'failed' | 'partial' | 'unknown'`
- `validationSummary: string`
- `stoppingReason: string`
- `promptSkillNamesUsed: string[]`
- `capabilityNamesMatched: string[]`
- `toolNamesMatched: string[]`
- `contextPackageDigest: string`
- `contextPackageSummary: string`

### Add to `Review`

- `validationSummary: string`
- `artifactPaths: string[]`
- `diffSummary: string`
- `blockers: string[]`
- `followUpTaskIds: string[]`

### New Helper Types, Not New Tables

Add only helper enum exports that do not already exist near existing enum options in `src/lib/types/control-plane.ts`:

- `PROJECT_AUTONOMY_POLICY_OPTIONS`
- `PROJECT_WORKTREE_POLICY_OPTIONS`
- `RUN_VALIDATION_STATUS_OPTIONS`
- `TASK_ASSUMPTION_POLICY_OPTIONS`

New tables are not justified for v0 because the current storage pattern is collection-record JSON and the target changes are small field extensions.

## Recommended UI/UX Changes

Smallest useful additions:

- Project detail: add "Project Memory" section with brief, state memo, AGENTS.md/instructions path, constraints, non-goals, validation commands, default autonomy policy, and worktree policy.
- Task create/detail forms: keep the existing readiness/autonomy fields visible enough for delegation decisions; add computed readiness reasons and any missing stopping/context/assumption fields.
- Task list: add badges for readiness, autonomy, and "agent-ready" eligibility. Add filter presets for "Agent-ready", "Needs spec", "Blocked/risky".
- Planning page: add an "Autonomous candidates" bucket derived from existing backlog data and readiness assessment.
- Governance page: add review cards with linked run, artifact paths, validation status, diff summary, blockers, and follow-up tasks.
- Run detail: show branch/worktree, validation status/summary, stopping reason, and linked review state.
- Task detail: make the latest run evidence visible inside the task review path so the operator can review the task without switching mental models.
- Task templates: keep existing readiness/autonomy fields aligned with task fields and add only missing context/stopping/assumption fields if adopted.

Avoid adding a large new dashboard until the agent-ready queue helper exists. A filtered task/planning view is enough for the first usable slice.

## Recommended Workflow Changes

### Planner

1. Load project memory, goals, active tasks, recent decisions, planning sessions, and current backlog.
2. Produce a project status summary, blockers, task-spec improvements, proposed draft tasks, and user questions.
3. Save output to `PlanningSession`; create proposed tasks as `in_draft`.
4. Do not launch agents or mutate code in planner mode.
5. User accepts task specs by moving readiness/autonomy fields to agent-ready values.

### Executor

1. Query autonomous queue candidates.
2. Select only tasks that pass readiness, low-risk, approval, dependency, execution-surface, validation, and workspace checks.
3. Build launch plan through existing `buildTaskLaunchPlan()`.
4. Prefer or require worktree/branch based on project/task policy.
5. Launch through existing `launchTaskSession()` / control-plane API.
6. Automatically record run summary, artifacts, validation, stopping reason, and blockers through the managed runner or execution-surface update path.
7. Move completed or blocked work into review/governance.

### Reviewer

1. Use `/app/governance` as the review queue.
2. Review the task, with the latest run summary, artifacts/diffs, validation status, blockers, and proposed follow-up tasks shown as evidence.
3. Accept, reject, or request revision through existing review/approval actions.
4. When requesting revision, create follow-up tasks or move the original task to blocked with a concrete reason.
5. Record final decision as a `Decision`.

## Implementation Plan

### Task 1: Add Project Memory Fields

- Objective: make durable project context first-class.
- Scope: extend `Project`, normalizers, project detail server action/UI, project API create/update payloads.
- Files likely affected: `src/lib/types/control-plane.ts`, `src/lib/server/control-plane.ts`, `src/routes/app/projects/[projectId]/+page.server.ts`, `src/routes/app/projects/[projectId]/+page.svelte`, `src/lib/server/agent-control-plane-api.ts`, project tests.
- Acceptance criteria: project memory fields persist, appear on project detail, can be set through UI and agent API, and default safely for legacy data.
- Risk level: low.
- Dependencies: none.

### Task 2: Wire Existing Readiness Fields Into Delegation Assessment

- Objective: make agent readiness relative to task clarity, skills, context, tools, validation, risk, and ambiguity.
- Scope: add a pure readiness/delegation assessment helper that consumes existing task readiness/autonomy fields, project context, role, provider, execution surface, and skill inventory.
- Files likely affected: new `src/lib/server/task-readiness.ts`, `src/lib/server/task-execution-preflight.ts`, `src/lib/server/execution-capability-catalog.ts`, task detail/planning display helpers, tests.
- Acceptance criteria: helper returns pass/warn/block status with dimension-specific reasons; it detects missing skills, missing context, insufficient tools/capabilities, weak validation, high risk, and autonomy/risk mismatches.
- Risk level: medium.
- Dependencies: Task 1 only if project defaults should prefill task autonomy.

### Task 3: Build Readiness Assessment and Autonomous Queue Helper

- Objective: compute which tasks are safe and ready for autonomous work.
- Scope: add queue helper that composes the readiness assessment, existing contract, dependency, governance, risk, execution preflight, and planning data.
- Files likely affected: new `src/lib/server/autonomous-queue.ts`, `src/lib/server/task-readiness.ts`, `src/lib/server/planning.ts`, tests.
- Acceptance criteria: helper returns ranked candidates and per-task rejection reasons; unit tests cover ready, blocked, high-risk, missing validation, pending approval, open review, dependency-held, and no-execution-surface cases.
- Risk level: medium.
- Dependencies: Task 2.

### Task 4: Surface Agent-Ready Queue in UI and API

- Objective: let the operator inspect safe ready tasks before automation.
- Scope: add task/planning filters or a small autonomous queue page; expose agent API/CLI list command if needed.
- Files likely affected: `/app/tasks` or `/app/planning` page files, `src/routes/api/agent-capabilities/+server.ts`, `src/lib/server/agent-capability-commands.js`, `scripts/ams-cli.mjs`, tests.
- Acceptance criteria: UI shows ranked candidates, badges, and reasons; API/CLI returns the same data; no launch automation yet.
- Risk level: medium.
- Dependencies: Task 3.

### Task 5: Capture Executor Run Context and Validation Results

- Objective: make run outcomes reviewable.
- Scope: extend automatic run capture; record branch/worktree policy inputs, validation status/summary, stopping reason, and blockers from the managed run path.
- Files likely affected: `src/lib/types/control-plane.ts`, `src/lib/server/control-plane.ts`, `src/lib/server/task-launch-planning.ts`, `src/lib/server/run-records.ts`, run detail page, execution-surface task update API, tests.
- Acceptance criteria: managed runs store validation/isolation metadata without manual paste/import, task review can display the evidence, run pages display diagnostics, and missing values default cleanly.
- Risk level: medium.
- Dependencies: Task 1 for project worktree policy.

### Task 6: Improve Review Records and Governance Queue

- Objective: make completed/blocked runs reviewable from the inbox.
- Scope: extend task/governance review; display validation/artifact/diff/blocker/follow-up fields from linked run/review records; add follow-up task prefill.
- Files likely affected: `src/lib/types/control-plane.ts`, `src/lib/server/control-plane.ts`, `src/lib/server/task-governance.ts`, `/app/governance`, `TaskGovernancePanel.svelte`, artifact/diff helpers, tests.
- Acceptance criteria: governance cards show linked run/artifacts/validation/diff/blockers; review actions still work; follow-up task creation is prefilled and linked.
- Risk level: medium.
- Dependencies: Task 5.

## Questions / Ambiguities

- Should `successCriteria` be renamed in the UI to "Acceptance criteria," or should a separate `acceptanceCriteria` field be added?
- Should project memory fields store paths only, inline markdown text only, or both?
- Are the existing `A0_HUMAN_ONLY` through `A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE` autonomy levels right for v0, or should the UI group them into simpler operator-facing labels?
- What exact action names belong in `allowedActionNames` for v0: filesystem edits, shell commands, package installs, network, GitHub, deployment, AMS mutation, cross-thread contact?
- Should low-risk autonomous execution require `riskLevel === 'low'`, or can medium-risk tasks run when `approvalMode` and validation are strong?
- Should worktree isolation be mandatory for all code edits or only for tasks above a risk/effort threshold?
- Should planner-generated questions be plain strings on `PlanningSession`, or should they become tasks/review items when unanswered?
- How much of the autonomous queue should be available through the CLI before adding UI launch automation?
