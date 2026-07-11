# Current Stack Audit v0.1

Date: 2026-07-02
Status: Assessment draft
Scope: Stack, tooling, and development-process audit for the current AMS prototype. This document does not authorize a rewrite or runtime migration.

## Summary

The current prototype is a local-first TypeScript/SvelteKit application with SQLite-backed generic record stores, a broad operator UI, agent-facing APIs, CLI scripts, a repo-local MCP bridge, and extensive Vitest coverage. It is optimized for rapid iteration around Codex-managed tasks, human review, and local operator workflows.

The stack is not obviously wrong. TypeScript, Node, SvelteKit, SQLite, Vitest, and docs-as-code are a reasonable foundation for an owned agent system. The main stack problem is not the language or framework; it is that the prototype architecture used generic payload persistence and page/API-specific helper growth to move quickly. That makes the current codebase useful as evidence but risky as the direct core for a broader owned-agent operating layer.

## Sources Inspected

- `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `.githooks/pre-commit`.
- `src/routes`, `src/lib/server`, `src/lib/client`, `src/lib/components`, `src/lib/types`.
- `scripts/`, including app server, DB, CLI, thread runner, MCP bridge, v2 preview scripts.
- `src/lib/server/db/migrations/*.sql`.
- Current v2/prototype docs in `docs/`.
- Runtime policy in `docs/runtime-data-policy.md`.
- Current data snapshots under `data/*.json`.

## Current Language And Runtime

- Primary language: TypeScript.
- Runtime: Node.js ESM project.
- Some scripts are `.mjs`; new preview CLI uses Node TypeScript stripping.
- Svelte components make the UI layer TypeScript/Svelte.
- Small amount of JavaScript remains in generated/static command modules.

Assessment:

- TypeScript is a good fit for explicit domain contracts, CLI/API/UI sharing, and agent-readable code.
- The mixed `.mjs` plus `.ts` script pattern is workable but should be simplified for v2.
- Python is not currently part of the repo stack.

## Current Frameworks

- SvelteKit for local web app, routes, server handlers, and Svelte UI.
- Vite as build/dev server.
- Tailwind CSS and Skeleton UI packages.
- Playwright is configured for e2e/browser testing.

Assessment:

- SvelteKit is useful for a local operator UI and API routes.
- The current app has many route-specific surfaces; v2 should avoid treating page routes as the main architecture.
- UI framework choices are not the bottleneck. The domain/service/storage boundaries are.

## Current Storage And File Formats

Runtime source of truth:

- `data/app.sqlite`.

SQLite schema:

- `control_plane_records(collection, id, position, payload)`
- `agent_thread_records(collection, id, position, payload)`
- `self_improvement_entries(collection, id, position, payload)`
- `store_revisions(store_name, revision, updated_at)`

Snapshots/recovery:

- `data/control-plane.json`
- `data/agent-threads.json`
- `data/self-improvement.json`

Generated/local runtime:

- `data/agent-threads/`
- `agent_output/`
- Playwright/debug artifacts.

Assessment:

- SQLite is the right local-first persistence base.
- Generic JSON payload tables were good for prototype velocity but weak for v2 queryability, relational constraints, migration, retrieval, reporting, and evaluation.
- JSON snapshots remain valuable for export/import/archival.

## Current Data Model

Core control-plane types in `src/lib/types/control-plane.ts`:

- `Project`
- `Goal`
- `Task`
- `Run`
- `Review`
- `Approval`
- `Decision`
- `PlanningSession`
- `Workflow`
- `WorkflowStep`
- `TaskTemplate`
- `Role`
- `Provider`
- `ExecutionSurface`

Adjacent models:

- `AgentThread`, `AgentRun`, `AgentThreadContact` in `src/lib/types/agent-thread.ts`.
- Self-improvement records and signals in `src/lib/types/self-improvement.ts`.
- Artifact browser/file entries in `src/lib/types/artifacts.ts`.

Current snapshot counts:

| Collection                   | Count |
| ---------------------------- | ----: |
| providers                    |     3 |
| roles                        |    46 |
| projects                     |    17 |
| goals                        |    21 |
| workflows                    |     4 |
| workflowSteps                |    20 |
| taskTemplates                |     3 |
| executionSurfaces            |     1 |
| tasks                        |   397 |
| runs                         |   428 |
| reviews                      |   777 |
| approvals                    |     9 |
| planningSessions             |     0 |
| decisions                    |  1136 |
| agent threads                |   482 |
| agent-thread runs            |  3450 |
| self-improvement records     |   294 |
| self-improvement impressions |   433 |

Assessment:

- The core work-state ontology is useful.
- `Task` has absorbed too many concerns.
- `Run` and `AgentRun` boundaries are not crisp enough.
- Tools, artifacts, memory, retrieval, evaluations, and model routing need first-class records in v2.

## Current Interfaces

Human UI:

- Local SvelteKit app under `/app`.
- Pages for tasks, goals, projects, runs, threads, governance, planning, workflows, task templates, roles, providers, skills, artifacts, execution surfaces, access, and agent use.

Agent/API:

- `/api/agent-capabilities`
- `/api/agent-context/*`
- `/api/agent-goal-loop/[command]`
- `/api/agent-work-packets/[command]`
- `/api/agent-run-results/[command]`
- `/api/agent-reviews/[command]`
- `/api/tasks/*`, `/api/goals/*`, `/api/projects/*`, `/api/runs/*`
- `/api/agents/threads/*`

CLI/scripts:

- `scripts/ams-cli.mjs`
- `scripts/agent-thread-cli.mjs`
- `scripts/agent-thread-runner.mjs`
- `scripts/ams-control-plane-mcp.mjs`
- `scripts/app-db.mjs`
- `scripts/operator-server.mjs`
- v2 preview/import scripts.

Assessment:

- CLI/API/MCP affordances are a real strength.
- v2 should make CLI/service behavior primary before recreating the full UI.
- Existing UI is useful as reference, but v2 should not copy every page.

## Testing Setup

- Vitest server and browser/Svelte component tests.
- Playwright e2e configured.
- `svelte-check`.
- ESLint and Prettier.
- 456 source-ish files under `src`.
- 145 test/spec files under `src`.
- Existing tests cover storage, route data, page components, thread recovery, goal loop, agent API, artifact APIs, self-improvement, CLI/MCP manifest behavior, and v2 preview proof.

Assessment:

- Test culture is strong and worth preserving.
- Tests are sometimes feature/page-specific; v2 needs more domain/service/migration/evaluation tests.
- Golden scenario and replay tests should become first-class.

## Build And Dev Tooling

- `npm` scripts.
- Vite/SvelteKit dev/build.
- `npm run check`.
- `npm run test:unit`, `npm run test:e2e`.
- `npm run db:migrate`, `db:export-json`, `db:import-json`.
- App server scripts and launchd helper.
- Pre-commit guard blocks obvious generated artifacts.

Assessment:

- Tooling is simple enough and local.
- Node/SvelteKit/Vitest remain good agentic-coding targets.
- v2 should reduce script-format inconsistency and make preview/import commands explicit and documented.

## Dependency Management

- npm package management.
- Small runtime dependency set: notably `better-sqlite3` and UI icon package.
- Larger dev dependency set for SvelteKit, Vitest, Playwright, ESLint, Prettier, Tailwind, Skeleton.

Assessment:

- Runtime dependency footprint is reasonably small.
- UI/tooling dependencies are heavier than the core domain needs.
- v2 core should be able to run and test without depending on browser UI.

## Logging, State, Sessions, And Memory

- Agent thread state persisted in SQLite plus JSON snapshots and per-thread directories.
- Run records capture status, summaries, model metadata, token usage, and cost fields.
- Self-improvement store captures records, signals, impressions, and decisions.
- Project memory exists as fields/prose on `Project`.
- Decision records are first-class, but project `decisionLog` prose also exists.

Assessment:

- Session/run evidence capture is valuable.
- Memory governance is fragmented.
- v2 should separate `WorkSession`, `Run`, `ToolExecution`, `MemoryItem`, and `Decision` more clearly.

## Model Provider And AI Integration

Current support:

- `Provider` and `ExecutionSurface` records.
- Local Codex launcher/thread runner.
- Codex state DB inspection.
- Model selection helpers and run model provenance.
- Token usage and cost fields.
- Agent capability manifest and MCP bridge.

Assessment:

- Good starting affordance for external AI orchestration.
- Not yet a provider-routing system.
- Local/open model support is not implemented as a first-class path.
- v2 should make provider abstraction explicit but keep concrete integrations minimal at first.

## File And Artifact Handling

Current support:

- Project roots and writable roots.
- Task artifact paths.
- Task attachments.
- Run artifact paths.
- Artifact browser APIs.
- Thread attachments.
- Agent output directories.

Assessment:

- The system can inspect files and manage paths, but it lacks a central artifact registry.
- Artifact provenance is too implicit.
- v2 should make artifacts first-class records with source references and roles.

## Useful Parts To Preserve

- TypeScript domain contracts and tests.
- SvelteKit local operator UI as a reference and optional UI path.
- SQLite local-first runtime direction.
- CLI/API/MCP structured agent affordance pattern.
- `Project`, `Goal`, `Task`, `Run`, `Review`, `Approval`, `Decision`, `Provider`, `ExecutionSurface`.
- Runtime data policy.
- Model governance docs.
- Existing operational data and v1 import-preview fixtures.
- Managed Codex thread lessons.
- Agent capability manifest and reliable-loop guidance.

## Accidental Complexity And Risks

- Generic payload persistence hides relationships from SQLite.
- Page/API/helper sprawl makes architectural boundaries hard to see.
- `Task` is overloaded.
- `Run`, `AgentRun`, `AgentThread`, and external thread IDs overlap.
- Tool/capability/skill requirements are mostly strings.
- Artifacts and memory are split across fields, prose, paths, and directories.
- Retrieval is not yet a general, source-linked subsystem.
- UI breadth may pull v2 into recreating surfaces before the core proves itself.

## Risk If We Keep Building Directly On V1

- More concepts become fields on `Task`.
- Model-provider routing, evaluations, retrieval, and memory governance become scattered helper logic.
- Schema migration stays mostly application-normalization work instead of database-level constraints.
- External AI dependency reduction remains telemetry rather than a governed capability roadmap.
- Agents will have to inspect more files and infer more boundaries, increasing repeated rework and bloat.

## Audit Conclusion

Keep the current stack family, but do not keep the current architecture unchanged. The best path is not a language/framework rewrite. It is a parallel v2 core using TypeScript, SQLite, CLI-first services, explicit schema, and staged UI reuse.
