# V2 First Post-Runtime Dirty-Tree Cleanup Commit Plan v0.1

Date: 2026-07-11
Status: Exact staging plan, not staged

## Purpose

Pick the first safe cleanup commit bucket after the clean v2 core runtime
checkpoint and define an exact staging plan. This task did not stage, delete,
move, revert, or commit files.

AMS task/run:

- task: `task_v2_core_prepare_first_post_runtime_dirty_tree_cleanup_commit_plan`
- run: `run_v2_core_prepare_first_cleanup_commit_plan`

## Evidence Reviewed

- `git diff --cached --name-only`
- `git status --short`
- `git diff --stat`
- `git ls-files --others --exclude-standard docs/design docs/stack_assessment ...`
- `docs/current_repo_state_cleanup_buckets_v0_1.md`
- representative reads of the selected v2 design/rebuild docs

## Current Dirty State

The index is clean:

```text
git diff --cached --name-only
```

returned no paths.

The remaining dirty tree still contains:

- 59 modified tracked files, mostly prototype/control-plane/UI/domain-doc
  changes.
- Many untracked docs, v2 preview/import files, model-governance files, and
  milestone artifacts.
- No staged files after the v2 core runtime commit.

## Selected First Cleanup Bucket

First bucket: v2 canonical design and rebuild documentation.

Reason:

- docs-only;
- low risk compared with prototype control-plane or UI code;
- preserves the reasoning behind v2 before more cleanup decisions;
- makes the v2 source-of-truth visible in git;
- avoids mixing implementation, preview/import experiments, and old prototype
  control-plane changes.

## Included Paths

Stage exactly these paths:

```text
docs/design/ams_v2_design_bloat_audit.md
docs/design/ams_v2_domain_ontology_and_behavior_spec.md
docs/design/ams_v2_entity_cards.md
docs/design/ams_v2_traceability_matrix.md
docs/prototype_audit_v0_1.md
docs/v1_to_v2_migration_plan_v0_1.md
docs/v2_architecture_v0_1.md
docs/v2_build_blueprint_v0_1.md
docs/v2_domain_model_v0_1.md
docs/v2_first_post_runtime_dirty_tree_cleanup_commit_plan_v0_1.md
docs/v2_minimal_vertical_slice_v0_1.md
docs/v2_next_major_subgoal_after_runtime_commit_v0_1.md
docs/v2_rebuild_or_refactor_decision_v0_1.md
docs/v2_requirements_v0_1.md
```

## Exact Staging Command

```sh
git add \
  docs/design/ams_v2_design_bloat_audit.md \
  docs/design/ams_v2_domain_ontology_and_behavior_spec.md \
  docs/design/ams_v2_entity_cards.md \
  docs/design/ams_v2_traceability_matrix.md \
  docs/prototype_audit_v0_1.md \
  docs/v1_to_v2_migration_plan_v0_1.md \
  docs/v2_architecture_v0_1.md \
  docs/v2_build_blueprint_v0_1.md \
  docs/v2_domain_model_v0_1.md \
  docs/v2_first_post_runtime_dirty_tree_cleanup_commit_plan_v0_1.md \
  docs/v2_minimal_vertical_slice_v0_1.md \
  docs/v2_next_major_subgoal_after_runtime_commit_v0_1.md \
  docs/v2_rebuild_or_refactor_decision_v0_1.md \
  docs/v2_requirements_v0_1.md
```

## Expected Cached Path List

After staging, `git diff --cached --name-only` must return exactly:

```text
docs/design/ams_v2_design_bloat_audit.md
docs/design/ams_v2_domain_ontology_and_behavior_spec.md
docs/design/ams_v2_entity_cards.md
docs/design/ams_v2_traceability_matrix.md
docs/prototype_audit_v0_1.md
docs/v1_to_v2_migration_plan_v0_1.md
docs/v2_architecture_v0_1.md
docs/v2_build_blueprint_v0_1.md
docs/v2_domain_model_v0_1.md
docs/v2_first_post_runtime_dirty_tree_cleanup_commit_plan_v0_1.md
docs/v2_minimal_vertical_slice_v0_1.md
docs/v2_next_major_subgoal_after_runtime_commit_v0_1.md
docs/v2_rebuild_or_refactor_decision_v0_1.md
docs/v2_requirements_v0_1.md
```

## Validation Needed Before Commit

- Verify `git diff --cached --name-only` matches the expected list exactly.
- Run `git diff --cached --stat` and confirm it is docs-only.
- Spot-check the staged docs for:
  - canonical v2 ontology/source-of-truth;
  - rebuild/refactor decision;
  - v2 requirements/domain/architecture/minimal slice;
  - migration plan;
  - dirty-tree cleanup rationale.
- No test suite is required for this docs-only commit.

Suggested commit message:

```text
Add AMS v2 design source of truth
```

## Explicitly Excluded

Do not include these in the first cleanup commit:

- modified prototype/control-plane source files;
- modified prototype UI/source files;
- autonomous-loop v0.5/v0.6 docs;
- stack-assessment docs;
- model-change proposal and model-decision docs;
- v2 milestone evidence docs not listed above;
- v2 preview/import/migration scripts and source files;
- `docs/README.md`, `docs/domain-glossary.md`, `docs/ontology-v1.md`, and
  related modified tracked domain-governance docs.

These may be valuable, but they belong in separate cleanup buckets.

## Follow-Up

The next task should stage exactly the included paths, verify the cached path
list, and stop before committing unless the staged set is accepted.
