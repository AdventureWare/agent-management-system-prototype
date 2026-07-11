# Recommended Stack v0.1

Date: 2026-07-02
Status: Assessment recommendation

## Recommendation

Build v2 as a local-first TypeScript/Node modular monolith with explicit SQLite schema, local file artifacts, CLI-first application services, and a later SvelteKit operator UI. Preserve the prototype as v1 and migrate selectively through tested import adapters.

This is a stack refinement, not a wholesale language/framework rewrite.

## A. Minimal V2 Stack

### Runtime And Language

- TypeScript.
- Node.js.
- npm scripts.

Reason:

- Matches the current repo.
- Supports shared CLI/API/UI/domain types.
- Easy for Codex and local agents to inspect and edit.
- Avoids splitting the domain model across languages.

### Persistence

- SQLite with explicit relational tables for v2 core records.
- Separate preview/v2 database during parallel buildout.
- JSON import/export fixtures for migration tests.
- Local filesystem for artifacts, with DB registry records.

Reason:

- Local-first, cheap, inspectable, testable.
- Supports constraints and cross-record queries.
- Avoids current generic payload-table limitations.

### Architecture

- Modular monolith.
- Domain modules plus application services.
- CLI/API/UI/MCP as adapters.
- Explicit import adapter from v1.

Initial modules:

- Work/project/goal/task.
- Execution/session/run.
- Governance/review/approval/decision.
- Artifact registry.
- Provider/model routing contracts.
- Retrieval baseline.
- Evaluation records.
- Migration/import.

### Interface

- CLI-first.
- Minimal local web UI only after service behavior is proven.
- API/MCP adapters around the same services.

### Search/Retrieval

- Start with SQLite FTS and source-linked keyword retrieval.
- Keep `rg`/file search as baseline.
- Defer embeddings until retrieval tests show the need.

### Model Integration

- Provider abstraction.
- Codex/OpenAI as external provider adapters.
- Local-model adapters deferred until evaluation harness exists.

### Testing

- Vitest for domain/service/read-model/migration tests.
- `svelte-check`.
- Prettier/ESLint.
- Golden fixture tests.
- CLI smoke tests.
- Later: evaluation benchmark tests and workflow replay tests.

## B. Medium-Term Stack

Add when the minimal slice proves value:

- SQLite FTS retrieval tables.
- Tool registry and tool execution logs.
- Memory proposal/review/publish tables.
- Provider routing policy table.
- Evaluation scenario/result tables.
- Local model provider adapters for Ollama, llama.cpp, or MLX.
- Optional Python sidecar scripts for retrieval/model evaluation experiments, behind file/CLI boundaries.
- Minimal SvelteKit v2 UI for queue, task detail, review/approval, artifacts, evaluations.

## C. Avoid For Now

- PostgreSQL.
- Document DB.
- Full event sourcing.
- Knowledge graph database.
- Distributed workers/queues.
- Multi-agent scheduler.
- Desktop app packaging.
- Full UI parity with v1.
- Embedding/vector infrastructure before retrieval baselines.
- Provider-specific architecture.
- Python rewrite of the core domain.

## D. Defer Until Evidence Shows Need

- Local LLM hosting as a managed runtime.
- Semantic vector retrieval.
- Cloud deployment.
- Multi-user auth/collaboration.
- Plugin marketplace.
- Complex policy engine.
- Fine-grained RBAC.
- Real-time collaboration.

## What This Preserves From The Prototype

- TypeScript/Node/SvelteKit familiarity.
- SQLite local-first direction.
- CLI/API/MCP agent affordance pattern.
- Existing domain learning.
- Tests and docs-as-code.
- Runtime data policy.
- Existing v1 data as migration evidence.
- Managed thread/run lessons.

## What It Intentionally Abandons

- Generic JSON payload tables as the v2 core schema.
- Page-first architecture.
- Treating `Task` as the catch-all entity.
- Prose/path-only artifacts and memory.
- Tool/capability strings as the final model.
- Full v1 UI breadth as a v2 entry criterion.

## What Should Be Migrated

- Selected projects/goals/tasks/runs/reviews/approvals/decisions.
- Source references and original v1 IDs.
- Artifact path references into an artifact registry.
- Provider/execution-surface metadata.
- Useful task readiness/autonomy/review fields.
- Agent thread/session references after boundary decisions.

## What Should Be Archived

- Full v1 SQLite/JSON snapshots.
- Agent thread directories and logs.
- Historical run output.
- Old UI behavior as reference, not as required v2 parity.

## What Should Be Rebuilt

- v2 explicit schema.
- Work/session/run/tool/artifact/memory/evaluation services.
- Provider routing and evaluation loop.
- Retrieval index.
- Minimal v2 CLI.
- Minimal v2 UI.

## Unknowns To Test

- Whether SQLite FTS is enough for local retrieval.
- Whether local models can replace specific Codex/ChatGPT affordances.
- Best boundary between `WorkSession`, external thread, process run, and task `Run`.
- How much v1 historical data is worth importing.
- Whether v2 should remain separate DB or eventually merge into app DB.
- How to structure model/provider evaluation rubrics.

## Final Stack Decision

Use TypeScript + Node + SQLite + local files + CLI-first modular monolith. Keep SvelteKit for optional operator UI. Add Python/local-model/vector tooling only after evaluation evidence justifies it.
