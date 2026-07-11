# V2 Next Post-Preview-Proof Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Cleanup bucket plan

## Purpose

Select the next narrow commit bucket after `ea93959 Add AMS v2 preview proof
documentation`.

This plan does not stage, delete, move, revert, or commit files. It only names
the next exact staging set and the validation required before commit.

## Repo State Inspected

Commands inspected:

- `git diff --cached --name-only`
- `git status --short`
- `git diff --stat`
- `rg --files docs | rg '^(docs/v2_|docs/autonomous-|docs/stack_assessment/)'`
- representative reads of the candidate managed-provider and lifecycle docs

Current index state:

- no staged paths

Remaining dirty tree shape:

- tracked autonomous-loop and agent-control implementation changes;
- tracked documentation/index changes;
- untracked autonomous-loop milestone docs;
- untracked v2 managed-provider, lifecycle, route, imported-curation, and
  capability-selection docs;
- untracked v2 preview/import implementation source and tests;
- untracked production task-loop/agent-control source and tests.

## Selected Bucket

Select a docs-only bucket covering the v2 managed-provider run loop and
repeatable managed-run lifecycle helper.

Reason:

- it is coherent historical evidence for how v2 became able to run
  provider-backed work through existing Task/Run/Artifact/Review/Decision
  records;
- it explains the manual proof, launch/completion boundary, lifecycle helper,
  closure assessment, and next milestone;
- it preserves the anti-bloat boundary: no scheduler, router, local model,
  session schema, workflow engine, or UI expansion;
- it does not require staging implementation source yet;
- it keeps imported-backlog curation and autonomous-loop production changes for
  separate review.

## Include Exactly

Stage exactly these paths:

```text
docs/v2_managed_provider_agent_run_loop_plan_v0_1.md
docs/v2_first_manual_managed_provider_run_proof_v0_1.md
docs/v2_managed_provider_run_loop_closure_assessment_v0_1.md
docs/v2_next_capability_after_managed_provider_loop_v0_1.md
docs/v2_minimal_managed_run_lifecycle_helper_contract_v0_1.md
docs/v2_managed_run_lifecycle_complete_helper_implementation_v0_1.md
docs/v2_repeatable_managed_run_lifecycle_goal_closure_assessment_v0_1.md
docs/v2_next_milestone_after_lifecycle_helper_v0_1.md
docs/v2_next_post_preview_proof_cleanup_bucket_plan_v0_1.md
```

## Exclude

Do not stage:

- `.agents/skills/ams-agent-interface/SKILL.md`
- `docs/README.md`
- `docs/agent-facing-ams-interface-v0.md`
- `docs/ams-cli-reference.md`
- `docs/autonomous-*`
- `scripts/*`
- `src/*`
- `src/routes/*`
- `docs/v2_imported_*`
- `docs/v2_route_*`
- `docs/v2_repeated_*`
- `docs/v2_next_capability_after_*` except
  `docs/v2_next_capability_after_managed_provider_loop_v0_1.md`
- preview/import implementation files
- task-loop/agent-control source files
- runtime data files

## Exact Staging Command

```sh
git add \
  docs/v2_managed_provider_agent_run_loop_plan_v0_1.md \
  docs/v2_first_manual_managed_provider_run_proof_v0_1.md \
  docs/v2_managed_provider_run_loop_closure_assessment_v0_1.md \
  docs/v2_next_capability_after_managed_provider_loop_v0_1.md \
  docs/v2_minimal_managed_run_lifecycle_helper_contract_v0_1.md \
  docs/v2_managed_run_lifecycle_complete_helper_implementation_v0_1.md \
  docs/v2_repeatable_managed_run_lifecycle_goal_closure_assessment_v0_1.md \
  docs/v2_next_milestone_after_lifecycle_helper_v0_1.md \
  docs/v2_next_post_preview_proof_cleanup_bucket_plan_v0_1.md
```

## Validation Before Commit

Run:

```sh
git diff --cached --name-only
git diff --cached --stat
git diff --cached --check
```

The cached path list must match the included path list exactly.

Review representative docs before commit:

- `docs/v2_managed_provider_agent_run_loop_plan_v0_1.md`
- `docs/v2_minimal_managed_run_lifecycle_helper_contract_v0_1.md`
- `docs/v2_repeatable_managed_run_lifecycle_goal_closure_assessment_v0_1.md`

Confirm:

- docs-only bucket;
- no source code;
- no runtime data;
- no prototype/control-plane implementation changes;
- no broad docs index changes;
- no imported-backlog curation docs;
- no autonomous-loop production docs.

## Commit Message Candidate

```text
Add AMS v2 managed provider lifecycle docs
```

## Next Step

Create a follow-up task to stage this exact bucket and stop before committing.
