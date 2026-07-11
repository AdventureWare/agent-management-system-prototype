# V2 Next Post-Model-Governance Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Exact staging plan; not staged

## Purpose

Select the next small cleanup bucket after commit `5810097 Add AMS v2 model governance decisions`.

This plan is documentation-only. It does not authorize staging v2 preview implementation code, prototype/control-plane code, runtime data, autonomous-loop implementation, or broad docs indexes.

## Current Evidence

- Latest committed cleanup bucket: `5810097 Add AMS v2 model governance decisions`.
- `git diff --cached --name-only` returned no paths.
- `git status --short` still shows a mixed dirty tree:
  - modified prototype/control-plane code, UI, and docs;
  - untracked autonomous-loop docs;
  - untracked v2 preview/import scripts and source files;
  - untracked v2 preview/import proof and checkpoint docs;
  - remaining v2 milestone/evidence docs.
- `git diff --stat` still shows 54 modified tracked files with 2,857 insertions and 231 deletions.

## Selected Bucket

Stage the v2 preview/import proof and checkpoint documentation.

Reason:

- These files are docs-only.
- They document the isolated v2 preview/import boundary, schema proof, preview DB boundary, preview smoke flows, and UI/governance checkpoints.
- They are useful evidence for deciding what not to copy wholesale into v2 core.
- They keep preview implementation code out of the commit.
- They keep autonomous-loop production/prototype changes out of the commit.

## Included Paths

Stage exactly these paths:

```text
docs/v2_seed_slice_import_preview_v0_1.md
docs/v2_schema_contract_v0_1.md
docs/v2_sqlite_schema_proof_v0_1.md
docs/v2_persistence_boundary_v0_1.md
docs/v2_registry_schema_boundary_and_source_label_migration_plan_v0_1.md
docs/v2_preview_concept_graduation_review_v0_1.md
docs/v2_preview_governance_console_smoke_v0_1.md
docs/v2_preview_work_loop_smoke_v0_1.md
docs/stack_assessment/autonomous_work_loop_preview_v0_readiness_review_v0_1.md
docs/stack_assessment/v2_preview_run_evidence_ui_governance_checkpoint_v0_1.md
docs/stack_assessment/v2_preview_task_transition_ui_governance_checkpoint_v0_1.md
docs/stack_assessment/v2_preview_to_owned_agent_control_loop_integration_v0_1.md
docs/stack_assessment/v2_preview_ui_write_governance_checkpoint_v0_1.md
docs/v2_next_post_model_governance_cleanup_bucket_plan_v0_1.md
```

## Exact Staging Command

```sh
git add docs/v2_seed_slice_import_preview_v0_1.md \
  docs/v2_schema_contract_v0_1.md \
  docs/v2_sqlite_schema_proof_v0_1.md \
  docs/v2_persistence_boundary_v0_1.md \
  docs/v2_registry_schema_boundary_and_source_label_migration_plan_v0_1.md \
  docs/v2_preview_concept_graduation_review_v0_1.md \
  docs/v2_preview_governance_console_smoke_v0_1.md \
  docs/v2_preview_work_loop_smoke_v0_1.md \
  docs/stack_assessment/autonomous_work_loop_preview_v0_readiness_review_v0_1.md \
  docs/stack_assessment/v2_preview_run_evidence_ui_governance_checkpoint_v0_1.md \
  docs/stack_assessment/v2_preview_task_transition_ui_governance_checkpoint_v0_1.md \
  docs/stack_assessment/v2_preview_to_owned_agent_control_loop_integration_v0_1.md \
  docs/stack_assessment/v2_preview_ui_write_governance_checkpoint_v0_1.md \
  docs/v2_next_post_model_governance_cleanup_bucket_plan_v0_1.md
```

## Expected Cached Path List

After staging, `git diff --cached --name-only` should return exactly:

```text
docs/stack_assessment/autonomous_work_loop_preview_v0_readiness_review_v0_1.md
docs/stack_assessment/v2_preview_run_evidence_ui_governance_checkpoint_v0_1.md
docs/stack_assessment/v2_preview_task_transition_ui_governance_checkpoint_v0_1.md
docs/stack_assessment/v2_preview_to_owned_agent_control_loop_integration_v0_1.md
docs/stack_assessment/v2_preview_ui_write_governance_checkpoint_v0_1.md
docs/v2_next_post_model_governance_cleanup_bucket_plan_v0_1.md
docs/v2_persistence_boundary_v0_1.md
docs/v2_preview_concept_graduation_review_v0_1.md
docs/v2_preview_governance_console_smoke_v0_1.md
docs/v2_preview_work_loop_smoke_v0_1.md
docs/v2_registry_schema_boundary_and_source_label_migration_plan_v0_1.md
docs/v2_schema_contract_v0_1.md
docs/v2_seed_slice_import_preview_v0_1.md
docs/v2_sqlite_schema_proof_v0_1.md
```

## Excluded Paths

Do not stage these in this bucket:

- `docs/README.md`
- `.agents/*`
- `docs/autonomous-*`
- other `docs/v2_*`
- `scripts/*`
- `src/*`

These excluded files belong to later buckets: v2 milestone evidence, autonomous-loop docs, v2 preview implementation, v2 import scripts/services/tests, and prototype/control-plane implementation changes.

## Validation Before Commit

Before committing:

1. Run `git diff --cached --name-only`.
2. Confirm the path list exactly matches the expected cached path list above.
3. Run `git diff --cached --stat`.
4. Confirm the staged diff is docs-only.
5. Inspect representative staged docs:
   - `docs/v2_persistence_boundary_v0_1.md`
   - `docs/v2_preview_work_loop_smoke_v0_1.md`
   - `docs/stack_assessment/v2_preview_to_owned_agent_control_loop_integration_v0_1.md`
6. Confirm no code, runtime data, prototype/control-plane path, or broad docs index path is staged.

## Suggested Commit Message

```text
Add AMS v2 preview proof documentation
```

## Next Task

Create or run a follow-up task to stage exactly this bucket, verify the cached set, and stop before committing.
