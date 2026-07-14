# V2 Full V1 SQLite Import v0.1

Date: 2026-07-14

## Purpose

Finish importing the remaining AMS v1 runtime material into AMS v2 core so cleanup can happen inside v2 instead of leaving part of the prototype stranded in `data/app.sqlite`.

## Source

- Source database: `data/app.sqlite`
- Source table: `control_plane_records`
- Destination database: `data/v2-core.sqlite`
- Import script: `scripts/v1-sqlite-full-import.ts`

V1 was not mutated.

## Imported Source Counts

- Projects: 19
- Goals: 57
- Tasks: 526
- Runs: 506
- Reviews: 882
- Decisions: 1452
- Providers: 3

## Write Result

Created in v2:

- Projects: 18
- Providers: 2
- Goals: 37
- Generated unscoped-work holding goals: 14
- Tasks: 424
- Task dependencies: 71
- Runs: 425
- Artifacts: 1730
- Reviews: 777
- Decisions: 1285

Skipped as already present:

- Providers: 1
- Projects: 2
- Goals: 20
- Tasks: 102
- Task dependencies: 55
- Runs: 81
- Artifacts: 86
- Reviews: 105
- Decisions: 167

## Idempotence Check

After the write, rerunning the importer in dry-run mode reported no new records to create.

It reported existing v1 coverage:

- Projects: 20, including the generated unassigned project container
- Providers: 3
- Goals: 57
- Generated unscoped-work holding goals: 14
- Tasks: 526
- Task dependencies: 126
- Runs: 506
- Artifacts: 1816
- Reviews: 882
- Decisions: 1452

## V2 Readback Counts After Import

- Projects: 22
- Goals: 101
- Tasks: 754
- Runs: 739
- Artifacts: 2087
- Reviews: 1126
- Decisions: 2550
- Source references: 7818

Task statuses after import:

- Done: 671
- Canceled: 42
- Ready: 26
- Review: 14
- Draft: 1

Goal statuses after import:

- Active: 57
- Completed: 30
- Paused: 12
- Superseded: 2

## Cleanup Notes

This import intentionally favors completion over perfect curation.

Cleanup now needs to happen in v2:

- Review the 14 generated `Imported unscoped v1 work` holding goals.
- Move useful unscoped tasks to real goals.
- Archive stale imported tasks/goals.
- Resolve review-state imported tasks that are historical residue rather than live review work.
- Decide whether deferred roles, workflows, workflow steps, task templates, approvals, and execution surfaces should be translated, archived, or rebuilt in v2.

Deferred v1 collections not translated into v2 core entities:

- Approvals: 10
- Roles: 46
- Workflows: 4
- Workflow steps: 20
- Task templates: 3
- Execution surfaces: 1

## Validation

- Full importer write completed successfully.
- Post-write dry-run produced no new projects/goals/tasks/runs/reviews/decisions to create.
- Direct SQLite readback confirmed enlarged v2 counts.
- `npm run v2:core-db -- next-work --json` returned imported ready/review work candidates.
