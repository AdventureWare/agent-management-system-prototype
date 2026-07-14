# Silver Oak Completed Task Evidence Import v0.1

Date: 2026-07-14

## Purpose

Import appropriate completed task evidence from the AMS v1 Silver Oak project
into AMS v2 without importing canceled control-loop residue, unscoped recovery
tasks, or open work as active tasks.

This is a historical evidence import, not a work-queue import.

## Source

- Source system: AMS v1 runtime SQLite
- Source DB: `data/app.sqlite`
- Source table: `control_plane_records`
- Source project: `project_aec29994-53d4-4367-a1c1-1ea5a9c81a2c`
- Target DB: `data/v2-core.sqlite`

## Import Command

Dry run:

```sh
node --experimental-strip-types scripts/v1-silver-oak-task-evidence-import.ts --json
```

Write:

```sh
node --experimental-strip-types scripts/v1-silver-oak-task-evidence-import.ts --write --json
```

## Classification

| Category | Count | Handling |
| --- | ---: | --- |
| Total Silver Oak v1 project tasks | 55 | Classified |
| Done tasks | 23 | Reviewed for import eligibility |
| Done, goal-linked, non-continuation tasks | 20 | Imported as historical evidence |
| Attachment artifacts from imported tasks | 26 | Imported as accepted evidence artifacts |
| Done continuation-control tasks | 1 | Skipped |
| Done unscoped/manual recovery tasks | 2 | Skipped pending manual mapping |
| Ready/review/open tasks | 3 | Skipped; not historical evidence |
| Canceled tasks | 29 | Skipped |

## Records Created

The write created:

| V2 record type | Count |
| --- | ---: |
| Historical tasks | 20 |
| Synthetic import runs | 20 |
| Evidence artifacts | 26 |
| Approved reviews | 20 |
| Import decisions | 20 |
| Total records | 106 |

The imported task IDs preserve the v1 task IDs. Each imported task has:

- a `done` v2 task record;
- a source reference to the v1 task record;
- a synthetic completed run recording the import action;
- accepted evidence artifacts for v1 attachments;
- an approved review documenting the import classification;
- an `import_historical_task_evidence` decision.

## Explicitly Skipped

Skipped because they should not become v2 work or accepted historical task
evidence without further review:

- `task_5fa9ee0d-8d71-4bbf-ac45-d0fe6df98778` - completed continuation-control task.
- `task_91417697-7386-4fcd-aa91-a7d3a18ddebe` - completed but unscoped/manual recovery task.
- `task_fe531d36-bf83-4a64-9617-b67a02049fca` - completed but unscoped/manual recovery task.
- 3 ready/review tasks, because they are not completed historical evidence.
- 29 canceled tasks, including canceled continuation residue.

## Validation

- Dry run classified the source task set before writing.
- Write created 106 records in `data/v2-core.sqlite`.
- A second write run created 0 records and skipped the 20 existing imported
  task records, confirming idempotency at the task level.
- Imported records do not create new ready work.
- The Silver Oak operator console now shows historical task evidence as done
  work and keeps the next executable Silver Oak task as
  `task_v2_silver_oak_select_next_source_backed_modeling_pass`.

## Remaining Import Work

- Reconcile the 3 open/review Silver Oak tasks separately if their work is still
  relevant.
- Manually inspect the 2 unscoped/manual recovery tasks before mapping or
  archiving them.
- Do not import canceled continuation residue.
- Continue the broader v1-to-v2 reconciliation with the Superstructure goals
  before touching lower-confidence personal/business/game/challenge goals.
