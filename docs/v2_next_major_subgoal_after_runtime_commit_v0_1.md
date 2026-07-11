# V2 Next Major Sub-Goal After Runtime Commit v0.1

Date: 2026-07-11
Status: Accepted next sub-goal selection

## Purpose

Select the next major AMS v2 sub-goal after the clean v2 core runtime commit.
This is a selection/design task only: no code, schema, UI, staging, deletion, or
commit changes were made.

AMS task/run:

- task: `task_v2_core_select_next_major_subgoal_after_runtime_commit`
- run: `run_v2_core_select_next_major_subgoal_after_runtime_commit`

## Evidence Reviewed

- `docs/v2_core_runtime_commit_closeout_v0_1.md`
- `docs/current_repo_state_cleanup_buckets_v0_1.md`
- `git status --short`
- `git diff --stat`
- `git ls-files --others --exclude-standard`
- `npm run v2:core-db -- operator-console --project project_ams_v2_core --json`
- `npm run v2:core-db -- dependency-report --project project_ams_v2_core --json`
- `npm run v2:core-db -- evaluation-context --project project_ams_v2_core --json`

## Current State

The v2 core runtime foundation now has a clean committed checkpoint:

```text
c70b33c Add AMS v2 core runtime loop
```

AMS v2 evidence shows the runtime loop is usable:

- v2 core has structured task/run/artifact/review/decision state.
- The current dogfood goal has completed the runtime review/commit path.
- Evaluation evidence exists for agent work packets, agent-control surface, and
  local retrieval.
- Provider dependency is visible: v2 work is still heavily backed by
  `provider_codex_external`.

The repo remains dirty because several older or parallel work streams are still
uncommitted:

- v1/prototype control-plane and agent API changes.
- prototype UI/operator-surface changes.
- autonomous-loop v0.5/v0.6 docs and skill updates.
- v2 design, stack, ontology, and milestone evidence docs.
- v2 preview/import/migration experiments.
- model-governance proposal and decision docs.

## Candidate Next Sub-Goals

### Candidate A: Continue adding v2 features

Rejected for now.

Reason: the committed v2 core is useful, but the repo still contains many
unreviewed changes. Adding more features now would hide useful work inside more
noise and repeat the prototype failure mode.

### Candidate B: Run multiple real external goals through v2

Deferred.

Reason: this is important, but it should happen after the repo has a cleaner
baseline. Dogfooding on a dirty repo is already revealing process debt; ignoring
that debt would make later evidence less trustworthy.

### Candidate C: Reduce provider dependency / add owned model routing

Deferred.

Reason: v2 tracks external provider usage, but provider reduction should be
driven by repeatable tasks and clean evidence. It should not start while the
local repo state is still ambiguous.

### Candidate D: Clean and stabilize the remaining dirty repo state

Accepted.

Reason: the biggest current risk is not missing functionality. It is carrying
too much unreviewed, cross-cutting work. Cleaning the dirty tree directly
supports the larger AMS v2 goal because it prevents inherited prototype bloat,
separates useful artifacts from experiments, and creates a trustworthy base for
future dogfooding.

## Selected Next Sub-Goal

Clean and stabilize the remaining dirty repo state after the v2 core runtime
checkpoint.

This sub-goal means:

- classify remaining dirty/untracked files after the v2 core commit;
- decide which buckets should be committed, deferred, archived, or discarded;
- make small, reviewable commits for accepted buckets;
- avoid broad deletes, broad staging, and mixed-purpose commits;
- keep v2 core clean and avoid pulling superseded preview/prototype concepts
  into the production v2 path by accident.

## First Implementation-Ready Task

Task title:

`Prepare first post-runtime dirty-tree cleanup commit plan`

Success criteria:

- Re-read current `git status --short`, `git diff --stat`, and untracked paths
  after commit `c70b33c`.
- Compare the remaining dirty tree against
  `docs/current_repo_state_cleanup_buckets_v0_1.md`.
- Select the first safe cleanup commit bucket.
- Produce an exact staging plan for that bucket.
- Do not stage, delete, move, revert, or commit files.

Validation plan:

- Verify no cached paths are present before planning.
- Produce an artifact naming included paths, excluded paths, validation needed,
  and commit message candidate.
- Create a follow-up task for staging exactly that bucket only.

Recommended first bucket:

Design/source-of-truth and v2 milestone evidence docs, unless inspection shows a
smaller or safer bucket. Docs are lower risk than prototype control-plane/UI
changes and should preserve the reasoning behind the committed v2 runtime.

## Rejected Cleanup Shortcuts

- Do not run `git add .`.
- Do not run destructive cleanup commands.
- Do not revert broad tracked changes without reviewing whether the operator
  relies on them.
- Do not delete untracked docs just because they are numerous.
- Do not commit v2 preview/import experiments as production v2 core.
- Do not mix prototype control-plane changes with v2 design docs.

## Open Risks

- Some prototype control-plane changes may still be operationally useful.
- Some v2 preview/import files may be superseded by v2 core but still useful as
  migration evidence.
- Some docs may be stale or duplicate, but that should be decided explicitly in
  cleanup buckets rather than by broad deletion.

## Result

The next major AMS v2 sub-goal should be dirty-tree cleanup and stabilization.
This is not governance for its own sake. It is the work needed to stop the repo
from becoming another accumulated prototype and to make the next implementation
steps reviewable.
