# V2 Imported Prototype Backlog Curation Plan v0.1

Date: 2026-07-10
Status: Curation planning output

## Purpose

Plan the first cleanup pass over imported prototype state so AMS v2 keeps useful
real work without treating stale, duplicate, or low-quality prototype residue as
canonical operating truth.

This is a curation plan only. It does not delete imported records, rewrite the
v2 domain model, add UI, add scheduler/routing/local-model mechanics, or
implement bulk mutation helpers.

## Evidence Reviewed

- `task_v2_core_plan_imported_prototype_backlog_curation`
- `goal_ams_v2_imported_prototype_backlog_curation`
- `operator-console --project project_ams_v2_core`
- `operator-console --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`
- `search-context --project project_ams_v2_core --query "imported prototype goal task stale duplicate archive cleanup curation"`
- `search-context --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1 --query "goal task prototype AMS v2 backlog current active useful stale"`
- direct read-only summaries from `data/v2-core.sqlite` for imported goal and
  task status counts
- `docs/v2_next_capability_after_managed_provider_loop_v0_1.md`
- `docs/v2_managed_provider_run_loop_closure_assessment_v0_1.md`
- `docs/v2_route_comparison_goal_closure_assessment_v0_1.md`
- `docs/v2_minimal_loop_goal_closure_assessment_v0_1.md`

## Current Imported Prototype Inventory

Imported project:

- `project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`
- title: `Agent Management System Prototype`
- status: `active`
- goals: 8
- tasks: 82
- runs: 81
- artifacts: 53
- memory items: 0

The important signal is that every imported task is already `done`, but 6
imported goals are still `active`. This makes the imported project look active
even though it has no open executable work.

## Imported Goal Inventory

| Goal id | Title | Status | Done tasks | Initial curation hypothesis |
| --- | --- | --- | ---: | --- |
| `goal_26a850e3-5eac-4150-a96f-0574cd483595` | AMS useful prototype milestone | active | 34 | likely archive as v1 prototype evidence; preserve useful lessons |
| `goal_5c952025-6248-46eb-882e-9cca1b5b17c3` | Agent and work management system long-term vision | active | 1 | keep as vision/reference, not active execution |
| `goal_d6d74659-eb0f-4060-8343-ee8d3f577117` | Get a paying Kwipoo customer | active | 2 | move out of AMS v2 core scope or pause |
| `goal_2a62bd5a-b698-4274-98cf-f4e9e0932f56` | Reduce friction and frustration with repo management | active | 0 | pause or move to a separate project/backlog |
| `goal_02390bc4-fcae-495f-9f32-456e370b7265` | Stable, comprehensible AMS operator UI | active | 33 | archive v1 UI work; later extract v2-relevant UI needs |
| `goal_a363fc76-fdc1-4b79-aed2-39d53ac611c7` | Usable mobile AMS workflow | active | 1 | pause/defer; not a v2 core cleanup blocker |
| `goal_39bc6bb5-011e-43c3-9abd-a220f59100e0` | Autonomous Goal-Directed Work Loop v0 | completed | 10 | archive as historical proof/evidence |
| `goal_45e5b3d5-9b1d-44fd-a101-5335f9b79365` | Live real-agent autonomous goal completion proof | completed | 1 | archive as disposable proof evidence |

These are hypotheses for the first review batch, not final state changes.

## Curation Rubric

Use these classifications for imported goals/tasks/artifacts:

- `keep`: still directly advances AMS v2 and has a clear next action.
- `merge`: useful but overlaps with a current v2 goal/task; preserve source
  lineage and represent the current work in v2 instead of keeping both active.
- `pause`: may matter later, but not part of the current AMS v2 core path.
- `supersede`: replaced by accepted v2 work or a newer design/implementation.
- `cancel`: no longer worth pursuing as work.
- `archive`: preserve as historical evidence, not active operating state.

Do not classify anything as `keep` unless it answers:

1. What current v2 goal does this advance?
2. What is the next executable task?
3. What evidence would prove progress?
4. Why is this not already represented by an accepted v2 artifact, memory item,
   task, or goal?

## First Review Batch

The first batch should be small and goal-centered. Review these 8 goals first:

1. `goal_26a850e3-5eac-4150-a96f-0574cd483595`
   - Reason: largest imported AMS prototype goal, 34 done tasks, likely the
     main source of useful v1 lessons and duplicated v2 work.
   - Default classification to test: `archive` with selected `merge` notes.

2. `goal_02390bc4-fcae-495f-9f32-456e370b7265`
   - Reason: large v1 operator UI goal, 33 done tasks, likely contains useful
     UI lessons but should not drive v2 before the state model is clean.
   - Default classification to test: `archive` with deferred v2 UI extraction.

3. `goal_39bc6bb5-011e-43c3-9abd-a220f59100e0`
   - Reason: completed autonomous-loop proof; likely superseded by v2 minimal
     loop, agent-control, local retrieval, and managed provider-run evidence.
   - Default classification to test: `archive`.

4. `goal_45e5b3d5-9b1d-44fd-a101-5335f9b79365`
   - Reason: disposable proof goal already completed.
   - Default classification to test: `archive`.

5. `goal_5c952025-6248-46eb-882e-9cca1b5b17c3`
   - Reason: long-term vision may be valuable as source material, but it is not
     an executable v2 task stream by itself.
   - Default classification to test: `merge` into v2 design/reference docs or
     `archive` as vision evidence.

6. `goal_d6d74659-eb0f-4060-8343-ee8d3f577117`
   - Reason: real business goal but outside AMS v2 core implementation.
   - Default classification to test: `pause` or move to a separate project.

7. `goal_2a62bd5a-b698-4274-98cf-f4e9e0932f56`
   - Reason: no imported tasks; probably real pain but not a current AMS v2
     core capability unless explicitly reframed.
   - Default classification to test: `pause`.

8. `goal_a363fc76-fdc1-4b79-aed2-39d53ac611c7`
   - Reason: mobile workflow should not pull v2 into UI parity work before
     imported state is clean.
   - Default classification to test: `pause`.

## Representative Task Evidence To Sample

The first batch should inspect representative tasks, not every imported task:

- `task_48963b58-7d53-4cda-81c9-4e8b377058ee`
  - `Improve AMS usability by agents`
  - likely useful evidence for agent-facing affordances.

- `task_make_sqlite_runtime_store_single_source_of_truth`
  - `Make SQLite the only writable runtime store and add drift protection`
  - likely useful runtime-data-policy evidence.

- `task_cf1a549b-8713-435d-a2d5-ccc7fbe0170d`
  - `Review agent management system prototype and do cleanup/pruning`
  - likely directly relevant to current curation.

- `task_1bd773fd-ffac-4a94-aba7-87f9d094496a`
  - `Live worker proof: autonomously complete disposable AMS goal`
  - likely archive-only proof evidence.

- `task_7bba6d5e-1844-45c2-a201-ce9fc956ae52`
  - `Plan next step for Useful mobile version of AMS`
  - likely deferred mobile evidence.

- `task_c0803f4a-d682-47a0-8d99-364186d4ed12`
  - `Improve goals and project info and metadata and such for Agent Management System Prototype project`
  - useful for imported goal metadata provenance.

Do not inspect all 82 imported tasks in the first batch. The goal of the batch
is classification quality, not exhaustive cleanup.

## Curation Output Format

The next task should produce one artifact:

`docs/v2_imported_prototype_first_curation_batch_v0_1.md`

For each reviewed goal, include:

- record id
- title
- current status
- task/run/artifact count if available
- classification
- evidence sampled
- v2 relevance
- recommended state action
- source lineage to preserve
- follow-up task, only if there is a concrete executable next step

Use explicit uncertainty labels:

- `confident`
- `probable`
- `uncertain`
- `needs user decision`

## State Mutation Boundary

The next review batch may record classification decisions and accepted
artifacts. It must not:

- delete imported records;
- rewrite source artifacts;
- create new schema;
- create a new curation entity;
- create a bulk mutation helper;
- add UI;
- add scheduler, routing automation, or local-model work;
- convert imported AI output into trusted memory without review;
- mark unrelated business/product goals completed without user decision.

If status changes are made later, prefer conservative changes:

- `pause` for real but out-of-scope goals;
- `superseded` only when accepted v2 evidence clearly replaced the old goal;
- `completed` only when the goal's own success criteria are actually satisfied;
- `canceled` only when the operator decides the work is no longer wanted.

## Recommended Follow-Up Tasks

Create one ready task:

`Review first imported prototype curation batch`

Purpose:

Apply this rubric to the 8 imported goals listed above, sample the
representative tasks, and produce the first classification artifact.

Acceptance:

- classify all 8 goals;
- sample the representative tasks listed above;
- identify which imported evidence should be archived, merged into v2 context,
  paused, or kept active;
- do not delete records;
- do not implement code or schema;
- create no more than 3 follow-up tasks from the batch.

Create one additional ready task only if the review batch confirms it:

`Close completed v2 milestone goals`

Purpose:

The current v2 core project still shows completed-in-practice goals as active.
The next batch may recommend closing them, but only after confirming each has an
accepted closure artifact and no open work.

Do not mix v2 milestone closure with imported prototype curation unless the
review batch needs it to keep `next-work` meaningful.

## Validation Readbacks

After this planning task closes, validate:

- `inspect-task --task task_v2_core_plan_imported_prototype_backlog_curation`
- `next-work --project project_ams_v2_core`
- `operator-console --project project_ams_v2_core`
- `operator-console --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`

Expected result:

- this planning task is done with accepted artifact evidence;
- no imported records have been deleted;
- the next ready task is `Review first imported prototype curation batch`.
