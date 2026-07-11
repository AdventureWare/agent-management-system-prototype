# V2 Preview Governance Console Smoke v0.1

Date: 2026-07-03
Status: Smoke procedure for the isolated v2 preview console

## Purpose

Verify that the v2 preview governance console can inspect one task end to end without becoming the runtime system.

This smoke flow proves:

- a seeded v2 preview DB can be loaded from v1 evidence
- the local SQLite FTS search index can be built
- `/app/v2-preview` can inspect a selected task
- the console shows preview health, overview, work packet fields, agent handoff packet, evidence timeline, grouped search, provenance, and vertical report counts
- the console can record only accepted governance writes: review and decision
- the flow does not write to `data/app.sqlite`
- the flow does not launch agents or tools

## Boundary

Use an explicit temp preview DB for this smoke run:

```sh
export AMS_V2_SMOKE_DB=/tmp/ams-v2-preview-smoke.sqlite
```

The `--reset` command below deletes only that explicit smoke DB path before reseeding. Do not point `AMS_V2_SMOKE_DB` at `data/app.sqlite`.

## 1. Load Seed

```sh
npm run v2:preview-db -- load-seed --db "$AMS_V2_SMOKE_DB" --reset
```

Expected:

- command succeeds
- output identifies the imported preview project/goal/task counts
- no runtime v1 database is modified

## 2. Build Search Index

```sh
npm run v2:preview-db -- index-search --db "$AMS_V2_SMOKE_DB"
```

Expected:

- command succeeds
- output reports indexed preview records

## 3. Pick A Task

Use the current seed task known to exercise task, run, review, approval, decision, artifact, provenance, and search paths:

```sh
export AMS_V2_SMOKE_TASK=task_make_sqlite_runtime_store_single_source_of_truth
```

Optional CLI readback:

```sh
npm run v2:preview-db -- inspect --db "$AMS_V2_SMOKE_DB" --task "$AMS_V2_SMOKE_TASK"
npm run v2:preview-db -- work-packet --db "$AMS_V2_SMOKE_DB" --task "$AMS_V2_SMOKE_TASK"
npm run v2:preview-db -- vertical-report --db "$AMS_V2_SMOKE_DB" --task "$AMS_V2_SMOKE_TASK" --query "sqlite runtime"
```

Expected:

- task detail loads
- work packet includes readiness, requirements, evidence, governance, and provenance
- vertical report includes counts, latest records, and search results

## 4. Open The Preview Console

Start the local app against the smoke DB:

```sh
AMS_V2_PREVIEW_DB_FILE="$AMS_V2_SMOKE_DB" npm run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173/app/v2-preview?task=task_make_sqlite_runtime_store_single_source_of_truth&query=sqlite%20runtime
```

Expected:

- unauthenticated sessions redirect to login
- authenticated sessions show the v2 preview page
- preview health shows the smoke DB path
- search index status is ready
- source counts show imported and preview provenance

## 5. Inspect The Selected Task

On `/app/v2-preview`, confirm the page shows:

- overview metrics
- selected task detail
- work-packet readiness, autonomy, approval mode, capabilities, tools, and skills
- vertical report counts
- provenance summary
- agent handoff packet
- evidence timeline with category filters
- grouped search results by task and record type

Expected:

- inspection works without creating storage
- the agent handoff packet is copyable
- timeline filters change the visible evidence records
- search results remain linked to task/record type

## 6. Record A Preview Review

Use the `Record preview review` form for the selected task.

Suggested smoke summary:

```text
Smoke review: v2 preview console can inspect the selected task from the isolated smoke DB.
```

Expected:

- form submission succeeds
- page reports the recorded preview review
- governance review count increases after refresh
- latest review id updates
- task status is not completed or otherwise changed by the review

## 7. Record A Preview Decision

Use the `Record preview decision` form for the selected task.

Suggested smoke summary:

```text
Smoke decision: continue using the v2 preview governance console as the inspection surface for this milestone.
```

Expected:

- form submission succeeds
- page reports the recorded preview decision
- governance decision count increases after refresh
- latest decision id updates
- task status is not changed by the decision

## 8. Verify From CLI

```sh
npm run v2:preview-db -- vertical-report --db "$AMS_V2_SMOKE_DB" --task "$AMS_V2_SMOKE_TASK" --query "sqlite runtime"
```

Expected:

- report still loads
- review and decision counts include the smoke records
- provenance includes `ams-v2-preview`
- search still works

## 9. Stop Condition

The smoke passes when:

- seed load succeeds
- search index builds
- UI opens against the explicit smoke DB
- selected task can be inspected
- preview health, handoff packet, evidence timeline, grouped search, provenance, and vertical report are visible
- one preview review can be recorded
- one preview decision can be recorded
- CLI verification shows the new governance records

The smoke fails if:

- `data/app.sqlite` is modified
- the page creates a preview DB implicitly
- the page launches an agent or tool
- review or decision changes task state
- search-index absence blocks non-search task inspection
