# V2 Architecture v0.1

Date: 2026-07-02
Status: Draft architecture

## Recommendation

Use a local-first modular monolith for the v2 vertical slice. Keep UI, API, CLI, MCP, and agent tools as adapters around the same domain services.

Do not begin with distributed agents, queues, or a separate knowledge graph. Start with a reliable local core that can later expose multiple interfaces.

## Architectural Goals

- Make durable state queryable without reading chat transcripts.
- Keep domain rules out of page components and one-off API handlers.
- Make storage explicit enough for constraints, migration, analytics, and evaluation.
- Let agents use structured tools rather than prompt-stuffed context.
- Track model/provider/tool use as evidence for reducing external dependency.
- Preserve v1 data through import adapters, not direct mutation.

## Proposed Layers

### 1. Domain Core

Pure types, invariants, lifecycle transitions, and policy checks.

Responsibilities:

- goal/task/run/review/approval status transitions
- dependency and actionability classification
- artifact and memory lifecycle rules
- tool execution record validation
- provider/model routing policy contracts
- evaluation scoring records

### 2. Application Services

Use-case services that orchestrate domain operations.

Examples:

- `createGoal`
- `decomposeGoal`
- `prepareWorkPacket`
- `recordRunResult`
- `attachArtifact`
- `recordToolExecution`
- `proposeMemoryUpdate`
- `requestReview`
- `recordDecision`
- `runEvaluationScenario`
- `reportDependencyReduction`

All UI/API/CLI/MCP surfaces should call these services.

### 3. Storage

Use SQLite as the local source of truth, but move from generic payload tables to an explicit schema for v2 core records.

Initial storage options:

- SQLite tables for core entities and relationships.
- JSON columns only for bounded metadata, schemas, summaries, and provider-specific payloads.
- SQLite FTS for local retrieval over text fields and artifact summaries.
- File storage for large artifacts, with artifact records pointing to local paths/URIs.

Avoid:

- Mutating v1 `data/app.sqlite` directly.
- Using transcript files as primary state.
- Hiding important relationships inside JSON blobs when v2 needs to query them.

### 4. Retrieval Index

Start with a simple local retrieval index:

- SQLite FTS over project, goal, task, run, decision, memory, and artifact summary text.
- Source-linked results with record IDs and inclusion reasons.
- Later optional embedding index once retrieval quality requirements are known.

### 5. Agent Interface

Expose structured agent tools:

- get current context
- get goal state
- get next work recommendation
- get work packet
- record run result
- record validation
- record tool execution
- attach artifact
- propose memory update
- request review/approval
- get relevant context

Keep rendered prompts as one output field, not the primary integration.

### 6. Human Interface

Start with a minimal operator UI:

- project/goal overview
- task queue/detail
- run/session detail
- artifact registry
- review/approval queue
- memory proposals
- evaluation/dependency report

Avoid recreating every v1 page before the core slice is proven.

### 7. Import And Archive Adapters

Read v1 exports and map them into v2 staging tables or import previews.

Adapters should:

- read from v1 JSON snapshots or copied SQLite, never live-mutate v1
- map v1 IDs to v2 IDs
- preserve source record references
- report unmapped fields
- import a small slice first

## Suggested Physical Shape

Choose one after review:

1. Same repo, isolated `v2/` package/app.
2. Same repo, branch-only prototype with import adapters.
3. New repo with v1 as read-only import source.

For the first vertical slice, same repo under an isolated `v2/` directory is likely easiest because docs, v1 exports, and tests are nearby. It should not share v1 runtime state.

## Service Boundaries

| Area                     | Service             |
| ------------------------ | ------------------- |
| Work state               | `WorkService`       |
| Runs and sessions        | `ExecutionService`  |
| Artifacts                | `ArtifactService`   |
| Decisions and governance | `GovernanceService` |
| Memory                   | `MemoryService`     |
| Retrieval                | `RetrievalService`  |
| Provider/model routing   | `RoutingService`    |
| Tools                    | `ToolService`       |
| Evaluations              | `EvaluationService` |
| Migration                | `V1ImportService`   |

These can start as modules in one app. They do not need to be separate processes.

## Data Flow For One Task

1. Operator or importer creates project, goal, and task.
2. `WorkService` classifies task readiness and dependencies.
3. `RetrievalService` returns relevant memory, decisions, prior runs, and artifacts.
4. `RoutingService` selects model/provider/surface or records why human approval is required.
5. `ExecutionService` creates work session/run.
6. Agent executes and calls `ToolService` through logged tool executions.
7. `ArtifactService` registers outputs.
8. `ExecutionService` records result, validation, blockers, usage, and cost.
9. `GovernanceService` opens review/approval or records acceptance.
10. `MemoryService` creates memory proposals from accepted evidence.
11. `EvaluationService` updates capability/dependency evidence where applicable.

## Testing Strategy

- Domain unit tests for transitions and invariants.
- Service tests for workflows.
- Import tests with small v1 fixtures.
- Golden scenario tests seeded from `docs/model-evals/golden-scenarios.md`.
- Retrieval tests that verify source-linked context.
- Evaluation tests that compare provider/local outputs by rubric.

## Security And Governance

- Local operator token for API/MCP.
- Tool permission profiles.
- Approval gates for external state, file writes outside allowed roots, network access, and high-risk autonomy.
- Audit records for tool execution, provider calls, memory publication, and decision changes.

## Architecture Risks

- Over-designing v2 before proving the vertical slice.
- Recreating every v1 page instead of proving the core workflows.
- Adding embeddings or a graph database too early.
- Treating local models as automatically sufficient without evaluation evidence.
- Migrating all v1 data before the v2 import contract is stable.

## Architecture Decision

V2 should be a local-first modular monolith with explicit SQLite schema, structured agent tools, first-class artifacts/tools/memory/evaluations, and read-only v1 import adapters.
