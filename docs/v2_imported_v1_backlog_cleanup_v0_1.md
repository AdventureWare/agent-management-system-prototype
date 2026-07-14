# V2 Imported V1 Backlog Cleanup v0.1

Date: 2026-07-14

## Purpose

Turn the full imported v1 backlog from a raw migrated dump into usable v2 work state without deleting imported evidence.

## Cleanup Scope

This pass cleaned only the obvious work-queue noise created by the full import:

- Generated `Imported unscoped v1 work` holding goals.
- Imported v1 tasks stuck in `review` state.
- One imported stale continuation-control task.

It did not delete imported records, rewrite historical artifacts, or collapse project history.

## Actions Applied

Paused 14 generated holding goals:

- `goal_imported_unscoped_v1_project_0356a0df_96e4_482a_a2b6_1da4ad118ebe`
- `goal_imported_unscoped_v1_project_1ef6aafb_6d6b_4384_943e_ecc0ea93c4b6`
- `goal_imported_unscoped_v1_project_28a226d9_d291_4cb8_8676_8b2b1cb7fcbe`
- `goal_imported_unscoped_v1_project_28ceb721_f391_4ca2_a0e5_56c84bfbc71e`
- `goal_imported_unscoped_v1_project_6782f5e4_efcb_407c_8579_b293ee560232`
- `goal_imported_unscoped_v1_project_7d69aa33_a7af_4aee_95ef_d31436ba2b48`
- `goal_imported_unscoped_v1_project_8d6f064a_e10a_46fe_a8ef_9fe0f1fd11e1`
- `goal_imported_unscoped_v1_project_ac8530fd_dd43_4dd5_a5f0_b44e035f6f17`
- `goal_imported_unscoped_v1_project_aec29994_53d4_4367_a1c1_1ea5a9c81a2c`
- `goal_imported_unscoped_v1_project_c3336a7b_1413_498e_ac8b_70aac0a36e11`
- `goal_imported_unscoped_v1_project_d3f3b0dd_df14_41b9_85ae_eb27433f8e35`
- `goal_imported_unscoped_v1_project_dd367528_853b_4b02_b4dc_db7c8ba9c481`
- `goal_imported_unscoped_v1_project_e133e364_2a20_4a99_98a9_6d414e0e9098`
- `goal_imported_unscoped_v1_project_textile_inocrowd`

Canceled 15 stale imported tasks:

- `task_0b262d8c-82d4-487f-9438-cec66d7e20cf`
- `task_1d3841f6-d85a-4c4f-9e06-af2e5b8d7fbf`
- `task_3ba0c017-b4ee-4b91-97af-5f1be228a872`
- `task_52568ae7-ef55-4fa2-a8dd-3472cfee6b3a`
- `task_650d2d9e-ddcd-47df-a90d-450d42dad2e9`
- `task_6ff8bff8-d94c-4180-95ac-2e7414183ade`
- `task_9e64a73b-3d60-4473-af4e-40a5ee30bc59`
- `task_9fa16f51-0c0d-4530-9c0f-86ccbe445cc2`
- `task_b4a9093a-0d72-4741-9b1e-138a07830621`
- `task_b547e945-2890-4548-8b42-a38515d6ac8a`
- `task_c30fdd72-ed02-4f03-afee-e22df8b1e102`
- `task_d2b4f708-8dd9-41ae-86e9-cafe8a1dcb8b`
- `task_f02e1102-6099-4158-bd75-f7002fe2c991`
- `task_f7723764-7905-4a39-b466-0f1ded1ca1de`
- `task_ffbdc98c-1761-42da-ad55-6e2bbec6582b`

## Preserved Ready Work

The cleanup preserved concrete ready tasks that still look actionable:

- Silver Oak measurement clarification.
- Silver Oak reusable property modeling workflow extraction.
- Silver Oak source-backed modeling pass selection.
- Snack Run manual playtest.
- AMS managed launch-mode contract design.
- Kwipoo move-flow improvements:
  - destination search
  - full-path labels
  - move-another-here continuation
  - post-move confirmation and undo
  - recent destinations and deterministic ranking
  - move-flow instrumentation baseline
- Superstructure planning and validation tasks already in the v2 program.

## Before / After

Before cleanup:

- In progress tasks: 6
- Ready tasks: 16
- Review tasks: 14
- Active generated holding goals: 14

After cleanup:

- In progress tasks: 6
- Ready tasks: 15
- Review tasks: 0
- Active generated holding goals: 0

Task status totals after cleanup:

- Done: 677
- Canceled: 58
- Ready: 15
- In progress: 6

Goal status totals after cleanup:

- Active: 43
- Completed: 30
- Paused: 26
- Superseded: 2

## Resulting Queue

`next-work` now returns concrete ready tasks instead of imported review residue. The top candidates include:

- `task_7f8a4d11-6543-4b46-b855-c72aa5cc138c` - Manual playtest Snack Run ship candidate after finish fix.
- `task_9e7be60e-ea53-4930-9aab-4edf4a6d9159` - Add destination search to the single-item move flow in Kwipoo.
- `task_bcce9bbf-6bfb-4d37-9ae0-cef2fa0daff3` - Add full-path labels to single-item move destinations in Kwipoo.
- `task_superstructure_dynamics_input_readiness_contract` - Define dynamics input readiness contract for pilot.
- `task_superstructure_dynamics_validation_plan_v0` - Backwards-plan pilot dynamics validation v0.

## Remaining Cleanup

This pass made the queue usable. It did not complete deeper product prioritization.

Remaining useful cleanup:

- Decide which active imported non-AMS goals should be paused versus actively pursued.
- Review concrete ready tasks by project priority.
- Reconcile old v1 Superstructure goals against the newer v2 Superstructure Program if deeper consolidation is needed.
- Translate or archive deferred v1 roles, workflows, workflow steps, task templates, approvals, and execution surfaces only if a concrete workflow requires them.

## Validation

- Ran `scripts/v2-cleanup-imported-v1-backlog.ts` dry-run before write.
- Applied cleanup through existing v2 transition service functions, recording transition decisions.
- Read back `next-work`; review residue no longer appears.
- Read back task and goal status totals.
