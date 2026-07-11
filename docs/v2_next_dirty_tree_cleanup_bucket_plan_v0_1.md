# V2 Next Dirty-Tree Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Exact staging plan; not staged

## Purpose

Select the next small, reviewable cleanup bucket after the v2 core runtime and v2 design source-of-truth commits.

This plan does not authorize staging unrelated files, deleting files, moving files, reverting user work, or committing code. It exists to make the next cleanup step exact.

## Current Evidence

- Latest committed v2 core runtime slice: `c70b33c Add AMS v2 core runtime loop`.
- Latest committed v2 design/source-of-truth slice: `3c1a381 Add AMS v2 design source of truth`.
- `git diff --cached --name-only` returned no paths.
- `git status --short` still shows a mixed dirty tree:
  - modified prototype/control-plane docs;
  - modified prototype/control-plane code and UI;
  - untracked autonomous-loop evidence docs;
  - untracked model-change proposals and model decisions;
  - untracked stack assessment docs;
  - untracked v2 milestone/evidence docs;
  - untracked v2 preview/import scripts and source files.
- `docs/stack_assessment/README.md` identifies the original v0.1 stack assessment deliverable set and read order.

## Selected Bucket

Stage the original AMS v2 stack, tooling, architecture, and development-process assessment deliverables.

Reason:

- These are docs-only.
- They were requested as a coherent assessment set.
- They preserve the stack/process rationale for v2.
- They are separable from prototype code changes, model-governance changes, v2 preview implementation, and cleanup evidence.
- They help future agents understand why v2 is TypeScript/Node, SQLite, CLI-first, and modular-monolith-first instead of treating those choices as accidental.

## Included Paths

Stage exactly these paths:

```text
docs/stack_assessment/README.md
docs/stack_assessment/agentic_development_process_v0_1.md
docs/stack_assessment/current_stack_audit_v0_1.md
docs/stack_assessment/next_implementation_steps_v0_1.md
docs/stack_assessment/prototype_to_v2_stack_migration_plan_v0_1.md
docs/stack_assessment/recommended_stack_v0_1.md
docs/stack_assessment/stack_decision_matrix_v0_1.csv
docs/stack_assessment/stack_evaluation_criteria_v0_1.md
docs/stack_assessment/stack_options_comparison_v0_1.md
docs/stack_assessment/target_capabilities_v0_1.md
docs/v2_next_dirty_tree_cleanup_bucket_plan_v0_1.md
```

## Exact Staging Command

```sh
git add docs/stack_assessment/README.md \
  docs/stack_assessment/agentic_development_process_v0_1.md \
  docs/stack_assessment/current_stack_audit_v0_1.md \
  docs/stack_assessment/next_implementation_steps_v0_1.md \
  docs/stack_assessment/prototype_to_v2_stack_migration_plan_v0_1.md \
  docs/stack_assessment/recommended_stack_v0_1.md \
  docs/stack_assessment/stack_decision_matrix_v0_1.csv \
  docs/stack_assessment/stack_evaluation_criteria_v0_1.md \
  docs/stack_assessment/stack_options_comparison_v0_1.md \
  docs/stack_assessment/target_capabilities_v0_1.md \
  docs/v2_next_dirty_tree_cleanup_bucket_plan_v0_1.md
```

## Expected Cached Path List

After staging, `git diff --cached --name-only` should return exactly:

```text
docs/stack_assessment/README.md
docs/stack_assessment/agentic_development_process_v0_1.md
docs/stack_assessment/current_stack_audit_v0_1.md
docs/stack_assessment/next_implementation_steps_v0_1.md
docs/stack_assessment/prototype_to_v2_stack_migration_plan_v0_1.md
docs/stack_assessment/recommended_stack_v0_1.md
docs/stack_assessment/stack_decision_matrix_v0_1.csv
docs/stack_assessment/stack_evaluation_criteria_v0_1.md
docs/stack_assessment/stack_options_comparison_v0_1.md
docs/stack_assessment/target_capabilities_v0_1.md
docs/v2_next_dirty_tree_cleanup_bucket_plan_v0_1.md
```

## Excluded Paths

Do not stage these in this bucket:

- `docs/stack_assessment/autonomous_work_loop_preview_v0_readiness_review_v0_1.md`
- `docs/stack_assessment/v2_preview_run_evidence_ui_governance_checkpoint_v0_1.md`
- `docs/stack_assessment/v2_preview_task_transition_ui_governance_checkpoint_v0_1.md`
- `docs/stack_assessment/v2_preview_to_owned_agent_control_loop_integration_v0_1.md`
- `docs/stack_assessment/v2_preview_ui_write_governance_checkpoint_v0_1.md`
- `docs/current_repo_state_cleanup_buckets_v0_1.md`
- `docs/v2_first_design_docs_cleanup_staged_paths_review_v0_1.md`
- `docs/v2_first_design_docs_cleanup_commit_closeout_v0_1.md`
- `docs/model-change-proposals/*`
- `docs/model-decisions/*`
- `docs/v2_*`
- `docs/autonomous-*`
- `scripts/*`
- `src/*`
- `.agents/*`

The preview checkpoint files under `docs/stack_assessment/` are related to later preview/UI work, not the original stack assessment deliverable set. They need their own review bucket.

## Validation Before Commit

Before committing:

1. Run `git diff --cached --name-only`.
2. Confirm the path list exactly matches the expected cached path list above.
3. Run `git diff --cached --stat`.
4. Confirm the staged diff is docs/CSV only.
5. Confirm no application code, prototype UI, runtime data, model-governance proposal, preview/import script, or preview implementation path is staged.

## Suggested Commit Message

```text
Add AMS v2 stack assessment
```

## Next Task

Create or run a follow-up task to stage exactly this bucket, review the staged set, and stop before commit.
