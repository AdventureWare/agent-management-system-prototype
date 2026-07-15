# AMS V2 Domain Ontology And Behavior Spec

Date: 2026-07-09
Status: Canonical v2 design source-of-truth v0.1

## 1. Purpose

AMS v2 is a goal-directed work coordination system. It exists to help the
operator move from desired future states to reviewed outcomes with less drift,
less duplicated work, less lost context, and less useless AI-generated bloat.

This document is the canonical v2 ontology and behavior source-of-truth. It
controls which entities, fields, relations, states, commands, queries, views,
and artifacts are allowed into v2 design.

Every model element must support at least one real question, decision, behavior,
verification need, context-building need, audit need, or user-facing workflow.

## Existing Design Sources Inspected

The best prior source documents were:

- `docs/prototype_audit_v0_1.md`
- `docs/v2_rebuild_or_refactor_decision_v0_1.md`
- `docs/v2_requirements_v0_1.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_architecture_v0_1.md`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `docs/v2_build_blueprint_v0_1.md`
- `docs/v1_to_v2_migration_plan_v0_1.md`
- `docs/v2_schema_contract_v0_1.md`
- `docs/v2_preview_concept_graduation_review_v0_1.md`
- `docs/domain-glossary.md`
- `docs/domain-model.md`
- `docs/ontology-v1.md`
- `docs/model-decisions/`
- `docs/model-change-proposals/`

No single existing doc satisfied the source-of-truth need. The closest
candidate was `docs/v2_build_blueprint_v0_1.md`, but it is a build-orientation
plan, not a domain ontology and behavior specification.

This document supersedes scattered v2 domain summaries when deciding whether a
new model element belongs in v2. The older documents remain evidence and
background.

## 2. Non-Goals

V2 is not:

- a generic project management clone
- a dashboard collection
- a metrics warehouse
- a chat transcript organizer
- a prompt stuffing framework
- an automatic agent scheduler
- a model-provider wrapper with task fields attached
- a copy of v1 with cleaner file names
- a place to store every plausible AI-suggested concept

The first v2 implementation must not attempt:

- full v1 UI parity
- bulk v1 migration
- production autonomous launch
- automatic review/approval
- automatic memory publication
- local-model replacement claims without evaluation evidence

## 3. Core Operating Thesis

Work is a state-transition attempt.

AMS v2 coordinates desired future states, executable attempts to reach them,
the context given to executors, evidence produced by execution, review of that
evidence, and updates to durable project state.

The center is not the agent. The center is the goal-directed work loop.

## 4. Scope Boundaries

In scope for the v2 core:

- goals as desired future states or state-regions
- bounded projects as work containers
- plans and tasks as proposed and executable paths
- agent/human/tool/model distinctions
- run/session/thread execution evidence
- context bundles for bounded runs
- artifacts, decisions, reviews, evaluations, and memory promotion
- tool execution logs
- source-linked retrieval
- external-AI dependency evidence

Out of scope for the v2 core until proven:

- generic dashboards
- organization-wide portfolio management
- full event sourcing
- multi-user enterprise roles
- arbitrary workflow automation
- automatic provider retirement
- deep hierarchy as the only structure
- social/collaboration features not needed for the core loop

## 5. Competency Questions

The model must answer these questions from durable state or computed read
models:

1. What goals am I currently pursuing?
2. Which goals are active, paused, blocked, completed, or superseded?
3. What project contains this work?
4. What work is currently being done toward a goal?
5. Why is this task worth doing?
6. What goal does this task advance?
7. What work is blocked, and by what?
8. What should be worked on next?
9. What context does an AI agent need to work on this task?
10. Which run produced this artifact?
11. Which artifact supersedes another artifact?
12. What decision caused this path to be chosen?
13. Did this task actually advance the goal?
14. What external AI affordance did this task rely on?
15. Can this repeated workflow become an owned/local workflow or skill?
16. What information is canonical, unverified, stale, superseded, or deprecated?
17. Which model/provider/tool was used, and why?
18. What evidence supports a memory item?
19. What outputs are awaiting review?
20. What must happen before this task can run safely?

## 6. Core Scenarios

Only these scenarios are required for the first v2 design baseline:

1. Operator creates a high-level goal.
2. Goal is decomposed into sub-goals or tasks.
3. Task is selected and assigned to an AI, human, or tool executor.
4. System creates a context bundle for the run.
5. Run produces an artifact.
6. Artifact is reviewed/evaluated.
7. Accepted artifact updates memory or project state.
8. Repeated workflow is identified as a candidate reusable skill or workflow.

Do not add entities for scenarios outside this list unless the scenario is
first accepted into this section.

## 7. Core Loop

The core loop is:

```text
goal captured
-> goal clarified
-> work decomposed
-> task selected
-> context bundle built
-> run executed
-> artifact produced
-> artifact reviewed
-> state/memory updated
-> next work selected
```

Every workflow must either support this loop or be explicitly marked deferred.

## 8. Accepted Entities

Accepted means the concept is allowed in the v2 domain model. It does not mean
every field, table, UI, or automation is accepted.

First-slice persistence is narrower than accepted vocabulary:

- Persist in the first v2 core slice: `Project`, `Goal`, `Task`,
  `TaskDependency`, `Run`, `Artifact`, `Review`, `Decision`, `MemoryItem`,
  `Tool`, `ToolExecution`, `ModelProvider`, minimal `EvaluationScenario`,
  minimal `EvaluationResult`, and `SourceReference`.
- Keep as read models first: `ContextBundle`, `AgentWorkPacket`,
  operator console, external-AI dependency reporting,
  external-AI dependency-reduction reporting, and next-work recommendation.
- Defer from first-slice persistence: `Plan`, `AgentProfile`, `WorkSession`,
  full `Evaluation` workflow, `Workflow`, `Skill`, `Capability`,
  `RoutingPolicy`, persisted `ExternalAIDependency`, rich `EventLog`,
  `Approval`, model registry, and execution surfaces.

Current clean-boundary correction:

`docs/design/ams_v2_clean_boundary_and_execution_plan.md` narrows the first
independent-repository foundation further to `Project`, `Goal`, `Task`,
`TaskDependency`, `Run`, `Artifact`, optional `Review`, material `Decision`, and
`SourceReference`. Existing v2 records and tables for other accepted concepts
must be preserved through versioned export or staging, but they are not required
to drive the first independent work loop or primary UI. This is a scope cut, not
data deletion or automatic rejection of the wider accepted vocabulary.

The executable first-slice guard starts in
`src/lib/server/v2-core-contract.ts` and
`src/lib/server/v2-core-persistence.ts`. Existing `v2-preview` tables remain
evidence and prototype code; they are not automatically the v2 core schema.

- `Project`
- `Goal`
- `Plan`
- `Task`
- `AgentProfile`
- `ModelProvider`
- `WorkSession`
- `Run`
- `ContextBundle`
- `Artifact`
- `Decision`
- `Review`
- `Evaluation`
- `MemoryItem`
- `Tool`
- `ToolExecution`
- `Workflow`
- `Skill`
- `EventLog`

Accepted because each supports the core loop or an audit/evidence need. Entity
details live in `docs/design/ams_v2_entity_cards.md`.

## 9. Candidate / Deferred / Rejected Entities

Candidate:

- `Capability`: likely needed for matching work to agents/tools/models, but the
  taxonomy must stay small.
- `RoutingPolicy`: may be needed after repeated routing decisions prove reuse.
- `ExternalAIDependency`: may be a read model or evidence summary rather than a
  standalone entity.

Deferred:

- `Milestone`: use `Goal` unless a separate identity and workflow are proven.
- `Dashboard`: view, not entity.
- `Metric`: computed view unless a decision uses it.
- `Timeline`: read model over `EventLog`, not entity.
- `KnowledgeGraph`: storage/view strategy, not first-slice entity.

Rejected for v2 core:

- `GoalAlignmentScore`: weak metric; use explicit goal relation and review.
- `TaskMotivationParagraph`: prose bloat; use task summary and goal relation.
- `AIThought`: not a durable work record.
- `PromptTemplateEntity`: use `Skill`, `Workflow`, or `ContextBundle` rules.
- `ManagerReport`: view/report only.

## 10. Core Relations

Required relations:

- `Project contains Goal`
- `Project contains Task`
- `Goal has parent Goal`
- `Goal decomposes into Plan`
- `Plan proposes Task`
- `Task advances Goal`
- `Task depends on Task`
- `Task assigned to AgentProfile`
- `AgentProfile may use ModelProvider`
- `Task starts Run`
- `Run occurs in WorkSession`
- `Run uses ContextBundle`
- `ContextBundle includes Artifact | MemoryItem | Decision | Task | Goal`
- `Run produces Artifact`
- `Artifact derived from Artifact`
- `Artifact supersedes Artifact`
- `Artifact reviewed by Review`
- `Review produces Evaluation`
- `Evaluation informs Decision`
- `Decision selects Plan | Task | Artifact | MemoryItem | Workflow`
- `Accepted Artifact may source MemoryItem`
- `ToolExecution occurs during Run`
- `ToolExecution uses Tool`
- `Workflow contains ordered or conditional Task/Skill steps`
- `Skill abstracts repeated Workflow or procedure`
- `EventLog records significant entity changes`

Avoid generic `relatedTo`. Add a specific relation or do not model it.

## 11. State Machines / Lifecycle States

### Goal

- `draft`
- `active`
- `blocked`
- `paused`
- `completed`
- `superseded`
- `canceled`

### Task

- `draft`
- `ready`
- `in_progress`
- `blocked`
- `review`
- `done`
- `canceled`
- `superseded`

### Run

- `planned`
- `running`
- `completed`
- `failed`
- `canceled`

### Artifact

- `draft`
- `submitted`
- `accepted`
- `rejected`
- `superseded`
- `deprecated`

### MemoryItem

- `proposed`
- `verified`
- `trusted`
- `stale`
- `superseded`
- `deprecated`
- `rejected`

### Review

- `open`
- `approved`
- `changes_requested`
- `rejected`
- `canceled`

### Evaluation

- `planned`
- `recorded`
- `passed`
- `failed`
- `inconclusive`

Do not add statuses for convenience labels. If a state does not change behavior,
filtering, validation, or review, it is not a lifecycle state.

## 12. Command/Query Catalog

Commands:

- `create_goal`
- `clarify_goal`
- `decompose_goal`
- `create_plan`
- `create_task`
- `clarify_task`
- `assign_task`
- `mark_blocked`
- `build_context_bundle`
- `start_run`
- `record_tool_execution`
- `attach_artifact`
- `review_artifact`
- `record_evaluation`
- `accept_task_output`
- `reject_task_output`
- `create_followup_task`
- `record_decision`
- `promote_memory`
- `deprecate_memory`
- `mark_superseded`
- `identify_reusable_workflow`

Queries:

- `show_active_goals`
- `show_goal_state`
- `show_tasks_for_goal`
- `show_blocked_tasks`
- `show_next_recommended_work`
- `show_context_for_task`
- `show_runs_for_task`
- `show_artifacts_from_run`
- `show_unreviewed_outputs`
- `show_decisions_for_goal`
- `show_memory_for_context`
- `show_external_ai_dependencies`
- `show_candidate_reusable_workflows`
- `show_event_log`

Commands mutate state. Queries compute/read state. Do not add fields to satisfy
a query if the value can be computed from existing state and events.

## 13. Field Admission Rules

Every proposed field must answer:

1. What question does this field answer?
2. What workflow or decision uses it?
3. Who or what writes it?
4. Who or what reads it?
5. Is it human-entered, AI-generated, computed, imported, or inferred?
6. Can it be derived from something else?
7. Does it need validation?
8. Does it change over time?
9. Does stale data create harm or confusion?
10. What happens if it is missing?
11. What happens if it is wrong?
12. Is this actually a relation, state, event, artifact, computed view, or note
    instead of a field?

Reject or defer fields justified only by:

- might be useful someday
- AI suggested it
- other systems have it
- a manager might want a metric
- it sounds nice
- we may report on it later

## 14. Context-Bundle Rules

`ContextBundle` is selected context for a run. It is not the whole project.

Rules:

- include only context that supports the task's goal, constraints, validation,
  or execution
- include source references for every included item
- include current goal/task contract before older background material
- include memory only by lifecycle status and scope
- include artifacts by role and relevance, not by folder dump
- record why each major context item was included
- do not treat rendered prompt text as the source of truth

## 15. Artifact And Memory Rules

Artifact:

- durable input/output/evidence file or record
- can be produced by a run or used as context
- is not canonical memory by default
- must carry source, role, and status

MemoryItem:

- reviewed/promoted reusable project or model-state knowledge
- must cite source evidence
- must have lifecycle status
- can be stale, superseded, or rejected
- is not raw AI output
- is not a transcript

AI output becomes memory only through explicit review or promotion.

## 16. Evaluation/Review Rules

Review answers: should this output be accepted, changed, rejected, or deferred?

Evaluation answers: did this work satisfy criteria, advance the goal, or provide
capability evidence?

Rules:

- review is not the same as evaluation
- approval is not the same as review
- completion is not proof of goal advancement
- accepted output may still create follow-up tasks
- evaluation must cite criteria or rubric
- dependency-reduction claims require evaluation evidence

## 17. Agent / Run / Model-Provider Distinction

`AgentProfile` describes an executor role or capability profile.

`ModelProvider` describes a backend that may power an AI executor.

`WorkSession` is an execution context or thread.

`Run` is one task-linked work attempt.

`ToolExecution` is one tool use within or related to a run.

Do not collapse these:

- Run is not Agent.
- ModelProvider is not AgentProfile.
- WorkSession is not Task.
- ToolExecution is not Run.
- Human executor and AI executor both play agent roles, but they are not model
  providers.

## 18. Automation Boundaries

Automation may:

- recommend next work
- build context bundles
- create draft tasks/plans
- record run evidence
- attach artifacts
- propose memory
- propose reusable workflow candidates

Automation must not:

- approve its own work
- publish trusted memory without review
- retire external providers without evaluation evidence
- launch broad or risky work without an explicit gate
- mutate project state from unreviewed AI output
- hide state changes inside prompts

Every automation needs:

- stop conditions
- failure handling
- review path
- event log entry

## 19. Anti-Bloat Rules

- Do not create a new entity when a property or relation is enough.
- Do not create a new field unless it passes the field admission test.
- Do not create a new workflow unless it supports the core loop.
- Do not create dashboards before the state model is stable.
- Do not create metrics without a decision that uses them.
- Do not promote AI output to memory without review/status.
- Prefer graph relations over rigid deep hierarchies.
- Prefer deferred fields over speculative fields.
- Every automation must have review/failure handling.
- Every entity must have at least one real workflow reason to exist.
- Every field must have a writer, reader, and consequence.
- Every view must answer a named query.

## 20. Open Questions

1. Is `Capability` accepted as a core entity for v2 runtime or kept as labels
   until routing/evaluation needs force it?
2. Is external-AI dependency reduction a standalone entity or a computed report
   over evaluations, tool executions, runs, and decisions?
3. Should routing be modeled as structured metadata on `Decision` instead of
   `RoutingDecision`?
4. What is the minimal accepted production schema for `MemoryItem` lifecycle and
   retrieval scope?
5. What is the exact boundary between `WorkSession`, external thread, process
   run, and task `Run`?
6. Where should the real v2 runtime live physically: `v2/` in this repo,
   package workspace, or separate repo?

## 21. Current Milestone And Next Implementation Step

Current milestone:

`Clean Independent AMS v2 Foundation`

Next implementation step:

`Capture an immutable extraction baseline, then create the independent v2 repository foundation.`

Scope:

- preserve this prototype and its runtime data unchanged;
- export and checksum current `data/v2-core.sqlite` state;
- create a new `agent-management-system-v2` repository;
- establish `core`, SQLite, and CLI boundaries with versioned migrations;
- make prototype imports and runtime paths mechanically forbidden;
- port the smallest complete goal-to-continuation loop through focused modules;
- generate revisioned task context from one explicit runtime authority; and
- add the independent operator UI only after application contracts are stable.

Non-goals:

- no more product work under `/app/v2-core`;
- no in-place prototype rewrite;
- no wholesale copy of the current v2 service or prototype UI;
- no schema or ontology expansion;
- no scheduler, worker pool, or general multi-agent fanout;
- no mandatory review ceremony for low-risk work; and
- no v1/v2 dual writes.
