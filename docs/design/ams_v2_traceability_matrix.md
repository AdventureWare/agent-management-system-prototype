# AMS V2 Traceability Matrix

Date: 2026-07-09
Status: Traceability source-of-truth v0.1

Use this matrix before accepting an entity, relation, field, command, query, or
view. If a model element does not support a row here or an accepted extension
row, defer or reject it.

First-slice implementation rule:

- Persist only `Project`, `Goal`, `Task`, `Run`, `Artifact`, `Review`,
  `Decision`, `MemoryItem`, `Tool`, `ToolExecution`, `ModelProvider`, and
  `SourceReference`.
- Treat `ContextBundle`, external-AI dependency reporting, and next-work
  recommendation as computed/read-model outputs until a concrete workflow needs
  durable records.
- Keep `Plan`, `AgentProfile`, `WorkSession`, `Evaluation`, `Workflow`,
  `Skill`, `Capability`, `RoutingPolicy`, `ExternalAIDependency`, rich
  `EventLog`, and `Approval` out of first-slice persistence.

## Competency Questions

| Question | Required entity | Required relation | Required field | Required workflow/query | Does not require | Acceptance test |
| --- | --- | --- | --- | --- | --- | --- |
| What goals am I currently pursuing? | Goal, Project | Project contains Goal | Goal.status, Goal.title | show_active_goals | dashboard entity, goal score | Active goals query returns goals by status and project. |
| Which goals are active, paused, blocked, completed, or superseded? | Goal | none beyond project containment | Goal.status | show_goal_state | multiple status taxonomies | Goal status is one accepted lifecycle value. |
| What project contains this work? | Project, Task | Project contains Task | Task.projectId | show_tasks_for_goal, task detail | project_notes relation | Every task has one project. |
| What work is currently being done toward a goal? | Goal, Task, Run | Task advances Goal; Task starts Run | Task.status, Run.status | show_tasks_for_goal | workstream entity | Goal query lists tasks and active runs. |
| Why is this task worth doing? | Goal, Task, Decision | Task advances Goal; Decision selects Task/Plan | Task.summary, Task.goalId, Decision.summary | show_goal_state, task detail | task_motivation_paragraph | Non-exploratory task links to goal and has success criteria. |
| What goal does this task advance? | Goal, Task | Task advances Goal | Task.goalId | task detail | goal_alignment_score | Every active non-exploratory task links to at least one goal. |
| What work is blocked, and by what? | Task, EventLog | Task advances Goal | Task.status, Task.blockerSummary or blocker event | show_blocked_tasks | blocker dashboard entity | Blocked task exposes blocker and unblock condition. |
| What should be worked on next? | Goal, Task, Review, Approval, Decision | Task advances Goal; Task depends on Task | Task.status, dependency refs, review status | show_next_recommended_work | next_work_score field | Query returns candidate and reason from state. |
| What context does an AI agent need to work on this task? | Task, ContextBundle, Artifact, MemoryItem, Decision | ContextBundle includes source records | ContextBundle.includedSourceRefs | build_context_bundle, show_context_for_task | whole-project prompt dump | Context bundle lists sources and inclusion reasons. |
| Which run produced this artifact? | Run, Artifact | Run produces Artifact | Artifact.runId | show_artifacts_from_run | artifact_origin_note | Artifact links to producing run or imported source. |
| Which artifact supersedes another artifact? | Artifact | Artifact supersedes Artifact | relation record, Artifact.status | artifact detail/query | supersession prose only | Superseded artifact points to replacement or reason. |
| What decision caused this path to be chosen? | Decision, Plan, Task | Decision selects Plan/Task | Decision.summary, Decision.rationale | show_decisions_for_goal | routing_decision entity by default | Material path changes have decision or review evidence. |
| Did this task actually advance the goal? | Task, Evaluation, Review, Artifact | Evaluation targets Task/Artifact; Task advances Goal | Evaluation.criteria, Evaluation.result | record_evaluation | completion count metric | Done task has review/evaluation or explicit closeout evidence. |
| What external AI affordance did this task rely on? | Run, ModelProvider, ToolExecution, Evaluation | Run uses ModelProvider | Run.modelProviderId, ToolExecution.toolId | show_external_ai_dependencies | dependency_reduction_score | External provider/tool usage is recorded per run/tool event. |
| Can this repeated workflow become an owned/local workflow or skill? | Workflow, Skill, Task, ToolExecution | Skill abstracts Workflow; Workflow contains steps | Workflow.summary, Skill.usageCriteria | show_candidate_reusable_workflows | generic automation idea entity | Repeated pattern has evidence from at least two tasks/runs or an explicit decision. |
| What information is canonical, unverified, stale, superseded, or deprecated? | MemoryItem, Artifact, Decision, EventLog | MemoryItem sourced from evidence | MemoryItem.status, Artifact.status | show_memory_for_context | trusted_chat_memory | Retrieved memory includes status and source refs. |
| Which model/provider/tool was used, and why? | ModelProvider, Run, Tool, ToolExecution, Decision | Run uses ModelProvider; ToolExecution uses Tool | provider/tool IDs, decision rationale | run detail, show_external_ai_dependencies | provider preference score | Run/tool logs identify backend/tool and rationale when selected deliberately. |
| What evidence supports a memory item? | MemoryItem, Artifact, Decision, Evaluation | MemoryItem sourced from evidence | MemoryItem.sourceRefs | show_memory_for_context | memory_confidence_vibes | Trusted memory item has reviewed source evidence. |
| What outputs are awaiting review? | Artifact, Review, Task | Artifact reviewed by Review | Artifact.status, Review.status | show_unreviewed_outputs | review inbox entity | Submitted artifacts without approved review are queryable. |
| What must happen before this task can run safely? | Task, Approval, Tool, AgentProfile | Task depends on Task; Task assigned to AgentProfile | risk/review/approval fields, dependency refs | show_next_recommended_work | safety paragraph | Task read model lists unmet dependencies/gates. |

## Core Scenarios

| Scenario | Required entity | Required relation | Required field | Required workflow | Does not require | Acceptance test |
| --- | --- | --- | --- | --- | --- | --- |
| Operator creates a high-level goal. | Project, Goal | Project contains Goal | Goal.title, Goal.summary, Goal.successCriteria, Goal.status | create_goal, clarify_goal | milestone entity | Draft goal can become active only with success criteria or clarification task. |
| Goal is decomposed into sub-goals or tasks. | Goal, Plan, Task | Goal has parent Goal; Plan proposes Task; Task advances Goal | parentGoalId, Task.goalId | decompose_goal, create_plan, create_task | deep tree requirement | Decomposition can create graph-like goals/tasks without losing goal relation. |
| Task is selected and assigned to an executor. | Task, AgentProfile, ModelProvider | Task assigned to AgentProfile | Task.status, AgentProfile.executorType | assign_task, show_next_recommended_work | agent persona entity | Ready task has executor profile and gates resolved. |
| System creates a context bundle for the run. | ContextBundle, Task, Artifact, MemoryItem, Decision | ContextBundle includes source records | includedSourceRefs | build_context_bundle | whole-project prompt | Context bundle contains only source-linked selected context. |
| Run produces an artifact. | Run, Artifact, ToolExecution | Run produces Artifact; ToolExecution may produce Artifact | Artifact.uri, Artifact.role, Run.status | start_run, attach_artifact | artifact folder scan as truth | Artifact links to run or import source. |
| Artifact is reviewed/evaluated. | Artifact, Review, Evaluation | Review targets Artifact; Evaluation targets Artifact/Task | Review.status, Evaluation.criteria/result | review_artifact, record_evaluation | review score without decision | Review/evaluation changes artifact/task acceptance path. |
| Accepted artifact updates memory/project state. | Artifact, MemoryItem, Decision | MemoryItem sourced from Artifact; Decision records promotion | MemoryItem.status, sourceRefs | promote_memory, record_decision | automatic memory publication | Memory promotion requires reviewed artifact and decision/review evidence. |
| Repeated workflow becomes candidate reusable skill/workflow. | Workflow, Skill, Decision, Run | Skill abstracts Workflow; Decision selects Skill/Workflow | Skill.usageCriteria, Workflow.steps | identify_reusable_workflow | automation dashboard | Candidate workflow cites repeated runs/tasks or explicit operator decision. |

## Command/Query Justification

| Command/query | Required model support | Acceptance test |
| --- | --- | --- |
| create_goal | Project, Goal | Creates draft goal with project link. |
| clarify_goal | Goal, Decision/EventLog | Updates goal clarity with event/decision evidence. |
| decompose_goal | Goal, Plan, Task | Creates plan/tasks/subgoals linked to parent goal. |
| create_task | Project, Goal, Task | Task cannot be active without project and goal unless explicitly exploratory. |
| clarify_task | Task | Adds missing scope/success/validation without creating new entity. |
| assign_task | Task, AgentProfile | Records executor profile, not model provider as agent. |
| build_context_bundle | ContextBundle plus included records | Produces source-linked context list. |
| start_run | Task, Run, WorkSession | Starts run only when task gates permit. |
| record_tool_execution | Tool, ToolExecution, Run | Logs meaningful tool event with status/result. |
| attach_artifact | Artifact, Run/Task | Registers durable artifact with role and source. |
| review_artifact | Review, Artifact | Review status affects acceptance. |
| record_evaluation | Evaluation | Evaluation cites criteria/evidence. |
| accept_task_output | Task, Review/Evaluation | Task can close only with review/evidence or explicit bypass decision. |
| reject_task_output | Task, Review | Records rejection reason and next work. |
| mark_blocked | Task, EventLog | Blocker is queryable with unblock condition. |
| create_followup_task | Task, Goal, Decision/EventLog | Follow-up links to same or explicit goal. |
| record_decision | Decision | Decision links to affected records. |
| promote_memory | MemoryItem, Artifact/Decision | Trusted memory requires source evidence. |
| deprecate_memory | MemoryItem | Deprecated memory is excluded from trusted context. |
| show_active_goals | Goal | Lists active goals by project. |
| show_tasks_for_goal | Goal, Task | Lists linked tasks by state. |
| show_context_for_task | ContextBundle | Shows context sources and inclusion reasons. |
| show_external_ai_dependencies | Run, ModelProvider, ToolExecution, Evaluation | Shows external usage and evidence; no unsupported retirement claims. |

## Field Admission Examples

Accepted field:

- `Task.goalId`
- Question: what goal does this task advance?
- Workflow: create task, select next work, evaluate goal progress
- Writer: operator/importer/agent draft after review
- Reader: next-work query, task detail, evaluation
- Missing consequence: work cannot be prioritized against goals

Rejected field:

- `Task.goalAlignmentScore`
- Weakness: derived/speculative metric; no direct decision needs it
- Better model: explicit `Task advances Goal` relation plus review/evaluation

Deferred field:

- `ModelProvider.averageLatency`
- Weakness: useful later for routing, but first slice can record run timestamps
- Better model now: compute from run evidence when routing needs it

Rejected field:

- `MemoryItem.aiConfidence`
- Weakness: AI self-confidence is not trust
- Better model: source evidence, review status, evaluation result
