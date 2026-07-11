# V2 Persistence Boundary v0.1

Date: 2026-07-02
Status: Preview-only persistence boundary

## Decision

During parallel v2 buildout, v2 persistence should use a separate preview SQLite file instead of writing v2 tables into `data/app.sqlite`.

Default preview path:

```text
data/v2-preview.sqlite
```

This is not runtime state for the current AMS prototype. It is an opt-in preview database for validating v2 import, schema, and service behavior before any migration decision.

## Why Separate Preview Storage

The prototype already has a clear runtime-data policy:

- `data/app.sqlite` is the writable source of truth for v1 runtime state.
- JSON files are seed/export/import/recovery snapshots.
- Agents should not patch runtime data files directly.

Using a separate v2 preview database preserves that policy while letting v2 prove its own schema and service boundary. It also avoids mixing experimental v2 tables into the current app database before the model governance questions are settled.

## Implementation Boundary

Current implementation references:

- `scripts/v2-preview-db.ts`
- `src/lib/server/v2-preview-persistence.ts`
- `src/lib/server/v2-preview-persistence.spec.ts`
- `src/lib/server/v2-sqlite-proof.ts`
- `docs/v2_sqlite_schema_proof_v0_1.md`

The preview persistence helper:

- resolves the default v2 preview path as `data/v2-preview.sqlite`
- allows callers to pass an explicit preview DB file
- creates parent directories for the preview DB
- applies the v2 schema proof tables
- loads a validated v2 import draft into the preview DB
- opens an existing preview DB in read-only mode for inspection
- refuses to use `data/app.sqlite`
- refuses a caller-provided path that exactly matches the runtime app DB file

## Guardrails

Do not:

- point v2 preview persistence at `data/app.sqlite`
- add v2 proof tables to existing app migrations yet
- make v2 preview DB loading part of normal app startup
- treat candidate v2 tables as accepted live AMS schema
- rely on preview DB contents as durable user data

Do:

- use the preview DB for import/schema/service experiments
- keep preview loading explicit
- preserve v1 source references during import
- validate drafts before loading them
- keep tests using temp files or in-memory databases

## Preview CLI

Create or replace the local preview database intentionally:

```sh
npm run v2:preview-db -- load-seed --reset
```

Use a non-default preview path:

```sh
npm run v2:preview-db -- load-seed --db /tmp/ams-v2-preview.sqlite --reset
```

The command refuses to load into an existing preview DB unless `--reset` is present. It also refuses any path resolved as `data/app.sqlite`.

Inspect the loaded preview database:

```sh
npm run v2:preview-db -- overview
npm run v2:preview-db -- next-action
npm run v2:preview-db -- inspect --task <task-id>
```

Read commands open the preview database in SQLite read-only mode. They do not create, load, reset, or mutate preview state.

Recommend the next preview action from current task, dependency, review, approval, and run state:

```sh
npm run v2:preview-db -- next-action
npm run v2:preview-db -- next-action --goal <goal-id> --limit 5
```

`next-action` opens the preview database read-only. It prioritizes pending approval gates, review tasks, in-progress tasks, ready unblocked tasks, draft refinement, blocker resolution, and planner fallback without writing records. It returns reasons, blockers, counts by action type, and bounded candidate tasks. It does not launch agents, transition task state, create tasks, complete reviews, approve work, or mutate `data/app.sqlite`.

Create a preview-only task under an existing preview goal:

```sh
npm run v2:preview-db -- create-task --goal <goal-id> --title "..." --summary "..."
```

`create-task` requires an existing preview database, usually created with `load-seed --reset`. Preview-created tasks are marked with `source_system = 'ams-v2-preview'`. They are not imported v1 records and are not written to `data/app.sqlite`.

Move a preview task through the accepted task status lifecycle:

```sh
npm run v2:preview-db -- transition-task --task <task-id> --status in_progress --summary "..."
npm run v2:preview-db -- transition-task --task <task-id> --run <run-id> --status review --summary "..."
```

`transition-task` uses the existing task statuses: `in_draft`, `ready`, `in_progress`, `review`, `blocked`, `done`, and `canceled`. It writes the status change to `v2_tasks` in the preview database and records a linked `v2_decisions` row with `source_system = 'ams-v2-preview'` and `source_collection = 'preview_task_status_transitions'`. It rejects invalid statuses, same-status no-ops, run evidence from another task, and transitions out of terminal `done`/`canceled` states. It does not create a new lifecycle vocabulary, auto-approve work, publish memory, apply artifacts, run tools, route models, or mutate `data/app.sqlite`.

Record a preview-only completed run against an existing preview task:

```sh
npm run v2:preview-db -- record-run --task <task-id> --result "..." --validation "..."
```

`record-run` requires an existing preview database and records task-linked work evidence only. Preview-created runs are marked with `source_system = 'ams-v2-preview'`.

Register an existing local path as a preview-only task or run artifact:

```sh
npm run v2:preview-db -- attach-artifact --task <task-id> --path <path> --role evidence
```

`attach-artifact` requires an existing local path. It may also receive `--run <run-id>` when the artifact should be linked to a specific run. Preview-created artifacts are marked with `source_system = 'ams-v2-preview'`.

Record a preview-only decision against an existing preview task:

```sh
npm run v2:preview-db -- record-decision --task <task-id> --summary "..." --type preview_decision
```

`record-decision` requires an existing preview database and task. It may also receive `--run <run-id>` when the decision should be linked to specific run evidence. Preview-created decisions are marked with `source_system = 'ams-v2-preview'`.

Read a compact task context packet for agent work:

```sh
npm run v2:preview-db -- work-packet --task <task-id>
```

`work-packet` opens the preview database read-only. It returns project, goal, task readiness, requirements, dependencies, runs, artifacts, reviews, approvals, decisions, and a provenance summary. Use `--json` when an agent or script needs structured output.

Read a task vertical-slice report:

```sh
npm run v2:preview-db -- vertical-report --task <task-id> --query "sqlite runtime"
```

`vertical-report` opens the preview database read-only. It composes the existing work-packet context into a task-level report with linked record counts, latest linked record ids, provenance counts, and optional search samples when `--query` is provided. It is a read model, not a domain entity. If the search index has not been rebuilt, the report surfaces that as search metadata instead of blocking the rest of the report.

Open the read-only local inspection page:

```text
/app/v2-preview
```

The page opens the default preview database in SQLite read-only mode for inspection. It displays overview metrics, task selection, task detail, work-packet readiness, vertical-report counts, provenance, status counts, and optional search samples from the same read services used by the CLI. It does not create the preview DB when missing, rebuild indexes, launch agents, run tools, or migrate runtime data.

The page also shows the read-only next-action recommendation for the selected task's goal. This uses the same preview selector as `npm run v2:preview-db -- next-action` and displays the recommended action, reasons, blockers, and bounded candidates. It does not transition task state, create tasks, approve work, complete reviews, launch agents, run tools, route models, or migrate runtime data.

The page also exposes guarded preview write actions for recording a review or decision for the selected task. These actions use the existing preview governance service and write only to the configured v2 preview DB with `ams-v2-preview` provenance. They require explicit form submissions and non-empty summaries. They do not complete tasks, change task state, approve work, publish memory, apply changes, rebuild search, run tools, launch agents, or migrate runtime data.

For tests or explicit local inspection against another preview database, the route may be pointed at a different preview DB with:

```sh
AMS_V2_PREVIEW_DB_FILE=/tmp/ams-v2-preview.sqlite npm run dev
```

The override is server-side only and still goes through the preview DB guardrail that refuses `data/app.sqlite`.

Rebuild and query the local preview search index:

```sh
npm run v2:preview-db -- index-search
npm run v2:preview-db -- search --query "sqlite runtime"
```

`index-search` explicitly rebuilds a local SQLite FTS index over task, run, decision, and artifact metadata in the preview database. `search` opens the preview database read-only and returns record type, record id, task id, source system, title, snippet, and rank. This slice does not index artifact file contents, create embeddings, or call external search APIs.

Register a preview-only tool affordance and log tool use without launching it:

```sh
npm run v2:preview-db -- register-tool --name npm --description "Node package script runner"
npm run v2:preview-db -- record-tool-execution --task <task-id> --tool <tool-id> --summary "..."
```

`register-tool` and `record-tool-execution` write only to preview tables named `v2_preview_tools` and `v2_preview_tool_executions`. These records are experimental and governed by `docs/model-change-proposals/0001-preview-tool-registry-and-execution-log.md`. They record affordances and evidence; they do not execute commands or call external tools.

Register a preview-only evaluation scenario and record evaluation evidence:

```sh
npm run v2:preview-db -- register-eval-scenario --title "Work packet contains provenance"
npm run v2:preview-db -- record-eval-result --scenario <scenario-id> --task <task-id> --summary "..." --score 1
```

`register-eval-scenario` and `record-eval-result` write only to preview tables named `v2_preview_evaluation_scenarios` and `v2_preview_evaluation_results`. These records are experimental and governed by `docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md`. They record evaluation evidence; they do not run benchmarks, choose providers, route models, or retire dependencies.

Record preview-only provider/model routing rationale:

```sh
npm run v2:preview-db -- record-routing-decision --task <task-id> --provider local --model local-coder --summary "..."
```

`record-routing-decision` writes only to a preview table named `v2_preview_routing_decisions`. These records are experimental and governed by `docs/model-change-proposals/0003-preview-routing-decision.md` plus `docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md`. They record why a provider/model route was selected or proposed; they do not call providers, execute models, enforce policy, become production schema, or replace the accepted `Decision` log.

Record preview-only external-AI dependency reduction status:

```sh
npm run v2:preview-db -- record-dependency-reduction --capability context-assembly --external-affordance "ChatGPT project recap" --replacement-status local_assisted --evidence "..."
```

`record-dependency-reduction` writes only to a preview table named `v2_preview_dependency_reduction_records`. These records are experimental and governed by `docs/model-change-proposals/0004-preview-dependency-reduction-record.md` plus `docs/model-decisions/2026-07-03-keep-dependency-reduction-record-experimental.md`. They record replacement status and evidence; they do not become production schema, retire providers, enforce routing policy, or claim production capability readiness.

Record preview-only governed memory:

```sh
npm run v2:preview-db -- record-memory-item --task <task-id> --title "Preview DB boundary" --body "..." --status proposed
```

`record-memory-item` writes only to a preview table named `v2_preview_memory_items`. `MemoryItem` is an accepted minimal concept, but these records remain preview storage governed by `docs/model-change-proposals/0005-preview-memory-item.md`. They record reusable local knowledge with lifecycle status and source evidence; they do not publish trusted memory automatically, migrate project memory prose, define final retrieval policy, or create production schema.

Record preview-created governance evidence:

```sh
npm run v2:preview-db -- record-review --task <task-id> --summary "..."
npm run v2:preview-db -- record-approval --task <task-id> --mode before_apply --summary "..."
```

`record-review` and `record-approval` write to the existing preview proof tables `v2_reviews` and `v2_approvals` with `ams-v2-preview` provenance. These commands are governed by `docs/model-change-proposals/0006-preview-review-approval-recording.md`. They record governance evidence; they do not complete tasks, publish memory, apply changes, run tools, or enforce routing policy.

## Current Preview Tables

The preview DB currently contains the proof tables listed in `docs/v2_sqlite_schema_proof_v0_1.md`, all prefixed with `v2_`.

These names are implementation candidates, not accepted production names.

## Open Decisions

Before v2 persistence becomes real runtime storage, decide:

- whether v2 remains in a separate database through the whole parallel buildout
- whether v2 eventually migrates into `data/app.sqlite`, a new `data/v2.sqlite`, or another storage boundary
- whether preview data should be ignored, backed up, exported, or deleted by maintenance scripts
- whether v2 schema migrations should use the existing migration runner or a separate v2 migration runner
- whether a CLI command should create/load/reset preview DBs, and what safety prompts it needs
- how model-governance approval maps candidate tables into accepted domain model docs

## Validation

Focused validation command:

```sh
npx vitest run src/lib/server/v2-preview-persistence.spec.ts --project server
```

Current result:

- 4 tests passing
- temp preview DB files only
- explicit refusal to use `data/app.sqlite`
