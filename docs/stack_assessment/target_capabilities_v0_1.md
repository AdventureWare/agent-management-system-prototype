# Target Capabilities v0.1

Date: 2026-07-02
Status: Assessment draft

## Purpose

This document restates what the next AMS / owned-agent system should be able to do. It separates required near-term capabilities from later capabilities so stack decisions do not optimize for speculative complexity.

## System Goal

AMS should become a local-first operating layer for project, goal, task, agent, memory, tool, artifact, decision, session, model-routing, and evaluation state. It should progressively replace affordances currently provided by external AI products while preserving human control, provenance, and reviewability.

The system should treat software architecture as applied ontology: durable entities and workflows should encode the right assumptions about work, evidence, agents, tools, memory, and action.

## Required Now

These are needed for the next useful v2 vertical slice.

### Project And Goal State

- Represent one or more projects.
- Represent goals and sub-goals.
- Track goal status, success criteria, priority, and source provenance.
- Connect goals to tasks and decisions.

### Task Work State

- Represent tasks, sub-tasks, dependencies, readiness, risk, autonomy, approval requirements, and validation plans.
- Classify what is ready, blocked, reviewable, done, or awaiting approval.
- Produce a work packet from structured state.

### Runs And Sessions

- Represent a work session separately from a task result.
- Represent task-linked runs as evidence.
- Preserve external thread/session IDs when imported.
- Capture result, validation, blocker, model, cost, and usage metadata.

### Decision And Governance Records

- Keep reviews and approvals distinct.
- Record decisions with rationale/source links.
- Make review/approval gates queryable.

### Artifact Registry

- Register files, outputs, context inputs, and evidence artifacts.
- Track path/URI, role, source record, task/run linkage, and existence.

### CLI-First Operator And Agent Interface

- Load a preview/import slice.
- Inspect project/goal/task state.
- Inspect linked runs, reviews, approvals, decisions, artifacts, and source references.
- Keep read/write commands explicit.

### Local-First Persistence

- Use SQLite as the local source of truth.
- Keep large files in the filesystem with database records pointing to them.
- Keep import/export and archive paths explicit.

### Source/Claim/Evidence Tracking

- Preserve v1 source IDs during migration.
- Link decisions, memory proposals, artifacts, and evaluation results back to evidence.

### Testing And Migration Proofs

- Test the import mapper.
- Test schema constraints.
- Test read models.
- Test migrations and fixture loads.

## Required Soon

These should come after the initial v2 core works.

### Tool Registry And Execution Logs

- Model tools as first-class callable affordances.
- Track permission profile, risk, input/output shape, and lifecycle.
- Log each tool execution against run/session/task.

### Model Provider Routing

- Model providers and models as replaceable engines.
- Route by task type, cost, privacy, capability, risk, and availability.
- Record routing rationale and post-run evidence.

### Local Retrieval

- Index project, goal, task, run, decision, memory, artifact summaries.
- Return source-linked results with inclusion reasons.
- Start with keyword/FTS before embeddings.

### Memory Governance

- Propose memory from evidence.
- Review/publish/supersede/reject memory items.
- Keep memory separate from raw transcript history.

### Evaluation Benchmarks

- Define golden scenarios and benchmark tasks.
- Record evaluation runs and compare providers/models/tools.
- Use results to guide routing and dependency reduction.

### External-AI Affordance Inventory

- Track which external AI affordances are used.
- Track local/owned replacements and confidence.
- Connect replacement progress to evaluations.

## Later Capabilities

These should be deferred until the local core proves value.

- Multi-user collaboration.
- Distributed agent scheduling.
- Cloud-hosted production deployment.
- Full text embedding/vector infrastructure.
- Knowledge graph database.
- Plugin marketplace.
- Rich desktop app packaging.
- Automated merge/deploy authority.
- Long-running autonomous execution without human review.
- Complex multi-agent negotiation.

## Explicitly Not Required Yet

- Rebuilding every v1 Svelte route.
- Migrating all historical data.
- Replacing Codex immediately.
- Supporting every model provider.
- Running local LLMs inside AMS.
- General-purpose chat product parity.
- Distributed queues or service mesh.
- PostgreSQL or document DB.
- Full ontology/knowledge-graph tooling.

## Capability Implications For Stack

- The core should be queryable, testable, and locally inspectable.
- CLI and service boundaries matter more than UI breadth.
- SQLite plus files is a better initial fit than a remote database.
- Explicit schema is needed for v2 because the target capabilities rely on cross-record queries and provenance.
- Retrieval and model routing should be staged, not installed as heavy infrastructure up front.
