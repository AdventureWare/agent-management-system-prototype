# V2 Domain Model v0.1

Date: 2026-07-02
Status: Draft proposal for review

## Modeling Principle

V2 should keep the v1 insight that work state, not chat state, is the center. The model should be smaller than the current surface area but more explicit where v1 used prose, paths, or string arrays.

This draft proposes a v2 model for design discussion only. It does not change the accepted v1 model.

## Core Entities

### Workspace

Top-level local operating boundary for projects, settings, providers, tools, and storage.

Key fields:

- `id`
- `name`
- `rootPaths`
- `createdAt`
- `updatedAt`

### Project

Durable context container for a body of work.

Key relationships:

- has many `Goal`
- has many `Task`
- has many `Artifact`
- has many `Decision`
- has many `MemoryItem`
- has many `EvaluationScenario`

V1 source: `Project`.

### Goal

Desired future state or outcome.

Key fields:

- `id`
- `projectId`
- `parentGoalId`
- `title`
- `summary`
- `successCriteria`
- `status`
- `priority`
- `targetDate`

V1 source: `Goal`.

### Task

Bounded work contract intended to advance a goal.

Key fields:

- `id`
- `projectId`
- `goalId`
- `parentTaskId`
- `title`
- `summary`
- `scope`
- `nonGoals`
- `successCriteria`
- `readyCondition`
- `expectedOutcome`
- `validationPlan`
- `status`
- `priority`
- `riskLevel`
- `readinessLevel`
- `autonomyLevel`
- `reviewRequirement`
- `approvalRequirement`

Key relationships:

- depends on other `Task`
- requires `Capability`
- may require `Tool`
- may require `MemoryItem` or `Artifact` as context
- has many `Run`

V1 source: `Task`, task dependencies, task attachments, workflow links.

### WorkSession

Reusable work context or conversation/session container. This is not a task and not a result.

Key fields:

- `id`
- `projectId`
- `providerId`
- `modelId`
- `executionSurfaceId`
- `origin`
- `externalThreadId`
- `state`
- `summary`
- `createdAt`
- `updatedAt`

V1 source: `AgentThread`.

### Run

Task-linked work attempt/evidence record.

Key fields:

- `id`
- `taskId`
- `workSessionId`
- `providerId`
- `modelId`
- `executionSurfaceId`
- `status`
- `startedAt`
- `endedAt`
- `inputSummary`
- `actionSummary`
- `resultSummary`
- `validationSummary`
- `blockerSummary`
- `usage`
- `cost`

V1 source: control-plane `Run` plus selected `AgentRun` process metadata.

### Tool

Callable capability available to agents or the system.

Model status: Accepted minimal concept by `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md`.

Preview status: Current preview records still live in `v2_preview_tools`; accepting the concept does not migrate preview records or authorize production tool-launching behavior.

Key fields:

- `id`
- `name`
- `description`
- `kind`
- `owner`
- `status`
- `riskLevel`
- `approvalMode`

V1 source: MCP manifest commands, task required tool names, scripts, connectors.

Boundary notes:

- Tool is not a `Skill`; a skill is instruction/process guidance.
- Tool is not a `Capability`; a capability is an ability.
- Tool is not a `Provider`; a provider supplies infrastructure or model/service access.
- Tool is not an `ExecutionSurface`; an execution surface is where work runs.
- Tool is not a `ToolExecution`; a tool execution is a logged use of a tool.

### ToolExecution

One tool call or command execution within a run/session.

Model status: Accepted minimal evidence concept by `docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md`.

Preview status: Current preview records still live in `v2_preview_tool_executions`; accepting the concept does not migrate preview records, authorize production schema, or authorize tool launching/automatic telemetry capture.

Key fields:

- `id`
- `taskId`
- `runId`
- `workSessionId`
- `toolId`
- `startedAt`
- `endedAt`
- `status`
- `inputSummary`
- `outputSummary`
- `errorSummary`
- `artifactIds`
- `approvalId`

V1 source: telemetry, run summaries, command logs, MCP/CLI interactions.

Boundary notes:

- ToolExecution is not a `Run`; a run is the broader task-linked work attempt.
- ToolExecution may be linked to a run when the tool use happened inside that work attempt.
- ToolExecution may produce artifacts and may require approval, but it should not replace `Artifact` or `Approval`.
- The first preview implementation should log tool use; it should not launch arbitrary tools.

### Artifact

Durable output or input information tracked by AMS.

Key fields:

- `id`
- `projectId`
- `taskId`
- `runId`
- `uri`
- `kind`
- `role`
- `title`
- `summary`
- `contentType`
- `sizeBytes`
- `checksum`
- `createdAt`

Roles:

- `output`
- `context`
- `evidence`
- `deliverable`

V1 source: task attachments, run artifact paths, artifact browser, agent output paths.

### Decision

Durable choice with rationale and evidence.

Key fields:

- `id`
- `projectId`
- `goalId`
- `taskId`
- `runId`
- `decisionType`
- `summary`
- `rationale`
- `alternatives`
- `evidenceArtifactIds`
- `decidedBy`
- `createdAt`

V1 source: `Decision`, project `decisionLog`, model decision docs.

### Review

Evaluation of completed or submitted work evidence.

V1 source: `Review`.

Preview write status: Existing accepted concept. V2 preview may create review records with `ams-v2-preview` provenance, but review creation must not silently complete tasks or publish memory.

### Approval

Permission gate before risky action or state transition.

V1 source: `Approval`.

Preview write status: Existing accepted concept. V2 preview may create approval records with `ams-v2-preview` provenance, but approval creation must not apply changes, run tools, route models, or publish memory automatically.

### MemoryItem

Source-linked reusable local knowledge available for governed retrieval.

Model status: Accepted minimal governed knowledge concept by `docs/model-decisions/2026-07-03-accept-minimal-memory-item-concept.md`.

Preview status: Current preview records still live in `v2_preview_memory_items`; accepting the concept does not migrate preview records, authorize production schema, automatic extraction, automatic publication, retrieval ranking, expiration policy, or skill promotion.

Key fields:

- `id`
- `projectId`
- `taskId`
- `scope`
- `title`
- `summary`
- `body`
- `status`
- `sourceTaskId`
- `sourceRunId`
- `sourceDecisionId`
- `sourceEvaluationResultId`
- `sourceDependencyReductionId`
- `supersedesId`
- `createdAt`
- `publishedAt`

Lifecycle:

- `draft`
- `proposed`
- `published`
- `archived`
- `superseded`

V1 source: project memory fields, decisions, self-improvement knowledge items, docs.

Boundary notes:

- MemoryItem is not a transcript or prompt cache.
- MemoryItem is not a Decision, though it may extract reusable knowledge from a decision.
- MemoryItem is not a Skill; skill-worthy procedural knowledge may later be promoted separately.
- Draft memory is not trusted retrieval context.
- Published memory is a lifecycle status, not proof that the item is globally true forever.

### Provider

Runtime/provider organization or backend.

V1 source: `Provider`.

### Model

Specific model/runtime option under a provider.

Model status: Accepted minimal concept by `docs/model-decisions/2026-07-03-accept-minimal-model-concept.md`.

Registry status: Current model data remains distributed across provider defaults, provider pricing, run telemetry, evaluation labels, and routing labels. Accepting the concept does not authorize production model registry schema, model-catalog sync, pricing refresh, benchmark execution, automatic routing, or provider retirement policy.

Key fields:

- `id`
- `providerId`
- `name`
- `kind`
- `locality`
- `capabilityNames`
- `costSummary`
- `contextWindow`
- `status`

V1 source: provider default model, model pricing, run model fields.

### RoutingDecision

Task-linked rationale for selecting or proposing a provider/model/execution route.

Model status: Experimental event/decision-support concept for v2 preview only. `docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md` decides not to accept `RoutingDecision` as a standalone core entity.

Production direction: route choices should likely become accepted `Decision` records with routing-specific metadata, while reusable routing rules may later become a separate `RoutingPolicy`.

Key fields:

- `id`
- `taskId`
- `runId`
- `capabilityName`
- `providerId`
- `modelId`
- `routingPolicy`
- `decisionBasis`
- `selectedReason`
- `rejectedOptions`
- `riskLevel`
- `privacyLevel`
- `costPriority`
- `status`
- `createdAt`

Boundary notes:

- RoutingDecision is not the accepted `Decision` concept, though it may later merge into structured `Decision` metadata.
- RoutingDecision is not a `Run`; it records intended or proposed route rationale, not execution evidence.
- RoutingDecision is not a `Provider` or `Model` registry entry.
- RoutingDecision can cite evaluation evidence in prose during preview, but it should not replace `EvaluationResult`.
- RoutingDecision must not become automatic routing behavior or a second durable decision log.

### ExecutionSurface

Place/mechanism where work can run.

V1 source: `ExecutionSurface`.

### Capability

Ability required by work or provided by a model/tool/role/surface.

Model status: Accepted minimal concept by `docs/model-decisions/2026-07-03-accept-minimal-capability-concept.md`.

Registry status: Current capability data remains distributed across task requirement strings, provider capability strings, execution-surface fit helpers, evaluation scenario labels, routing labels, and dependency-reduction labels. Accepting the concept does not authorize production capability registry schema, taxonomy hierarchy, alias normalization, or routing policy.

Key fields:

- `id`
- `name`
- `description`
- `category`
- `status`

V1 source: required capability names, provider capabilities, skills, roles.

### EvaluationScenario

Benchmark or golden scenario for a capability/workflow.

Model status: Accepted minimal concept by `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md`.

Preview status: Current preview records still live in `v2_preview_evaluation_scenarios`; accepting the concept does not migrate preview records, authorize benchmark execution, or accept production schema.

Key fields:

- `id`
- `projectId`
- `title`
- `capabilityName`
- `promptOrTask`
- `rubric`
- `status`
- `version`

V1 source: `docs/model-evals/golden-scenarios.md`, tests, release readiness.

Boundary notes:

- EvaluationScenario is not a `Task`; it is reusable evaluation context.
- EvaluationScenario is not a `Workflow`; it does not describe the normal sequence of doing work.
- EvaluationScenario is not a `Review`; it defines evaluation criteria rather than accepting/rejecting submitted work.
- EvaluationScenario is not an `EvaluationResult`; the scenario defines reusable evaluation context while the result records one outcome.

### EvaluationResult

Status-bearing evidence record for one evaluation scenario outcome.

Model status: Accepted minimal evidence concept by `docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md`.

Naming note: The initial v2 draft used `EvaluationRun`. Use `EvaluationResult` because `EvaluationRun` is too easy to confuse with task `Run`.

Preview status: Current preview records still live in `v2_preview_evaluation_results`; accepting the concept does not migrate preview records, authorize benchmark execution, define global score normalization, or authorize automatic provider routing.

Key fields:

- `id`
- `scenarioId`
- `taskId`
- `modelId`
- `providerId`
- `runId`
- `toolExecutionId`
- `status`
- `score`
- `rubricSummary`
- `resultSummary`
- `failureSummary`
- `artifactIds`
- `createdAt`

Boundary notes:

- EvaluationResult is not a task `Run`; it is scored evidence about a scenario.
- EvaluationResult may cite a task run, tool execution, artifact, provider, or model.
- EvaluationResult is not a `Review`; it should not replace human/governance acceptance.
- EvaluationResult can inform a `Decision` or dependency-reduction record.
- Numeric scores are scenario-scoped until a later decision defines cross-scenario comparability.

### DependencyReductionRecord

Tracks movement away from external AI dependencies.

Model status: Experimental status/evidence concept for v2 preview only. `docs/model-decisions/2026-07-03-keep-dependency-reduction-record-experimental.md` keeps the current preview record experimental and recommends splitting replacement state from source-linked evidence before production acceptance.

Key fields:

- `id`
- `taskId`
- `capabilityName`
- `providerId`
- `externalAffordance`
- `replacementStatus`
- `evaluationResultId`
- `routingDecisionId`
- `evidenceSummary`
- `rationale`
- `nextStep`
- `costTrend`
- `qualityTrend`
- `privacyExposure`
- `createdAt`

Statuses:

- `external_only`
- `hybrid`
- `local_assisted`
- `locally_reliable`
- `external_retired`

Boundary notes:

- DependencyReductionRecord is not a provider retirement command.
- DependencyReductionRecord is not an EvaluationResult; it summarizes replacement status using evidence.
- DependencyReductionRecord is not a RoutingDecision; it tracks progress away from external affordances.
- DependencyReductionRecord may later split into capability replacement state plus evidence links.
- DependencyReductionRecord must not become automatic routing behavior or provider-retirement policy.

## Relationships

- `Project` has many `Goal`, `Task`, `Artifact`, `Decision`, `MemoryItem`, `EvaluationScenario`.
- `Goal` may have parent/child goals and many tasks.
- `Task` may have parent/child tasks and dependencies.
- `Task` has many `Run`.
- `WorkSession` has many `Run`.
- `Run` has many `ToolExecution` and `Artifact`.
- `Artifact` can be output of one run and context for later tasks.
- `Review` and `Approval` gate task/run state transitions.
- `Decision` can cite tasks, runs, reviews, approvals, artifacts, and memory.
- `MemoryItem` cites source decisions/runs/artifacts and is retrieved into work packets.
- Preview `MemoryItem` records are exposed in work packets only when task-linked or project-scoped with proposed/published status.
- `Model`, `Provider`, `ExecutionSurface`, `Tool`, and `Capability` inform routing.
- `RoutingDecision` records preview-only rationale for provider/model route selection.
- `EvaluationResult` measures model/provider/tool/workflow capability against an `EvaluationScenario`.
- `DependencyReductionRecord` uses evaluation and run evidence to track owned capability.

## Main Changes From V1

- Add first-class `Artifact`.
- Add first-class `Tool` and `ToolExecution`.
- Split `WorkSession` from task evidence `Run` explicitly.
- Add first-class `Model` under `Provider`.
- Add governed `MemoryItem`.
- Add `EvaluationScenario` and `EvaluationResult`.
- Add `DependencyReductionRecord`.
- Keep `Goal`, `Task`, `Run`, `Review`, `Approval`, `Decision`, `Project`, `Provider`, and `ExecutionSurface`.

## Concepts To Keep Out Of Core Initially

- Full organization/account/billing model.
- A separate milestone entity.
- A second task/workflow system.
- Transcript as source of truth.
- A generic graph database unless concrete queries prove it is needed.
