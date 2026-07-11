# V2 SQLite Schema Proof v0.1

Date: 2026-07-02
Status: Test-only schema proof

## Purpose

This document records the first executable proof that the v2 draft import contract can fit a relational SQLite shape. It is not a runtime migration, not a production schema, and not authorization to write v2 records into `data/app.sqlite`.

Current implementation references:

- Schema/load proof: `src/lib/server/v2-sqlite-proof.ts`
- Preview persistence boundary: `src/lib/server/v2-preview-persistence.ts`
- Tests: `src/lib/server/v2-sqlite-proof.spec.ts`
- Draft mapper: `src/lib/server/v2-import-mapper.ts`
- Draft validator: `src/lib/server/v2-import-draft-validator.ts`
- Seed fixture: `src/lib/server/fixtures/v2-ams-useful-prototype-slice.json`
- Persistence decision: `docs/v2_persistence_boundary_v0_1.md`

## What It Proves

The AMS seed slice can load into an isolated in-memory SQLite database after passing the draft validator.

Loaded domain counts:

- 1 project
- 1 goal
- 34 tasks
- 10 task dependencies
- 33 work-session candidates
- 37 runs
- 51 reviews
- 8 approvals
- 86 decisions
- 38 artifact candidates
- 111 artifact source references
- 299 v1 import-source references

The proof also shows:

- required project, goal, task, run, review, approval, decision, and artifact relationships can be enforced with SQLite foreign keys
- v1 source references can be preserved outside domain rows in `v2_import_sources`
- artifact source references can preserve many-to-one v1 path provenance
- candidate capabilities, tools, and skills can stay separate from accepted registry tables
- v1 work-session/thread references can be loaded without collapsing `agentThreadId` and `threadId` too early

## Proposed Proof Tables

The proof currently uses `v2_`-prefixed tables:

- `v2_projects`
- `v2_project_root_paths`
- `v2_project_memory_sources`
- `v2_goals`
- `v2_tasks`
- `v2_task_candidate_requirements`
- `v2_task_dependencies`
- `v2_work_sessions`
- `v2_work_session_tasks`
- `v2_runs`
- `v2_work_session_runs`
- `v2_reviews`
- `v2_approvals`
- `v2_decisions`
- `v2_artifacts`
- `v2_artifact_source_references`
- `v2_import_sources`

## Intentional Constraints

The schema proof enforces:

- every imported task belongs to an imported project and goal
- every resolved dependency points to imported tasks
- every run points to an imported task
- every run-linked review or approval points to an imported run
- every decision points only to imported task, goal, run, review, or approval records
- every artifact points to an imported project and, when present, imported task/run records

## Intentional Looseness

Some v1 links are preserved but not foreign-key enforced in the seed slice:

- `Goal.parentGoalId`
- `Task.parentTaskId`

Reason: the selected seed slice can include child records whose parent is outside the slice. Enforcing those optional parent links would make partial imports fail before the importer has a parent-resolution policy.

## Not Yet Runtime Schema

Do not point this proof at `data/app.sqlite`. Preview persistence is allowed only through the separate boundary documented in `docs/v2_persistence_boundary_v0_1.md`.

Before this becomes a real v2 migration, AMS still needs decisions on:

- whether v2 lives in the same app database or a separate v2 database during parallel buildout
- final table names and migration numbering
- parent-link import policy for partial slices
- accepted lifecycle/status enums for each v2 table
- when candidate capabilities, tools, and skills become governed registry records
- whether `WorkSession` should model external thread, local process, conversational context, or a narrower relationship between those concepts
- how memory governance and retrieval tables join the core work-loop records

## Validation

Focused validation command:

```sh
npx vitest run src/lib/server/v2-sqlite-proof.spec.ts --project server
```

Current result:

- 5 tests passing
- database handle is `new Database(':memory:')`
- no runtime data files are read or written by the schema proof tests
