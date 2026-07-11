# AMS V2 Design Bloat Audit

Date: 2026-07-09
Status: Design audit of v2 source-of-truth v0.1

## Scope

Audited:

- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/design/ams_v2_entity_cards.md`
- `docs/design/ams_v2_traceability_matrix.md`

This audit does not add features, schema, migrations, UI, commands, or runtime
behavior. It reviews whether the design is lean enough to start v2 without
repeating v1's entity/field sprawl.

## Verdict

The v2 source-of-truth is directionally good and much stricter than the
prototype. It correctly centers goal-directed work instead of agents, chats, or
dashboards.

The main bloat risk is that the spec marks too many concepts as `accepted`
without separating:

1. accepted domain vocabulary, and
2. entities that belong in the first implementation schema.

That distinction must be made before implementation. Otherwise v2 will start
with almost twenty tables/entities and recreate the prototype's "everything is
first-class" problem.

## Entities That Should Stay Accepted

These have strong traceability to competency questions, scenarios, workflows,
or audit needs and should stay accepted:

| Entity | Reason |
| --- | --- |
| `Project` | Required to bound work, roots, artifacts, goals, and context. |
| `Goal` | Central desired future state. Without this, AMS is just task tracking. |
| `Task` | Executable state-transition attempt; core unit of delegated work. |
| `Run` | Concrete task-linked work evidence; needed to avoid chat-memory source of truth. |
| `Artifact` | Durable output/input/evidence; required for review and reuse. |
| `Decision` | Explains why a path was chosen; required for audit and anti-drift. |
| `Review` | Required gate before accepting output or memory. |
| `MemoryItem` | Needed for governed reusable knowledge; must stay source-linked. |
| `Tool` | Needed to distinguish tool affordance from tool use and skill. |
| `ToolExecution` | Needed as granular evidence when a run uses tools. |
| `ModelProvider` | Required to track external/local AI usage and dependency. |

These are justified by repeated competency questions, not merely by product
ambition.

## Entities That Should Be Deferred From First Implementation

These may remain accepted or candidate in the ontology, but they should not be
first-slice persisted entities unless a narrow implementation test requires
them.

| Entity | Recommended status | Reason |
| --- | --- | --- |
| `Plan` | Deferred as persisted entity | The first slice can represent planned decomposition through `Goal`, `Task`, and `Decision`. Persist `Plan` only when alternatives need review before task creation. |
| `AgentProfile` | Deferred/minimal label | Assignment can start with executor type and optional profile label. Full profiles risk persona bloat. |
| `WorkSession` | Deferred or minimal | Important distinction, but first slice can record `Run` plus optional external session reference unless multi-run continuity is tested immediately. |
| `ContextBundle` | Accepted as read model first | It should initially be generated and logged as a source-linked packet, not necessarily a rich persisted entity. |
| `Evaluation` | Deferred/minimal record | Needed for dependency reduction, but first slice can use review plus validation summary unless explicit eval scenarios are included. |
| `Workflow` | Deferred | Reusable workflow should be created only after repeated runs/tasks prove the pattern. |
| `Skill` | Deferred | Similar to workflow; avoid creating skills for one-off instructions. |
| `EventLog` | Minimal append log only | Needed for audit, but do not design a broad event-sourcing system. |
| `Capability` | Candidate/deferred | Useful later; high taxonomy bloat risk. |
| `RoutingPolicy` | Deferred | Use `Decision` and run/model evidence first. |
| `ExternalAIDependency` | Defer as entity | Start as a report/read model over runs, providers, evaluations, and decisions. |

## Fields That Should Be Removed Or Deferred

The entity cards are mostly minimal, but some fields still look premature for
the first schema.

### Defer From First Schema

| Field | Entity | Reason |
| --- | --- | --- |
| `rootPaths` | `Project` | Useful, but first slice may only need one workspace/project root. Multiple roots can be an artifact/source-reference concern. |
| `priority` | `Goal`, `Task` | If no explicit prioritization workflow exists in the first slice, defer. Next-work selection can start with status/dependency/review gates. |
| `parentGoalId` | `Goal` | Keep relation conceptually; defer if first slice uses one goal. Add when decomposition requires real sub-goals. |
| `parentTaskId` | `Task` | Same: task dependencies may be enough for first slice. |
| `riskLevel` | `Task`, `Tool` | Keep if used by start-run gate; otherwise defer to explicit approval requirement. |
| `readinessLevel` | `Task` | V1 carried readiness complexity. V2 should start with lifecycle status plus missing-fields checks unless readiness changes behavior immediately. |
| `reviewRequirement` | `Task` | Could be derived from project/tool/risk defaults initially. Persist only if per-task override is needed. |
| `allowedRiskLevel` | `AgentProfile` | Defer with `AgentProfile`. |
| `locality` | `ModelProvider` | Useful for external/local dependency reports, but can be derived from provider kind early. |
| `externalThreadId` | `WorkSession` | Important only once external session continuity is in scope. |
| `includedSourceRefs` as blob | `ContextBundle` | Prefer join/source-reference rows if persisted; avoid opaque packed list. |
| `kind` | `Artifact`, `Tool` | Accept only with a tiny controlled vocabulary. Otherwise this becomes label sprawl. |
| `role` | `Artifact` | Keep only if constrained to context/evidence/output/deliverable. |
| `decisionType` | `Decision` | Keep small; avoid a growing enum of every action. |
| `targetType` / `targetId` | `Evaluation` | Polymorphic target is flexible but weakly constrained. Defer or use explicit links in first slice. |
| `scope` | `MemoryItem` | Needs a small scope model. Otherwise it becomes prose. |
| `approvalRequirement` | `Tool` | Keep only if start-run/tool-use gates read it. |
| `usageCriteria` | `Skill` | Defer with `Skill`. |
| `steps` | `Workflow` | Defer with `Workflow`; do not invent a workflow DSL now. |
| `actorRef` | `EventLog` | Needed only if actors are modeled. Otherwise use source/system string. |

### Keep But Validate Strictly

| Field | Entity | Constraint |
| --- | --- | --- |
| `successCriteria` | `Goal`, `Task` | Must be concrete enough for review/evaluation. |
| `status` | most entities | Must change behavior/filtering, not just display. |
| `sourceRefs` | `MemoryItem` | Required for trusted memory. |
| `summary` | many entities | Must not become the only structured state. |
| `validationSummary` | `Run` | Required if run is completed. |

## Ambiguous Terms

| Term | Problem | Recommendation |
| --- | --- | --- |
| `AgentProfile` | Could mean role, persona, executor, model wrapper, or permission profile. | Rename or define as `ExecutorProfile` if it is about assignment. Keep personas out. |
| `ModelProvider` | Could mean provider company, local runtime, model family, or specific model. | Split later into provider/runtime/model only when routing requires it. For first slice, keep minimal provider/model label. |
| `WorkSession` | Could mean chat thread, local process session, browser session, or multi-run project context. | Keep boundary open; do not make it central in first schema. |
| `ContextBundle` | Could become persisted prompt blob. | Treat as source-linked context selection/read model first. |
| `Evaluation` | Could mean human review, automated test, benchmark, quality score, or goal advancement check. | Define subtypes later only from real workflows. First slice can record criteria/result/evidence minimally. |
| `Workflow` vs `Skill` | Both describe reusable procedure. | Keep both deferred until real repeated patterns distinguish them. |
| `EventLog` | Could become audit log, event sourcing, telemetry, or timeline. | Start as minimal significant-change log only. |

## Overloaded Concepts

### Task

`Task` is still at risk of becoming the v2 dumping ground. Fields such as risk,
readiness, review requirement, assigned executor, capability labels, routing
hints, artifacts, dependencies, and evaluation can all gravitate toward task.

Rule: if a fact is about execution evidence, artifact evidence, memory, routing,
or review, it should usually be a relation or separate record, not a task field.

### Decision

`Decision` risks absorbing routing, review, memory publication, task transition,
and architectural decisions.

Rule: use `Decision` for durable choices among alternatives. Do not use it for
every state transition unless the transition actually needs rationale.

### MemoryItem

`MemoryItem` risks becoming cleaned-up AI output.

Rule: memory is not trusted unless it has source evidence and lifecycle status.
Unreviewed output is artifact/run evidence, not memory.

### Evaluation

`Evaluation` risks becoming generic scoring.

Rule: evaluation must cite criteria. No criteria means no evaluation record.

## Missing Relations

The current relation list is good but should add or clarify these before schema:

- `Task assigned to AgentProfile` should allow human/tool/AI executor types
  without forcing all executors through model providers.
- `Run uses ModelProvider` should be direct; it should not only flow through
  `AgentProfile`.
- `Review targets Artifact | Run | Task` should be explicit. Current wording is
  artifact-heavy but tasks/runs also need review gates.
- `Evaluation targets Goal | Task | Run | Artifact | ToolExecution` needs
  bounded allowed target types or separate relation tables.
- `MemoryItem sourced from Artifact | Decision | Review | Evaluation | Run`
  should be explicit.
- `Decision supersedes Decision` or `Decision reverses Decision` is needed if
  decision lifecycle includes reversed/superseded.
- `Artifact used as context in ContextBundle` should be separate from artifact
  produced by run.
- `External AI dependency report summarizes Run/ModelProvider/Evaluation`
  should be a read-model relation if not an entity.

## Missing State Transitions

The docs list states but not legal transitions. Before implementation, define
legal transitions for first-slice entities only.

Needed first:

- `Goal`: draft -> active -> completed/paused/blocked/canceled/superseded.
- `Task`: draft -> ready -> in_progress -> review -> done, plus blocked and
  canceled paths.
- `Run`: planned -> running -> completed/failed/canceled.
- `Artifact`: draft/submitted -> accepted/rejected/superseded/deprecated.
- `Review`: open -> approved/changes_requested/rejected/canceled.
- `MemoryItem`: proposed -> trusted/rejected, plus trusted -> stale/superseded.

Probably defer:

- `Workflow` transitions.
- `Skill` transitions.
- rich `Evaluation` transitions beyond recorded/passed/failed/inconclusive.

## Places That Still Smell AI-Generated

These are not necessarily wrong, but they read broader than the immediate
system need:

- Accepting `Workflow`, `Skill`, and `EventLog` all at once.
- Accepting `Plan` as a persisted entity before proving alternatives need
  independent lifecycle.
- Treating `AgentProfile` as accepted without examples of non-persona usage.
- `Project.rootPaths` plural in the minimal card.
- `ModelProvider.locality` and provider dependency language before the routing
  loop is implemented.
- `Evaluation` as a full entity in the first source-of-truth when review plus
  validation may cover the first run.
- `Tool.kind`, `Artifact.kind`, `Decision.decisionType` without enumerated
  minimal vocabularies.
- `EventLog` accepted without limiting event types.

These are exactly the kinds of plausible concepts that can become bloat if
implemented early.

## Recommended Accepted Set For First Implementation

First-slice persisted entities:

- `Project`
- `Goal`
- `Task`
- `TaskDependency`
- `Run`
- `Artifact`
- `Review`
- `Decision`
- `MemoryItem` as proposed/trusted governed knowledge
- `Tool`
- `ToolExecution`
- `ModelProvider` as minimal provider/model label table or source label
- `SourceReference`

First-slice read models, not entities:

- `ContextBundle`
- next-work recommendation
- external-AI dependency report
- event timeline

First-slice deferred:

- `Plan`
- `AgentProfile`
- `WorkSession`
- `Evaluation` if no benchmark/eval scenario is in the slice
- `Workflow`
- `Skill`
- `Capability`
- `RoutingPolicy`
- `ExternalAIDependency` as entity
- rich `EventLog`

## Recommended Minimal Implementation Slice

Implement the smallest v2 slice that proves the model without overbuilding:

1. Create isolated v2 runtime boundary that cannot write to v1 `data/app.sqlite`.
2. Create explicit SQLite schema for:
   - projects
   - goals
   - tasks
   - task_dependencies
   - runs
   - artifacts
   - reviews
   - decisions
   - memory_items
   - tools
   - tool_executions
   - model_providers or provider source labels
   - source_references
3. Implement only these commands:
   - `create_goal`
   - `create_task`
   - `build_context_bundle` as read model
   - `start_run`
   - `record_tool_execution`
   - `attach_artifact`
   - `review_artifact`
   - `accept_task_output`
   - `record_decision`
   - `promote_memory`
4. Implement only these queries:
   - `show_active_goals`
   - `show_tasks_for_goal`
   - `show_next_recommended_work`
   - `show_context_for_task`
   - `show_artifacts_from_run`
   - `show_unreviewed_outputs`
   - `show_memory_for_context`
   - `show_external_ai_dependencies` as computed report
5. Run one real low-risk AMS v2 task through the loop.

Do not implement UI, scheduler, workflow engine, skills registry, capability
taxonomy, routing policy, broad event sourcing, or full v1 import in this slice.

## Source-Of-Truth Updates Recommended

Do not expand the design. Tighten it:

1. Add a distinction between:
   - accepted vocabulary
   - accepted first-slice persisted entity
   - read model
   - deferred entity
2. Move `Plan`, `AgentProfile`, `WorkSession`, `Workflow`, `Skill`, and rich
   `EventLog` out of first-slice implementation.
3. Treat `ContextBundle` as a read model until persistence is proven necessary.
4. Treat external-AI dependency as a computed report first.
5. Define legal state transitions for first-slice entities before schema work.
6. Add tiny controlled vocabularies before accepting `kind`, `role`, or
   `decisionType` fields.

## Open Questions Blocking Schema Work

1. Should first-slice v2 include `Evaluation`, or can review plus validation
   summary satisfy the first end-to-end loop?
2. Should first-slice v2 include `MemoryItem`, or should memory promotion wait
   until artifact/review/decision flow is proven?
3. Should `ModelProvider` be a table now or a source label on runs until routing
   is implemented?
4. Does v2 need `AgentProfile` immediately, or is executor type enough?
5. Which artifact roles are allowed in the first slice?
6. Which decision types are allowed in the first slice?

## Bottom Line

The design is good enough to guide v2, but too broad to implement literally.

If implementation starts from every accepted entity in the current source docs,
v2 will likely repeat the prototype's bloat. The next implementation milestone
should use the reduced first-slice set above and treat everything else as
deferred vocabulary or read models until real workflows demand persistence.
