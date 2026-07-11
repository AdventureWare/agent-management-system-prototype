# V2 Next Post-Stack-Assessment Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Exact staging plan; not staged

## Purpose

Select the next small cleanup bucket after commit `e0b50c0 Add AMS v2 stack assessment`.

This plan is documentation-only. It does not authorize staging code, deleting files, moving files, reverting work, changing runtime data, or committing without review.

## Current Evidence

- Latest committed cleanup bucket: `e0b50c0 Add AMS v2 stack assessment`.
- `git diff --cached --name-only` returned no paths.
- `git status --short` still shows a mixed dirty tree:
  - modified v1/prototype docs, CLI, API, server modules, and UI routes;
  - untracked autonomous-loop docs;
  - untracked model-change proposals and model decisions;
  - untracked v2 preview/import scripts and implementation files;
  - untracked v2 evidence and cleanup artifacts.
- `git diff --stat` still shows 59 modified tracked files with 3,587 insertions and 249 deletions.

## Selected Bucket

Stage the v2 dogfood/runtime-cleanup evidence docs.

Reason:

- These files explain how the already-committed v2 runtime and design cleanup commits were selected, validated, staged, and closed out.
- They are docs-only.
- They help future agents understand the current dirty-tree cleanup sequence.
- They are separable from model-governance docs, v2 preview/import implementation, and prototype/control-plane code.
- They reduce ambiguity before the remaining riskier buckets are reviewed.

## Included Paths

Stage exactly these paths:

```text
docs/current_repo_state_cleanup_buckets_v0_1.md
docs/v2_core_package_json_script_split_decision_v0_1.md
docs/v2_core_runtime_commit_closeout_v0_1.md
docs/v2_core_runtime_commit_readiness_checklist_v0_1.md
docs/v2_core_runtime_exact_staging_plan_v0_1.md
docs/v2_core_runtime_staged_paths_review_v0_1.md
docs/v2_first_design_docs_cleanup_commit_closeout_v0_1.md
docs/v2_first_design_docs_cleanup_staged_paths_review_v0_1.md
docs/v2_first_real_dogfood_task_selection_v0_1.md
docs/v2_next_post_stack_assessment_cleanup_bucket_plan_v0_1.md
```

## Exact Staging Command

```sh
git add docs/current_repo_state_cleanup_buckets_v0_1.md \
  docs/v2_core_package_json_script_split_decision_v0_1.md \
  docs/v2_core_runtime_commit_closeout_v0_1.md \
  docs/v2_core_runtime_commit_readiness_checklist_v0_1.md \
  docs/v2_core_runtime_exact_staging_plan_v0_1.md \
  docs/v2_core_runtime_staged_paths_review_v0_1.md \
  docs/v2_first_design_docs_cleanup_commit_closeout_v0_1.md \
  docs/v2_first_design_docs_cleanup_staged_paths_review_v0_1.md \
  docs/v2_first_real_dogfood_task_selection_v0_1.md \
  docs/v2_next_post_stack_assessment_cleanup_bucket_plan_v0_1.md
```

## Expected Cached Path List

After staging, `git diff --cached --name-only` should return exactly:

```text
docs/current_repo_state_cleanup_buckets_v0_1.md
docs/v2_core_package_json_script_split_decision_v0_1.md
docs/v2_core_runtime_commit_closeout_v0_1.md
docs/v2_core_runtime_commit_readiness_checklist_v0_1.md
docs/v2_core_runtime_exact_staging_plan_v0_1.md
docs/v2_core_runtime_staged_paths_review_v0_1.md
docs/v2_first_design_docs_cleanup_commit_closeout_v0_1.md
docs/v2_first_design_docs_cleanup_staged_paths_review_v0_1.md
docs/v2_first_real_dogfood_task_selection_v0_1.md
docs/v2_next_post_stack_assessment_cleanup_bucket_plan_v0_1.md
```

## Excluded Paths

Do not stage these in this bucket:

- `.agents/*`
- `docs/autonomous-*`
- `docs/model-change-proposals/*`
- `docs/model-decisions/*`
- `docs/stack_assessment/autonomous_work_loop_preview_v0_readiness_review_v0_1.md`
- `docs/stack_assessment/v2_preview_*`
- `docs/v2_accepted_goal_closure_transitions_v0_1.md`
- `docs/v2_agent_control_route_comparison_interpretation_v0_1.md`
- `docs/v2_imported_*`
- `docs/v2_managed_*`
- `docs/v2_minimal_*`
- `docs/v2_next_capability_*`
- `docs/v2_next_implementation_milestone_selection_v0_1.md`
- `docs/v2_next_milestone_*`
- `docs/v2_persistence_boundary_v0_1.md`
- `docs/v2_preview_*`
- `docs/v2_registry_schema_boundary_and_source_label_migration_plan_v0_1.md`
- `docs/v2_repeatable_*`
- `docs/v2_repeated_*`
- `docs/v2_route_*`
- `docs/v2_schema_contract_v0_1.md`
- `docs/v2_seed_slice_import_preview_v0_1.md`
- `docs/v2_sqlite_schema_proof_v0_1.md`
- `scripts/*`
- `src/*`

These excluded files belong to later buckets: autonomous loop docs, model-governance docs, v2 preview/import implementation, v2 milestone evidence, and prototype/control-plane implementation changes.

## Validation Before Commit

Before committing:

1. Run `git diff --cached --name-only`.
2. Confirm the path list exactly matches the expected cached path list above.
3. Run `git diff --cached --stat`.
4. Confirm the staged diff is docs-only.
5. Inspect representative staged docs:
   - `docs/current_repo_state_cleanup_buckets_v0_1.md`
   - `docs/v2_core_runtime_commit_closeout_v0_1.md`
   - `docs/v2_first_real_dogfood_task_selection_v0_1.md`
6. Confirm no code, runtime data, model-governance proposal, preview/import implementation, or prototype-control-plane path is staged.

## Suggested Commit Message

```text
Add AMS v2 runtime cleanup evidence
```

## Next Task

Create or run a follow-up task to stage exactly this bucket, verify the cached set, and stop before committing.
