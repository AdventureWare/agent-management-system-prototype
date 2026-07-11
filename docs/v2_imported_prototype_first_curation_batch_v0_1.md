# V2 Imported Prototype First Curation Batch v0.1

Date: 2026-07-10
Status: Curation batch output

## Purpose

Classify the first imported prototype batch so AMS v2 can preserve useful
prototype evidence without treating stale imported state as current operating
truth.

This pass does not delete imported records, change schema, add UI, add
scheduler/routing/local-model mechanics, or create bulk cleanup tooling.

## Evidence Reviewed

- `docs/v2_imported_prototype_backlog_curation_plan_v0_1.md`
- `operator-console --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`
- imported goal/task/run/artifact counts from `data/v2-core.sqlite`
- `inspect-task` readbacks for representative imported tasks:
  - `task_48963b58-7d53-4cda-81c9-4e8b377058ee`
  - `task_make_sqlite_runtime_store_single_source_of_truth`
  - `task_cf1a549b-8713-435d-a2d5-ccc7fbe0170d`
  - `task_1bd773fd-ffac-4a94-aba7-87f9d094496a`
  - `task_7bba6d5e-1844-45c2-a201-ce9fc956ae52`
  - `task_c0803f4a-d682-47a0-8d99-364186d4ed12`
- current AMS v2 accepted evidence for minimal loop, route comparison, managed
  provider-run loop, and imported prototype curation planning

## Batch Finding

The imported prototype project has valuable historical evidence, but it should
not remain an active operating backlog as imported.

The key mismatch is:

- imported goals: 8
- imported tasks: 82
- imported runs: 81
- imported artifacts: 53
- imported memory items: 0
- all imported tasks are `done`
- 6 imported goals still show `active`

That means the imported project is mostly completed/historical work with active
status labels left over from v1. V2 should preserve the evidence and lineage,
but current execution should happen under clean v2 goals/tasks.

## Goal Classifications

| Goal id | Title | Current status | Evidence counts | Classification | Confidence | Recommended state action |
| --- | --- | --- | --- | --- | --- | --- |
| `goal_26a850e3-5eac-4150-a96f-0574cd483595` | AMS useful prototype milestone | active | 34 tasks, 37 runs, 48 artifacts | merge + archive | probable | Supersede as active work after preserving selected lessons in v2 references. |
| `goal_02390bc4-fcae-495f-9f32-456e370b7265` | Stable, comprehensible AMS operator UI | active | 33 tasks, 36 runs, 4 artifacts | archive + defer extraction | probable | Pause or supersede as v1 UI evidence; extract v2 UI needs later only after state cleanup. |
| `goal_39bc6bb5-011e-43c3-9abd-a220f59100e0` | Autonomous Goal-Directed Work Loop v0 | completed | 10 tasks, 3 runs, 0 artifacts | archive | confident | Preserve as historical proof; no active work needed. |
| `goal_45e5b3d5-9b1d-44fd-a101-5335f9b79365` | Live real-agent autonomous goal completion proof | completed | 1 task, 1 run, 0 artifacts | archive | confident | Preserve as disposable proof evidence; no active work needed. |
| `goal_5c952025-6248-46eb-882e-9cca1b5b17c3` | Agent and work management system long-term vision | active | 1 task, 1 run, 0 artifacts | merge + archive | probable | Merge useful intent into v2 design docs/memory; do not keep as an executable active goal. |
| `goal_d6d74659-eb0f-4060-8343-ee8d3f577117` | Get a paying Kwipoo customer | active | 2 tasks, 2 runs, 0 artifacts | pause / move out of AMS v2 core | needs user decision | Keep out of AMS v2 core unless the operator wants a separate product/business project. |
| `goal_2a62bd5a-b698-4274-98cf-f4e9e0932f56` | Reduce friction and frustration with repo management | active | 0 tasks, 0 runs, 0 artifacts | pause | needs user decision | Preserve as real pain, but do not make it active AMS v2 core work without a fresh goal/task. |
| `goal_a363fc76-fdc1-4b79-aed2-39d53ac611c7` | Usable mobile AMS workflow | active | 1 task, 1 run, 1 artifact | pause | probable | Defer until v2 state model and operating loop are clean enough to justify mobile UI work. |

## Evidence Notes

### AMS useful prototype milestone

This is the main source of useful v1 evidence. Sampled tasks show concrete,
accepted work on agent-facing operations, runtime storage policy, metadata
cleanup, run/review affordances, and structured work packets.

Do not keep this imported goal active as-is. V2 already has cleaner goals for
the same direction:

- minimal v2 work loop;
- route comparison;
- managed provider-run loop;
- imported prototype curation.

Recommended handling: preserve selected lessons as v2 references and mark the
imported goal as no longer active once the operator approves state cleanup.

### Stable, comprehensible AMS operator UI

This imported goal has many completed v1 UI cleanup tasks. It is useful as UI
evidence, but letting it stay active would pull v2 back toward prototype UI
parity before imported state is clean.

Recommended handling: archive as v1 UI evidence. Create later v2 UI tasks only
from current v2 workflow needs.

### Completed autonomous/proof goals

Both completed proof goals are historical evidence. They should remain
available for lineage but should not produce more work.

Recommended handling: archive only.

### Long-term vision

The vision goal contains useful intent, but it is not executable. Its content
belongs in v2 design docs, requirements, or trusted memory after review.

Recommended handling: merge selected principles into v2 references and archive
the imported goal as source evidence.

### Kwipoo, repo-management, and mobile goals

These are not garbage, but they are not current AMS v2 core work:

- Kwipoo is a product/business goal.
- Repo-management friction is a developer-operations goal.
- Mobile AMS workflow is a later UI/accessibility goal.

Recommended handling: pause or move to separate project/goal structures after
operator decision.

## Representative Task Classifications

| Task id | Title | Classification | Reason |
| --- | --- | --- | --- |
| `task_48963b58-7d53-4cda-81c9-4e8b377058ee` | Improve AMS usability by agents | merge | Contains useful agent-facing design and implementation evidence now partly represented by v2 work packets, agent-control, and managed provider-run loop. |
| `task_make_sqlite_runtime_store_single_source_of_truth` | Make SQLite the only writable runtime store and add drift protection | merge | Useful runtime data policy evidence; aligns with v2 SQLite/source-of-truth discipline. |
| `task_cf1a549b-8713-435d-a2d5-ccc7fbe0170d` | Review agent management system prototype and do cleanup/pruning | merge | Directly relevant cleanup process evidence; supports current curation rubric. |
| `task_1bd773fd-ffac-4a94-aba7-87f9d094496a` | Live worker proof: autonomously complete disposable AMS goal | archive | Completed proof task; useful only as historical evidence. |
| `task_7bba6d5e-1844-45c2-a201-ce9fc956ae52` | Plan next step for Useful mobile version of AMS | pause | Mobile use is plausible later, but not a current v2 core cleanup task. |
| `task_c0803f4a-d682-47a0-8d99-364186d4ed12` | Improve goals and project info and metadata... | merge | Useful provenance for imported goal metadata and planning fields. |

## Recommended Follow-Up

Create one next task:

`Apply accepted imported prototype curation classifications`

Purpose:

Record conservative state decisions for this first batch after acceptance of
this classification artifact.

Acceptance:

- do not delete imported records;
- preserve source references;
- record decisions for the 8 imported goals;
- move only safe imported goals out of active status;
- leave `needs user decision` goals unchanged or paused only with explicit
  operator approval;
- create no new schema, UI, scheduler, routing, local-model, or bulk-helper
  work.

Suggested initial actions:

- archive completed proof goals as historical evidence;
- mark the imported autonomous-loop and live-proof goals as archive-only;
- supersede or pause the imported AMS prototype milestone and UI goal only if
  the operator accepts this classification;
- leave Kwipoo and repo-management goals requiring operator decision rather
  than silently closing them.

## Non-Actions

This batch does not recommend:

- treating imported v1 output as trusted v2 memory automatically;
- closing business/product goals without operator decision;
- deleting v1 tasks, runs, artifacts, or attachments;
- importing all v1 UI work into v2;
- adding a curation entity or schema;
- adding a bulk status mutation command;
- expanding provider-run mechanics;
- implementing local model execution.

## Validation

This artifact satisfies the batch because it:

- classifies all 8 imported goals;
- samples the representative tasks named in the accepted plan;
- names concrete imported goal/task ids;
- preserves source lineage;
- recommends only conservative state decisions;
- creates at most one follow-up task;
- leaves imported records untouched during this review pass.
