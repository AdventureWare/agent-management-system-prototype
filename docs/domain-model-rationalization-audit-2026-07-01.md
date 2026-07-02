# AMS Domain Model Rationalization Audit

Date: 2026-07-01
Status: Draft audit for review
Task: `task_424b6a8d-d6f4-4edf-af8b-e406646428f6`

## Scope

This is a read-only rationalization audit of the current AMS architecture, entities, relationships, statuses, enums, and model-adjacent concepts. It does not propose direct schema edits. Model changes called out here should go through `docs/domain-model-governance-protocol-v0.1.md` and, where needed, a model change proposal.

Primary sources inspected:

- `src/lib/types/control-plane.ts`
- `src/lib/types/agent-thread.ts`
- `src/lib/types/self-improvement.ts`
- `src/lib/types/task-work-item.ts`
- `src/lib/server/control-plane.ts`
- `src/lib/server/db/control-plane-store.ts`
- `src/lib/server/db/agent-threads-store.ts`
- `src/lib/server/db/self-improvement-store-db.ts`
- `src/lib/server/intent-interpretation.ts`
- `src/lib/server/agent-run-results.ts`
- `src/lib/server/goal-work-loop.ts`
- `src/routes/app/**`
- `src/routes/api/**`
- `docs/ontology-v1.md`
- `docs/functional-alignment-audit.md`
- `docs/autonomous-progress-loop-v0-audit.md`
- `docs/autonomous-goal-directed-work-loop-v0.md`
- `docs/agent-facing-ams-interface-v0.md`

## Executive Summary

AMS is not chaotic because it lacks model structure. It is messy because several different model layers are doing useful work without being clearly labeled:

- accepted control-plane records
- adjacent execution/thread records
- self-improvement suggestion records
- derived UI/view models
- read-only interpretation/proposal objects
- prompt/work-packet structures
- prose project memory and docs

The core control-plane model is mostly rational: `Project`, `Goal`, `Task`, `Run`, `Review`, `Approval`, `Decision`, `Workflow`, `TaskTemplate`, `Role`, `Provider`, and `ExecutionSurface` are defensible. The biggest cleanup opportunity is not replacing those records. It is defining boundaries, reducing duplicated lifecycle/status meanings, and deciding which candidate concepts deserve to become accepted model constructs.

The highest-risk drift areas are:

1. `Task` absorbing too many different responsibilities without explicit task-kind or rationale structure.
2. `Run`, `AgentRun`, and `Thread` overlap across control-plane and agent-thread stores.
3. `Decision` exists in both control-plane and self-improvement with different meanings.
4. Skills, capabilities, tools, roles, providers, and execution surfaces are useful but semantically blended.
5. Artifacts, attachments, context resources, and work packets are under-modeled and represented inconsistently.
6. Status enums are proliferating, and some statuses encode workflow behavior while others encode display/filter state.
7. Intent interpretation now exists as a read-only proposal object but is not yet positioned in the accepted domain model.

## Architecture Zones

| Zone | Main files | Current role | Model status |
| --- | --- | --- | --- |
| Control plane | `src/lib/types/control-plane.ts`, `src/lib/server/control-plane.ts`, `control_plane_records` | Durable project/goal/task/run/governance/workflow/routing state | Accepted core |
| Agent threads | `src/lib/types/agent-thread.ts`, `agent_thread_records`, `src/lib/server/agent-threads.ts` | Managed thread context, thread-level runs, contacts, resumability | Adjacent execution context |
| Self-improvement | `src/lib/types/self-improvement.ts`, `self_improvement_entries` | Suggestions, signals, knowledge items, impressions, suggestion decisions | Adjacent improvement context |
| Derived work views | `src/lib/types/task-work-item.ts`, queue/planning/task pages | UI and recommendation-ready projections over core records | Derived, not core |
| Agent-facing proposals | `src/lib/server/intent-interpretation.ts`, run-result previews, goal-loop recommendations | Read-only proposals, classification, previews, work packets | Proposal layer |
| Docs and skills | `AGENTS.md`, `.agents/skills/*`, `docs/*` | Durable instructions, glossary, protocols, ontology, decisions | Governance/context layer |

## Accepted Core Records

These should remain accepted model concepts unless a later model proposal proves otherwise:

| Construct | Current definition | Keep? | Rationalization note |
| --- | --- | --- | --- |
| `Project` | Durable context container for goals, tasks, repo roots, memory, constraints, defaults, skills, and non-goals. | Keep | Good boundary. Needs clearer split between project memory prose and structured decisions/proposals. |
| `Goal` | Desired future state/outcome, with hierarchy and project/task links. | Keep | Good anchor for continuation. Do not add a separate milestone abstraction. |
| `Task` | Bounded unit of work with execution contract, routing, readiness, review, dependencies, attachments, and closeout. | Keep, clarify | Too much meaning is stored in prose. Needs rationale/uncertainty/work-kind strategy before adding fields. |
| `Run` | Control-plane execution attempt/evidence record linked to a task. | Keep | Should be explicitly documented as the control-plane subtype of conceptual `WorkAttempt`. |
| `Review` | Work evaluation gate after evidence exists. | Keep | Needs richer review findings later, but do not duplicate. |
| `Approval` | Permission gate before risky/blocked action. | Keep | Boundary from review is good and should stay explicit. |
| `Decision` | Durable planning/governance/work-direction decision linked to task/goal/run/review/approval/session. | Keep, clarify | Needs stronger guidance for model decisions vs operational decisions vs self-improvement decisions. |
| `PlanningSession` | Planning process/window over goals/tasks/decisions. | Keep, clarify | Correctly not a primary work object. Needs relationship to intent interpretation/proposals clarified. |
| `Workflow` | Reusable work pattern. | Keep | Good. Keep separate from task instance and planning session. |
| `WorkflowStep` | Step inside a workflow with role and dependencies. | Keep | Could later inherit skill/capability requirements, but no immediate model change. |
| `TaskTemplate` | Reusable task shape carrying execution contract/routing fields. | Keep | Good canonicalization surface for repeatable tasks. |
| `Role` | Desired perspective/responsibility with prompts/checklists/skills/tools. | Keep, clarify | Blends role, persona, and capability hints. Needs boundary from `Skill` and `Capability`. |
| `Provider` | Infrastructure/service metadata for execution. | Keep | Good boundary. Should not become "agent." |
| `ExecutionSurface` | Runnable surface where work can execute. | Keep | Good current representation for assistant-created "agents." Boundary from provider/role/thread should be preserved. |

## Adjacent Records That Need Boundary Labels

| Construct | Current location | Risk | Recommended treatment |
| --- | --- | --- | --- |
| `AgentThread` | `src/lib/types/agent-thread.ts` | Can be confused with task, run, or worker. | Define as reusable AI context container. Never task completion surface. |
| `AgentRun` | `src/lib/types/agent-thread.ts` | Name overlaps with control-plane `Run`; stores runner/process/log artifacts, not reviewed task evidence. | Rename only if justified later; document as thread-run/process record distinct from control-plane `Run`. |
| `AgentThreadContact` | `src/lib/types/agent-thread.ts` | Could become a parallel task/approval system if overused. | Keep as coordination message, not work ownership or governance. |
| `SelfImprovementOpportunity` | `src/lib/types/self-improvement.ts` | Can duplicate tasks or planning recommendations. | Keep as suggestion/proposal, not accepted work until it creates or links a task. |
| `SelfImprovementKnowledgeItem` | `src/lib/types/self-improvement.ts` | Can duplicate docs/skills/project memory. | Treat as reusable lesson/procedure candidate; promote to docs/skill only through review. |
| `SelfImprovementSuggestionDecision` | `src/lib/types/self-improvement.ts` | Name overlaps with control-plane `Decision`. | Keep local to suggestion lifecycle; significant accepted changes should also create/control-plane `Decision` or model decision record. |
| `TaskWorkItem` | `src/lib/types/task-work-item.ts` | Sounds like a domain entity. | Document as derived UI/view model over `Task`, not core entity. |
| `IntentInterpretationProposal` | `src/lib/server/intent-interpretation.ts` | Could become hidden planning state or duplicate task/decision/blocker systems. | Keep read-only proposal until model proposal decides persistence. |

## Status And Enum Rationalization

The system has many status-like fields. That is not automatically wrong, but each status should belong to a bounded context and change behavior.

| Enum | Context | Current assessment |
| --- | --- | --- |
| `TaskStatus` | Work execution lifecycle | Necessary. Good behavior impact. |
| `RunStatus` | Control-plane execution evidence | Necessary. Good behavior impact. |
| `AgentRunStatus` | Thread process lifecycle | Necessary but overlaps name with `RunStatus`; document boundary. |
| `AgentThreadState` | Thread availability/contact state | Necessary derived/operational state. Not task status. |
| `ReviewStatus` | Work review gate | Necessary. |
| `ApprovalStatus` | Permission gate | Necessary. |
| `TaskCloseoutState` | Post-review task closeout outcome | Useful but overlaps with review decision and task status; clarify when it is set and what reads it. |
| `GoalStatus` | Goal lifecycle | Necessary but small; avoid adding statuses unless goal-loop behavior changes. |
| `WorkflowStatus` | Reusable workflow lifecycle | Necessary but possibly too close to task statuses; document context. |
| `CatalogLifecycleStatus` | Role/template catalog lifecycle | Necessary for reusable catalog items; not execution status. |
| `ProjectSkillAvailability` | Project skill policy | Useful policy enum. |
| `SelfImprovementStatus` | Suggestion lifecycle | Necessary inside self-improvement context; not task/review status. |
| `SelfImprovementKnowledgeStatus` | Knowledge item lifecycle | Reasonable, but should not duplicate docs publication unless intentionally separate. |
| `SelfImprovementDecisionType` | Suggestion decision event | Local event type, not control-plane decision type. |
| `DecisionType` | Control-plane decision event | Too narrow today; may need expansion through proposals, especially for model-governance decisions. |

Recommendation: add a "status owner and behavior" table to `docs/domain-glossary.md` or a future `docs/status-model.md`. Do not add new statuses unless they affect allowed behavior, filtering, sequencing, validation, UI state, or review.

## Main Overlaps And Conflicts

### 1. Task vs Work Item vs Action

Current state:

- Implementation uses `Task`.
- Docs sometimes use "work item" generically.
- `TaskWorkItem` is a derived UI model.

Rationalization:

- Keep `Task` as the accepted implementation record.
- Use "work item" only as generic prose unless a model proposal accepts it.
- Rename `TaskWorkItem` only if worthwhile later; for now document it as a view model.

Recommendation: add glossary entry for `TaskWorkItem` as derived view model.

### 2. Run vs AgentRun vs Thread

Current state:

- `Run` is task-linked control-plane evidence.
- `AgentRun` is thread/process/log execution in the agent-thread store.
- `AgentThread` is reusable context.

Rationalization:

- `Run` answers "what happened for this task?"
- `AgentRun` answers "what process/message happened in this thread?"
- `AgentThread` answers "which AI context can be reused or contacted?"

Recommendation: create a model decision or glossary section clarifying this boundary before adding any `WorkAttempt` implementation.

### 3. Review vs Approval vs Decision vs Closeout

Current state:

- `Review` evaluates submitted work.
- `Approval` grants permission for risky action.
- `Decision` records durable choices.
- `TaskCloseoutState` records accepted/needs-revision/rejected/blocked/deferred closeout.

Rationalization:

- Keep review and approval separate.
- Do not store final human acceptance only on `Run`.
- Use `Decision` for durable rationale when the review/approval changes direction.
- Clarify whether `TaskCloseoutState` is derived from review/approval or an additional closeout event.

Recommendation: model proposal for "task closeout semantics" before adding more closeout fields.

### 4. Project Memory vs Decision Log vs Current State Memo

Current state:

- `Project.currentStateMemo` and `Project.decisionLog` are prose fields.
- `Decision` is structured but not always project-filtered directly.
- Run-result progress previews can propose memory/decision updates.

Rationalization:

- Keep prose fields for low-friction operator context.
- Use `Decision` for durable choices.
- Guard project memory updates behind preview/review/apply flow.

Recommendation: next implementation slice should be reviewed apply/update for selected progress-preview proposals, not a new memory entity.

### 5. Role vs Skill vs Capability vs Tool vs Provider vs ExecutionSurface

Current state:

- `Role` describes working perspective and prompt/checklist/policy.
- Prompt skills are discovered from `.agents/skills` and project/global skill roots.
- Required prompt skills, capability names, and tool names are string arrays on tasks/templates.
- `Provider` describes service/infrastructure.
- `ExecutionSurface` describes runnable surface/capacity/status/model/sandbox.

Rationalization:

- Role is "what perspective/responsibility should do the work."
- Skill is "what reusable instruction or know-how is needed."
- Capability is "what ability is required/provided."
- Tool is "what callable or external tool is needed."
- Provider is "what backs the runtime."
- ExecutionSurface is "where the work can run."

Recommendation: create a small model proposal for `Capability` and `Tool` representation before making either first-class. Until then, keep string requirements and catalog helpers.

### 6. Artifact vs Attachment vs ContextResource vs WorkPacket

Current state:

- `Task.attachments` store copied file attachments.
- `Run.artifactPaths` store paths.
- Artifact API routes inspect/open/preview files.
- Work packets assemble context but are not durable artifact/context records.
- Ontology names `Artifact` and `ContextResource` as under-modeled.

Rationalization:

- Attachment is a task-linked file reference/copy.
- Artifact is broader output information produced by work.
- ContextResource is input information needed for work.
- WorkPacket is generated context packaging for an agent.

Recommendation: do not add `Artifact` or `ContextResource` records until a proposal defines identity, lifecycle, storage, and relationship to attachments/run artifact paths.

### 7. Intent Interpretation vs PlanningSession vs Task Proposal

Current state:

- `IntentInterpretationProposal` exists as a read-only helper with assumptions, constraints, uncertainties, candidate goals/tasks/decisions/blockers, routing, and safety.
- `PlanningSession` is a durable planning process/window.
- Task creation and decomposition create actual work.

Rationalization:

- Intent interpretation is a proposal/explanation, not accepted state.
- Planning session is a process/event.
- Task is accepted work.

Recommendation: next proposal should decide whether interpretation proposals remain transient, become attached artifacts, or become a new persisted proposal record. Do not silently add a persisted `IntentInterpretation` entity.

### 8. Self-Improvement vs Task/Workflow/Skill/Knowledge

Current state:

- Self-improvement can produce opportunities, suggested tasks, knowledge items, decisions, impressions, and feedback signals.
- It overlaps with tasks, knowledge docs, skills, and decisions.

Rationalization:

- Self-improvement records should stay proposal/evaluation context.
- Accepted improvement work should become ordinary `Task`, docs, skills, workflow/template updates, or decisions.

Recommendation: create guidance that self-improvement suggestion decisions are local suggestion-lifecycle records, not replacements for control-plane `Decision`.

## Bounded Context Map

| Context | Owned concepts | Boundary warning |
| --- | --- | --- |
| Project and memory | `Project`, project defaults, constraints, current-state memo, decision log, skill availability | Do not turn every project note into schema. |
| Goal and planning | `Goal`, `PlanningSession`, goal-loop classification, success criteria, progress previews | Do not add milestone or parallel planning systems. |
| Work execution | `Task`, dependencies, readiness, autonomy, risk, runs, launch/preflight | Do not make task status carry review/approval/run/thread state. |
| Governance | `Review`, `Approval`, `Decision`, closeout state | Do not use runs as final human decision surface. |
| Routing and capability | `Role`, `Provider`, `ExecutionSurface`, skills, capability/tool requirement strings | Do not collapse role, skill, capability, tool, provider, and execution surface. |
| Thread coordination | `AgentThread`, `AgentRun`, `AgentThreadContact` | Do not make thread/contact a second task system. |
| Improvement loop | self-improvement opportunities/signals/knowledge/decisions | Do not let suggestions mutate core rules without review. |
| Artifacts and context | task attachments, run artifact paths, artifact API, work packets | Do not add artifact/context records without identity and lifecycle. |

## Rationalization Backlog

### Immediate Documentation Clarifications

1. Add glossary entries for `TaskWorkItem`, `AgentRun`, `AgentThreadContact`, `IntentInterpretationProposal`, and `SelfImprovementOpportunity`.
2. Add a status-owner table for every status enum and the behavior it controls.
3. Add a decision record clarifying `Run` vs `AgentRun` vs `AgentThread`.
4. Add a decision record clarifying `Review` vs `Approval` vs `Decision` vs `TaskCloseoutState`.
5. Update `docs/domain-model.md` to name the three storage zones: control-plane, agent-thread, and self-improvement.

### Model Change Proposals To Create

1. `Task rationale and uncertainty representation`
   - Problem: tasks do not consistently encode why work exists, what uncertainty it reduces, or what decision it supports.
   - Default: propose minimal representation first; do not add a broad planning entity.

2. `Capability and Tool representation`
   - Problem: roles/providers/surfaces/tasks use skill/capability/tool strings with useful but fuzzy semantics.
   - Default: keep strings until a proposal justifies first-class catalog records.

3. `Artifact and ContextResource identity`
   - Problem: attachments, run artifact paths, artifact routes, and work packets overlap.
   - Default: define identity/lifecycle before adding records.

4. `Intent interpretation persistence`
   - Problem: read-only interpretation proposals are useful but not durable.
   - Default: consider attached proposal artifacts or decision-linked records before adding a new entity.

5. `Task closeout semantics`
   - Problem: closeout fields may duplicate review/approval/decision states.
   - Default: define exactly when closeout is recorded and what reads it.

### Implementation Cleanup Candidates After Proposals

1. Add a shared status semantics reference used by docs and tests.
2. Add tests that assert no new task/goal/run/review/approval/workflow/planning duplicate concepts appear in generated follow-up tasks.
3. Add model-governance checks to PR/review templates or task launch prompts.
4. Add a project/goal-scoped decision view rather than expanding project `decisionLog` prose.
5. Add a reviewed apply/update operation for progress-preview proposals before adding more project memory fields.

## Recommended Next Move

Do not start by renaming entities or adding fields. Start with the highest-leverage boundary clarifications:

1. Update the glossary/source map with adjacent and derived concepts.
2. Create model decision records for the two most confusing boundaries:
   - `Run` vs `AgentRun` vs `AgentThread`
   - `Review` vs `Approval` vs `Decision` vs `TaskCloseoutState`
3. Then create one model change proposal for `Task rationale and uncertainty representation`.

That sequence turns the mess into reviewable decisions without freezing the system or creating another architecture layer.

