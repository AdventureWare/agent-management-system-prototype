# V2 First Design Docs Cleanup Staged Paths Review v0.1

Date: 2026-07-11
Status: Staged for pre-commit review

## Purpose

Stage the exact first cleanup bucket selected in
`docs/v2_first_post_runtime_dirty_tree_cleanup_commit_plan_v0_1.md` and stop
before committing.

AMS task/run:

- task: `task_v2_core_stage_first_design_docs_cleanup_commit`
- run: `run_v2_core_stage_first_design_docs_cleanup_commit`

## Commands Run

```sh
npm run v2:core-db -- inspect-task --task task_v2_core_stage_first_design_docs_cleanup_commit --json
git diff --cached --name-only
npm run v2:core-db -- launch-provider-run --id decision_v2_core_stage_first_design_docs_cleanup_commit_launch --run run_v2_core_stage_first_design_docs_cleanup_commit --task task_v2_core_stage_first_design_docs_cleanup_commit --provider provider_codex_external --input "Stage exactly the first v2 design docs cleanup commit paths." --action "Run the exact git add command from the cleanup plan, verify cached paths and cached stat, confirm only planned docs are staged, and stop before commit." --json
git add docs/design/ams_v2_design_bloat_audit.md docs/design/ams_v2_domain_ontology_and_behavior_spec.md docs/design/ams_v2_entity_cards.md docs/design/ams_v2_traceability_matrix.md docs/prototype_audit_v0_1.md docs/v1_to_v2_migration_plan_v0_1.md docs/v2_architecture_v0_1.md docs/v2_build_blueprint_v0_1.md docs/v2_domain_model_v0_1.md docs/v2_first_post_runtime_dirty_tree_cleanup_commit_plan_v0_1.md docs/v2_minimal_vertical_slice_v0_1.md docs/v2_next_major_subgoal_after_runtime_commit_v0_1.md docs/v2_rebuild_or_refactor_decision_v0_1.md docs/v2_requirements_v0_1.md
git diff --cached --name-only
git diff --cached --stat
git status --short
```

## Staged Paths

`git diff --cached --name-only` returned exactly:

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

## Validation

- The staged path list matches the expected list from the cleanup commit plan.
- `git diff --cached --stat` shows 14 documentation files and no code files.
- No prototype control-plane, UI, v2 preview/import, autonomous-loop,
  stack-assessment, or model-governance paths are staged.
- No test suite is required for this docs-only staging task.

## Explicitly Excluded

The staging command did not include:

- modified prototype/control-plane source files;
- modified prototype UI/source files;
- autonomous-loop v0.5/v0.6 docs;
- stack-assessment docs;
- model-change proposal and model-decision docs;
- v2 milestone evidence docs outside the selected list;
- v2 preview/import/migration scripts and source files;
- modified tracked domain-governance docs such as `docs/domain-glossary.md` and
  `docs/ontology-v1.md`.

## Result

The first v2 design docs cleanup bucket is staged for review. No commit was
made.

## Next Step

Review the staged docs diff and commit with message
`Add AMS v2 design source of truth` if acceptable. The commit should include
only the currently staged documentation files.
