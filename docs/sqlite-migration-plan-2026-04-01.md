# SQLite Migration Plan

Date: 2026-04-01
Project: Agent Management System Prototype
Status: Proposed

## Decision Summary

Use `better-sqlite3` as the app's embedded database driver and migrate the prototype's app-owned JSON stores into a single local SQLite database at `data/app.sqlite`.

Do not write to Codex's own `~/.codex/state_5.sqlite` file. Keep treating that database as external, read-only state owned by the Codex CLI.

Do not start with an ORM. The current codebase already has explicit TypeScript domain types and file-backed repository modules. A small repository layer with raw SQL and explicit migrations is the lowest-risk first move.

## Why This Is The Right Default

This prototype is still a local-first SvelteKit app that runs on one machine, writes small to medium amounts of structured metadata, and already keeps large artifacts on disk. That is a strong fit for embedded SQLite.

`node:sqlite` is not the right dependency to build the app around. Node documents `node:sqlite` as `Stability: 1.1 - Active development`, which is a weak foundation for durable app persistence in a prototype that is already storing operator state over time.

`better-sqlite3` is a better fit for the current architecture because:

- it is a mature, dedicated SQLite package instead of a Node runtime feature that is still actively settling
- it matches the app's existing synchronous, request-local storage pattern well
- it works well for a single-host control plane with short transactions and WAL mode
- it lets the app read Codex's external SQLite file without coupling that behavior to a specific Node release

## When To Reconsider This Recommendation

If the product direction changes from "single local operator app" to "multi-host shared service with concurrent writers across machines," do not spend time adding sync semantics on top of local SQLite. Move straight to Postgres instead.

If the product still wants SQLite locally but also wants optional cloud sync later, revisit `@libsql/client` or Turso after the local SQLite cutover is complete. That is a phase-two infrastructure decision, not a prerequisite for replacing the current stores.

## Current Persistence Inventory

App-owned state is still file-backed JSON:

- [`src/lib/server/control-plane.ts`](/Users/colinfreed/Projects/Experiments/agent-management-system-prototype/src/lib/server/control-plane.ts) writes `data/control-plane.json`
- [`src/lib/server/agent-sessions.ts`](/Users/colinfreed/Projects/Experiments/agent-management-system-prototype/src/lib/server/agent-sessions.ts) writes `data/agent-sessions.json`
- [`src/lib/server/self-improvement-store.ts`](/Users/colinfreed/Projects/Experiments/agent-management-system-prototype/src/lib/server/self-improvement-store.ts) writes `data/self-improvement.json`

SQLite is only used today as a read-only bridge into Codex's local state:

- [`src/lib/server/agent-sessions.ts`](/Users/colinfreed/Projects/Experiments/agent-management-system-prototype/src/lib/server/agent-sessions.ts) imports `DatabaseSync` from `node:sqlite`
- it reads `~/.codex/state_5.sqlite`
- it materializes native Codex threads into the app's session model

The app should keep non-relational payloads on disk:

- run logs under `data/agent-sessions/<sessionId>/runs/<runId>/`
- saved last-message text files
- attachments and artifact files

SQLite should hold metadata, relationships, and indexes for those files, not the file contents themselves.

## Recommended Stack

### Runtime

- package: `better-sqlite3`
- database file: `data/app.sqlite`
- external read-only database: `~/.codex/state_5.sqlite`

### Connection Rules

Apply these PRAGMAs on startup:

- `PRAGMA journal_mode = WAL;`
- `PRAGMA foreign_keys = ON;`
- `PRAGMA busy_timeout = 5000;`
- `PRAGMA synchronous = NORMAL;`

### Code Layout

Add a small database layer:

- `src/lib/server/db/connection.ts`
- `src/lib/server/db/migrate.ts`
- `src/lib/server/db/migrations/*.sql`
- `src/lib/server/db/repositories/*`

Do not let route handlers or higher-level services build ad hoc SQL strings inline. Keep SQL in repository modules so the JSON-to-SQLite cutover stays reviewable.

## Target Data Boundary

The SQLite database should own these app concepts:

- control-plane entities: providers, roles, projects, goals, workers, tasks, runs, reviews, approvals, decisions, planning sessions
- task and session attachment metadata
- app-managed agent sessions and app-managed run metadata
- self-improvement records, signals, and knowledge items

The filesystem should continue to own:

- Codex run logs
- large text artifacts
- uploaded attachments
- generated files under `agent_output` or `data/agent-sessions/*`

## Schema Strategy

Do not try to fully normalize every array field in the first migration. The domain model is still moving.

Use this rule:

- normalize stable many-to-one and many-to-many relationships that the UI already queries by id
- keep volatile list-shaped fields as JSON text columns until the model settles

Reasonable first-pass tables:

- `projects`
- `providers`
- `roles`
- `workers`
- `goals`
- `goal_project_links`
- `tasks`
- `task_attachments`
- `runs`
- `reviews`
- `approvals`
- `decisions`
- `planning_sessions`
- `agent_sessions`
- `agent_session_attachments`
- `agent_runs`
- `self_improvement_records`
- `self_improvement_signals`
- `self_improvement_knowledge_items`
- `schema_migrations`

## Migration Phases

### Phase 0: Remove The `node:sqlite` Dependency

Goal: stop depending on the Node-bundled SQLite module before the app's own data migration begins.

Steps:

1. Add `better-sqlite3`.
2. Create a thin SQLite adapter module for read-only access.
3. Replace the direct `node:sqlite` import in [`src/lib/server/agent-sessions.ts`](/Users/colinfreed/Projects/Experiments/agent-management-system-prototype/src/lib/server/agent-sessions.ts).
4. Keep the Codex database access read-only and defensive.
5. Add tests for:
   - missing `~/.codex/state_5.sqlite`
   - unreadable external SQLite file
   - successful native thread materialization

This phase is intentionally narrow. It removes the runtime risk the user called out without forcing a full persistence rewrite in the same change.

### Phase 1: Add App SQLite Foundations

Goal: introduce the app database and migrations without changing runtime behavior yet.

Steps:

1. Add a migration runner and `schema_migrations` table.
2. Create the initial schema for the three current app stores:
   - control plane
   - agent sessions
   - self-improvement
3. Add repository modules that read and write SQLite.
4. Keep existing JSON stores as the source of truth during this phase.
5. Add a one-shot import command:
   - `npm run db:import-json`

Deliverables:

- fresh boot creates `data/app.sqlite`
- migrations are idempotent
- import succeeds against current local JSON files

### Phase 2: Dual-Write App-Owned Mutations

Goal: de-risk cutover by proving write parity before switching reads.

Steps:

1. On every mutation, write both:
   - SQLite
   - the existing JSON file
2. Keep reads on JSON by default.
3. Add parity tests that compare repository results after write operations.
4. Gate SQLite with an environment variable such as:
   - `APP_STORAGE_BACKEND=json`
   - `APP_STORAGE_BACKEND=sqlite`

This phase makes bugs cheap. You can validate the database shape while keeping the current runtime stable.

### Phase 3: Cut Reads Over To SQLite

Goal: make SQLite the source of truth for app-owned state.

Steps:

1. Switch repository reads to SQLite behind the storage flag.
2. Run the full test suite against the SQLite backend.
3. Verify the core workflows manually:
   - create and update tasks
   - create and update goals
   - launch and inspect runs
   - create follow-up session messages
   - load self-improvement opportunities
4. Keep JSON dual-write enabled for one release window as rollback protection.

### Phase 4: Remove JSON As Live Storage

Goal: finish the migration cleanly.

Steps:

1. Remove JSON writes from the three store modules.
2. Convert the old JSON persistence modules into:
   - import/export helpers, or
   - delete them if no longer useful
3. Keep a manual export command for backup/debugging:
   - `npm run db:export-json`
4. Update README and operator docs so `data/app.sqlite` is the canonical store.

## Acceptance Criteria

The migration is complete when all of these are true:

- the app boots cleanly with only `data/app.sqlite`
- fresh installs create the schema automatically
- existing `data/*.json` files import without data loss
- the session pages still surface native Codex threads from `~/.codex/state_5.sqlite`
- task, goal, run, and self-improvement mutations are transactional
- a crash during a write cannot leave the database half-updated
- the JSON stores are no longer required for normal runtime behavior

## Rollback Plan

Until Phase 4 is complete:

- keep the JSON files intact
- keep JSON export available
- keep the backend choice behind an environment flag
- do not delete the import path

If the SQLite cutover misbehaves, switch `APP_STORAGE_BACKEND` back to `json`, export the failing SQLite file for inspection, and continue running on the existing stores while fixing the repository layer.

## Risks To Watch

- The current domain model uses many arrays and optional nested fields. Over-normalizing too early will slow the migration and create churn.
- The app launches background runners while server routes can update the same metadata. Keep transactions short and enable WAL from the start.
- The app should never mutate Codex's own SQLite database. That file is external state and can change across Codex releases.
- If the product starts needing remote collaboration before this migration finishes, the storage decision should be revisited immediately.

## Suggested Order Of Work

1. Phase 0 in its own small PR.
2. Phase 1 and Phase 2 together if test coverage is good enough.
3. Phase 3 only after a local import has been exercised on realistic data.
4. Phase 4 after one stable iteration on SQLite reads.

## References

- Node.js `node:sqlite` docs: https://nodejs.org/download/release/v24.2.0/docs/api/sqlite.html
- `better-sqlite3` project: https://github.com/WiseLibs/better-sqlite3
- Turso local development notes: https://docs.turso.tech/local-development
- Turso embedded replicas overview: https://docs.turso.tech/features/embedded-replicas
