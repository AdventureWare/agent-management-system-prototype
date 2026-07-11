# Stack Options Comparison v0.1

Date: 2026-07-02
Status: Assessment draft

## Summary

The best overall direction is not a full stack replacement. The strongest fit is a TypeScript/Node modular monolith with SQLite, local files, CLI-first services, and a later SvelteKit UI. Python should be used selectively for specialized retrieval/ML/evaluation tooling only if evidence shows the TypeScript ecosystem is a drag for those tasks.

## Language And Runtime

### Current TypeScript/Node/SvelteKit

Strengths:

- Already used throughout the repo.
- Shared types across server, CLI, API, and UI.
- Good for agent-readable code and small diffs.
- Existing tests and tooling are strong.
- `better-sqlite3` gives simple local DB access.

Weaknesses:

- Some ML/local-model tooling is stronger in Python.
- Node script formats are currently mixed.
- SvelteKit can encourage page-first architecture if not constrained.

Fit: Strong for v2 core and operator UI.

Recommendation: Keep TypeScript/Node as the primary stack.

### Python

Strengths:

- Strong ecosystem for embeddings, local model tooling, evaluation notebooks, data science, and text processing.
- Good for one-off import analysis or retrieval experiments.

Weaknesses:

- Would split the current codebase and type model.
- UI/API/CLI integration would need new boundaries.
- More likely to create duplicate domain models.

Fit: Medium as auxiliary tooling, weak as full replacement.

Recommendation: Defer. Use only for isolated retrieval/evaluation experiments if needed.

### Hybrid Python + TypeScript

Strengths:

- TypeScript for app/domain/UI; Python for ML/retrieval/local-model experiments.
- Preserves optionality for local AI infrastructure.

Weaknesses:

- Requires strict boundary discipline.
- Higher setup and agent-inspection cost.
- Risk of two models and two migration paths.

Fit: Medium-term option.

Recommendation: Allow later behind file/CLI boundaries, not in minimal v2.

### Other Candidates

Rust/Go/Swift are not indicated by the repo. They may help for specific binaries or desktop apps later, but they would increase migration and agent-coding cost now.

Recommendation: Avoid for v2 core.

## Storage Options

### Plain Files / Markdown / YAML / JSON

Strengths:

- Very inspectable.
- Git-friendly.
- Good for docs, model decisions, fixtures, archives, and human-authored memory.

Weaknesses:

- Weak relational integrity.
- Harder cross-record queries.
- Concurrent updates and migrations get awkward.

Fit: Strong for docs/import/export/archive; weak as primary state.

Recommendation: Use alongside SQLite, not instead of it.

### SQLite

Strengths:

- Local-first, durable, cheap, inspectable.
- Easy to back up and test with temp/in-memory DBs.
- Supports explicit schema, indexes, transactions, FTS.
- Good match for single-operator AMS.

Weaknesses:

- Needs careful migration discipline.
- Not ideal for multi-user cloud concurrency.
- Embedding/vector support may require extensions or sidecar later.

Fit: Strong.

Recommendation: Primary v2 persistence.

### PostgreSQL

Strengths:

- Strong relational constraints and concurrency.
- Better for hosted/multi-user future.
- Mature search/extensions ecosystem.

Weaknesses:

- Operational overhead for local-first single-user development.
- Less convenient for agentic local tests and portable archives.
- Premature for current needs.

Fit: Later only.

Recommendation: Avoid for minimal v2.

### Document DB

Strengths:

- Flexible documents.

Weaknesses:

- Repeats the current generic-payload problem.
- Weakens relational ontology.
- Adds operations overhead without clear benefit.

Fit: Weak.

Recommendation: Avoid.

### Hybrid File + SQLite

Strengths:

- SQLite for queryable state.
- Files for artifacts, docs, fixtures, large outputs, and archives.
- Matches repo workflow and local control.

Weaknesses:

- Needs clear artifact registry and path policies.

Fit: Strongest.

Recommendation: Use.

## Search And Retrieval

### File/Keyword Search

Strengths:

- Already available through repo tools and simple code.
- Very inspectable.
- Good first stage.

Weaknesses:

- Limited ranking and semantic recall.

Recommendation: Keep as baseline.

### SQLite FTS

Strengths:

- Local, simple, source-linkable.
- Fits SQLite and tests.
- Good for tasks, decisions, memory, run summaries, artifact summaries.

Weaknesses:

- Not semantic retrieval.

Recommendation: First v2 retrieval implementation.

### Local Embedding/Vector Search

Strengths:

- Better semantic recall if implemented well.
- Useful for memory and evidence search later.

Weaknesses:

- Adds model/dependency/index freshness complexity.
- Requires evaluation to know whether it helps.

Recommendation: Defer until FTS baseline and retrieval tests exist.

### External Search APIs

Strengths:

- Useful for web research tasks.

Weaknesses:

- Privacy/cost/provider dependency.

Recommendation: Treat as optional tool integrations, not core retrieval.

## Interface Options

### CLI-First

Strengths:

- Best for agentic workflows.
- Easy to test and automate.
- Keeps services honest before UI.

Weaknesses:

- Less ergonomic for human scanning.

Recommendation: Primary first interface.

### Local Web App

Strengths:

- Good for governance, review queues, task scanning, artifact browsing.
- Existing SvelteKit work can inform it.

Weaknesses:

- Can pull architecture into page-first sprawl.

Recommendation: Keep, but build after CLI/service behavior.

### Desktop App

Strengths:

- Could improve local integration later.

Weaknesses:

- Packaging overhead.

Recommendation: Defer.

### Terminal UI

Strengths:

- Local and agent-friendly.

Weaknesses:

- Another UI framework without clear need.

Recommendation: Avoid for now.

### API-First Backend

Strengths:

- Useful for MCP/agent tools and UI.

Weaknesses:

- If designed before services, can become route sprawl.

Recommendation: API adapters around services, not primary architecture.

## Architecture Options

### Modular Monolith

Best fit. Keeps one local deployable with clear modules and shared services.

Recommendation: Use.

### Plugin/Tool Registry

Needed for tools and agent affordances, but should start simple.

Recommendation: Add after core work/run/artifact/service path.

### Event-Sourced / Append-Only Log

Useful for audit and replay, but full event sourcing is probably too heavy.

Recommendation: Use append-only evidence logs selectively; avoid full event sourcing now.

### Traditional CRUD

Useful for simple records, but insufficient for workflows, approvals, and evidence.

Recommendation: Use CRUD only under workflow services.

### Workflow/State-Machine Oriented

Good for task/run/review/approval transitions.

Recommendation: Use lightweight transition functions and tests.

### Knowledge Graph / Ontology-Backed

Conceptually attractive, but high risk of premature complexity.

Recommendation: Keep ontology in docs/types; defer graph DB.

## Model Integration Options

### Direct OpenAI/Codex Calls

Good for current workflows, but creates provider lock-in if treated as core.

Recommendation: Keep as one provider adapter.

### Provider Abstraction

Needed for replacement strategy, routing, evaluation, cost/privacy policy.

Recommendation: Use a small provider interface.

### Ollama / llama.cpp / MLX

Useful for local model experiments.

Recommendation: Defer until evaluation harness can compare local models against real tasks.

## Testing And Development Options

Recommended stack:

- Unit tests for domain transitions.
- Integration tests for SQLite services.
- CLI tests for workflows.
- Migration tests for schema changes.
- Golden-file tests for import/export and work packets.
- Evaluation benchmark tests for agent/model outputs.
- Snapshot/replay tests for agent workflows.
- Type checks, Prettier, ESLint.

Avoid:

- UI-only tests as the main correctness layer.
- Snapshot tests without semantic assertions.
- Evaluation metrics detached from real task outcomes.
