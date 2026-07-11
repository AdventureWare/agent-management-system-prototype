# V2 First Real Dogfood Task Selection v0.1

Date: 2026-07-11
Status: Selection artifact

## Purpose

Select the first real non-AMS-implementation task to run through AMS v2.

Task/run:

- task: `task_v2_core_select_first_real_dogfood_task`
- run: `run_v2_core_select_first_real_dogfood_task`

## Evidence Reviewed

- `inspect-task --task task_v2_core_select_first_real_dogfood_task`
- `operator-console --project project_ams_v2_core`
- `operator-console --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1`
- `search-context --project project_8d6f064a-e10a-46fe-a8ef-9fe0f1fd11e1 --query "Kwipoo paying customer repo management active goal operator decision low risk real task"`
- read-only SQLite goal listing for imported prototype project
- recent user concern that v2 should do real work, not just test/proof goals

## Candidate Sources

Imported active goals with no open tasks:

- `goal_d6d74659-eb0f-4060-8343-ee8d3f577117`: Get a paying Kwipoo customer
- `goal_2a62bd5a-b698-4274-98cf-f4e9e0932f56`: Reduce friction and frustration with repo management

Paused goals:

- Stable, comprehensible AMS operator UI
- Usable mobile AMS workflow

The paused AMS UI/mobile goals are not appropriate for the first real dogfood
task because they would pull the work back into AMS implementation.

## Selected Task

Create and run this next task:

`task_v2_core_classify_current_repo_state_for_cleanup`

Title:

Classify current repo state into cleanup buckets

Goal/project linkage:

- project: `project_ams_v2_core`
- AMS v2 milestone goal: `goal_ams_v2_first_real_dogfood_task`
- imported real-world goal advanced:
  `goal_2a62bd5a-b698-4274-98cf-f4e9e0932f56`
  - "Reduce friction and frustration with repo management"

## Why This Task

This is the best first real dogfood task because it is:

- real: the repo currently has a large dirty state and many untracked artifacts;
- useful: repo-state confusion is one of the user's explicit active goals;
- local-first: it can be done from local git and file inspection without
  external accounts, deployment, browser access, product secrets, or customer
  contact;
- low risk: the task can be read-only and produce a cleanup plan without moving,
  deleting, reverting, committing, or editing source files;
- bounded: the output can be one artifact with buckets, risks, and a proposed
  next cleanup sequence;
- diagnostic for AMS v2: it tests whether v2 can manage a practical operator
  problem with context, run evidence, artifact review, decision, and follow-up.

## Task Contract

Recommended summary:

Inspect the current repository state and classify changed/untracked files into
reviewable cleanup buckets. Produce a concise cleanup plan that separates AMS v2
work, prototype/v1 work, documentation artifacts, generated/runtime data,
tests, and unknown/risky changes.

Success criteria:

- Read current git status and enough representative file paths to classify the
  dirty state.
- Produce `docs/current_repo_state_cleanup_buckets_v0_1.md`.
- Include buckets, representative files, likely ownership/source, risk level,
  recommended action, and suggested commit/review sequence.
- Identify anything that should not be touched without operator approval.
- Do not delete, move, revert, commit, or rewrite files.
- Do not implement product code.
- Record the result through AMS v2 run/artifact/review/decision state.

Validation plan:

- Run read-only git status/diff-summary commands.
- Inspect representative changed and untracked paths only as needed.
- Verify the artifact exists.
- Use AMS v2 lifecycle closeout to attach/review/accept the artifact.

Expected artifact:

- `docs/current_repo_state_cleanup_buckets_v0_1.md`

Stop conditions:

- Stop before destructive git commands.
- Stop before committing or staging files.
- Stop before broad refactors or cleanup implementation.
- Stop if classification requires access outside the current repo.
- Stop if a file appears sensitive or unclear enough that operator approval is
  needed before inspection.

## Deferred Candidates

### Kwipoo paying customer

Deferred for the first dogfood task.

Reason: this is important, but the first useful Kwipoo task likely needs product
context, market/customer assumptions, or access to a separate repo/site. Starting
there would mix AMS dogfooding with product strategy uncertainty.

### Broad imported-goal cleanup

Deferred.

Reason: the curation pass already preserved and classified imported goals. More
cleanup would be meta-work rather than real task execution.

### AMS UI/mobile work

Deferred.

Reason: these are paused and would pull the milestone back into AMS
implementation instead of testing v2 on a practical non-feature task.

## Acceptance Test For This Selection

This selection is acceptable if the next AMS v2 task is ready, linked to the
first-real-dogfood milestone, does not execute immediately, and has a contract
that keeps the first real dogfood run read-only and reviewable.
