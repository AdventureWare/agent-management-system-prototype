# V2 Requirements v0.1

Date: 2026-07-02
Status: Draft requirements

## Product Goal

V2 should become an owned local-first AI/agent operating system that progressively replaces affordances currently provided by external AI providers, while preserving enough provider interoperability to use external models deliberately and measurably.

The system should manage durable work state, agent sessions, artifacts, decisions, memory, tools, evaluations, and provider routing from owned data.

## Non-Goals For The First V2 Slice

- No full multi-user enterprise system.
- No broad autonomous execution loop before the state model is reliable.
- No migration of all v1 data before the importer and vertical slice are proven.
- No replacement of every external provider up front.
- No large UI rebuild before the domain/service layer is clear.
- No new model concept without review against v1 evidence.

## Primary Users

- Solo operator using AI agents for local project work.
- Local coding/research/writing agents that need bounded work packets and structured state updates.
- Future v2 evaluators that compare owned/local capability against provider-backed capability.

## Core Workflows

1. Capture or import a project and goal.
2. Decompose goal into sub-goals and tasks.
3. Prepare a work packet for an agent.
4. Launch or record a session/run.
5. Capture artifacts, tool calls, model usage, validation, blockers, and result evidence.
6. Request review or approval when needed.
7. Record decisions and memory updates through explicit proposals.
8. Retrieve relevant prior context without relying on chat history.
9. Route work across local and external models based on capability, cost, privacy, and evaluation.
10. Track which external-provider affordances have been replaced, partially replaced, or remain dependent.

## Functional Requirements

### Project And Goal State

- Store projects, goals, sub-goals, success criteria, status, and current progress.
- Link tasks, runs, decisions, artifacts, memory, and evaluations back to projects/goals.
- Support active goal continuation without adding a separate milestone abstraction.

### Task Decomposition

- Represent tasks as bounded work contracts.
- Support parent/child tasks, dependencies, and goal advancement.
- Keep readiness, risk, autonomy, review, and approval explicit.

### Artifact Registry

- Store artifacts as first-class records with URI/path, kind, producer, summary, checksum or version metadata where useful, and input/output role.
- Support artifact reuse as context.
- Keep files in normal local storage while tracking them durably.

### Decision Log

- Record durable decisions with type, rationale, alternatives, source evidence, date, actor, and affected records.
- Distinguish operational decisions from model-governance decisions and self-improvement suggestion decisions.

### Session Log

- Store agent sessions as first-class durable records.
- Distinguish reusable context/session from task-specific runs and tool/process events.
- Capture summaries without requiring full transcript ingestion into the core state model.

### Model-Provider Routing

- Represent providers, models, local runtimes, execution surfaces, cost, privacy, latency, capability, and routing policy.
- Record observed model usage and mismatch.
- Support routing decisions that can be evaluated later.

### Local Retrieval

- Provide local retrieval over projects, goals, tasks, runs, artifacts, decisions, memory items, and docs.
- Return source-linked results with inclusion reasons.
- Start with simple keyword/BM25/SQLite FTS if that is enough; add embeddings only after the retrieval contract is clear.

### Tool Registry And Execution Logs

- Store tools as callable capabilities with name, version, permissions, input schema, output schema, owning connector, and risk.
- Record tool executions with session/run linkage, arguments summary, output summary, artifacts, errors, duration, and approval context.

### Evaluation Benchmarks

- Store benchmark scenarios, eval tasks, expected outputs or rubrics, runs, scores, regressions, and model/provider comparisons.
- Use v1 golden scenarios as seed evals.
- Track local-agent capability improvement over time.

### Memory Governance

- Represent memory as governed records, not only project prose.
- Support proposal, review, publish, archive, supersede, and source evidence.
- Make memory retrieval explainable and scoped.

### External-AI Dependency Reduction

- Track capabilities currently supplied by external providers.
- Track replacement status: external-only, hybrid, local-assisted, locally reliable, retired external dependency.
- Track cost, privacy exposure, failure rate, quality, and eval confidence by capability/provider/model.

## Nonfunctional Requirements

- Local-first: v2 should run with local storage and local-first workflows.
- Preserve v1 data: v2 must import from copies/exports and never mutate v1 live data during migration tests.
- Inspectable: key state should be queryable without reading transcripts.
- Governed: review, approval, and model changes should be explicit.
- Testable: domain behavior should be covered by small deterministic tests and scenario evals.
- Modular: UI, API, CLI, agent tools, and storage should call the same application services.
- Incremental: v2 should prove a minimal slice before broad migration.

## Acceptance Criteria For V2 Minimal Slice

V2 earns broader implementation only when it can:

- import a small v1 project/goal/task/run subset from JSON or SQLite export
- display or expose project, goal, tasks, runs, artifacts, and decisions through one coherent state query
- launch or record one agent session/run with model/provider metadata
- attach at least one artifact as a first-class record
- record one decision and one memory proposal
- retrieve relevant context with source links
- record tool execution evidence
- run one benchmark/golden scenario and store result
- produce an external-AI dependency report for that slice
