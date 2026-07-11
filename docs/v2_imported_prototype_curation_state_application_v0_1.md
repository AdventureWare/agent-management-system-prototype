# V2 Imported Prototype Curation State Application v0.1

Date: 2026-07-10
Status: State application output

## Purpose

Apply the accepted first imported prototype curation batch as durable AMS v2
decision evidence without deleting imported records or mutating unsupported
goal status fields directly.

Source artifact:

- `docs/v2_imported_prototype_first_curation_batch_v0_1.md`

Task/run:

- task: `task_v2_core_apply_imported_prototype_curation_classifications`
- run: `run_v2_core_apply_imported_prototype_curation_classifications`

## Applied Decisions

| Imported goal id | Classification | Decision id | State action |
| --- | --- | --- | --- |
| `goal_26a850e3-5eac-4150-a96f-0574cd483595` | merge + archive | `decision_v2_core_curation_goal_26a850e3_merge_archive` | Preserve useful v1 lessons; do not treat the imported goal as current executable v2 backlog. |
| `goal_02390bc4-fcae-495f-9f32-456e370b7265` | archive + defer extraction | `decision_v2_core_curation_goal_02390bc4_archive_defer` | Preserve v1 UI evidence; defer v2 UI work until current v2 workflow needs justify it. |
| `goal_39bc6bb5-011e-43c3-9abd-a220f59100e0` | archive | `decision_v2_core_curation_goal_39bc6bb5_archive` | Preserve as completed historical autonomous-loop proof evidence. |
| `goal_45e5b3d5-9b1d-44fd-a101-5335f9b79365` | archive | `decision_v2_core_curation_goal_45e5b3d5_archive` | Preserve as completed disposable live-agent proof evidence. |
| `goal_5c952025-6248-46eb-882e-9cca1b5b17c3` | merge + archive | `decision_v2_core_curation_goal_5c952025_merge_archive` | Preserve as vision/source evidence, not an executable active goal stream. |
| `goal_d6d74659-eb0f-4060-8343-ee8d3f577117` | needs operator decision | `decision_v2_core_curation_goal_d6d74659_operator_decision` | Leave unchanged; this is a product/business goal outside AMS v2 core. |
| `goal_2a62bd5a-b698-4274-98cf-f4e9e0932f56` | needs operator decision | `decision_v2_core_curation_goal_2a62bd5a_operator_decision` | Leave unchanged unless reframed by the operator as concrete project work. |
| `goal_a363fc76-fdc1-4b79-aed2-39d53ac611c7` | pause/defer | `decision_v2_core_curation_goal_a363fc76_pause_defer` | Defer mobile workflow until v2 loop and state model are cleaner. |

## Boundary Observed

This batch recorded curation classifications as decisions. It did not directly
edit imported goal statuses because the current v2 core CLI exposes
`record-decision`, but does not expose a supported goal status transition or
goal update command.

That means some imported goals may still display as `active` in operator-console
readbacks. Their accepted curation handling is now recorded as decision
evidence, but status mutation is intentionally deferred rather than done through
ad hoc SQL.

## Non-Actions

This batch did not:

- delete imported projects, goals, tasks, runs, artifacts, or source references;
- convert imported AI output into trusted memory;
- create schema, UI, scheduler, routing, local-model, or bulk-helper work;
- mark Kwipoo or repo-management goals completed, paused, or moved without an
  operator decision;
- inspect or reclassify all 82 imported tasks;
- create a new curation entity.

## Validation

Expected validation readbacks:

- `inspect-task --task task_v2_core_apply_imported_prototype_curation_classifications`
- `operator-console --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`
- `search-context --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1 --query "imported_goal_curation_classification"`
- `next-work --project project_ams_v2_core`

Pass condition:

- all 8 imported goals have curation decisions;
- imported records remain present;
- no direct status mutation was performed;
- the current task can be reviewed and closed.
