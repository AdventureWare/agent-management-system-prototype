# V2 Next Post-Autonomous-Work-Loop-v0.5 Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Cleanup bucket plan

## Purpose

Select the next narrow commit bucket after
`3b3d105 Add autonomous work loop v0.5 evidence docs`.

This plan does not stage, delete, move, revert, or commit files. It only names
the next exact staging set and the validation required before commit.

## Repo State Inspected

Commands inspected:

- `git diff --cached --name-only`
- `git status --short`
- `git diff --stat`
- representative reads of autonomous work-loop v0.6 docs
- representative read of `docs/autonomous-goal-directed-work-loop-v0-completion-audit.md`

Current index state:

- no staged paths

Remaining dirty tree shape:

- tracked autonomous-loop and agent-control implementation changes;
- tracked documentation/index/reference changes;
- untracked autonomous-loop v0.6 docs;
- untracked autonomous-loop v0 completion audit;
- untracked v2 preview/import implementation source and tests;
- untracked production task-loop/agent-control source and tests.

## Selected Bucket

Select a docs-only bucket covering the autonomous work-loop v0.6 managed
continuation-runner proof.

Reason:

- the v0.6 docs form a coherent sequence: runner contract, continuation
  reconciliation, runner proof implementation, entrypoint validation, and
  post-runner continuation assessment;
- the bucket records the strict runner boundary: read/preview/materialize-one
  only, with no scheduler, auto-launch, auto-approval, broad UI, new domain
  entity, schema change, or direct database writes;
- it preserves evidence about approval-gate hard stops and actionable-path
  stop-before-launch behavior;
- it keeps the broader v0 completion audit, source code, runtime data,
  preview/import files, and broad docs index/reference updates for separate
  review.

## Include Exactly

Stage exactly these paths:

```text
docs/autonomous-work-loop-v0-6-managed-continuation-runner-contract.md
docs/autonomous-work-loop-v0-6-continuation-reconciliation.md
docs/autonomous-work-loop-v0-6-runner-proof-implementation.md
docs/autonomous-work-loop-v0-6-runner-entrypoint-validation.md
docs/autonomous-work-loop-v0-6-post-runner-continuation-assessment.md
docs/v2_next_post_autonomous_work_loop_v0_5_cleanup_bucket_plan_v0_1.md
```

## Exclude

Do not stage:

- `.agents/skills/ams-agent-interface/SKILL.md`
- `docs/README.md`
- `docs/agent-facing-ams-interface-v0.md`
- `docs/ams-cli-reference.md`
- `docs/autonomous-goal-directed-work-loop-v0.md`
- `docs/autonomous-goal-directed-work-loop-v0-completion-audit.md`
- `scripts/*`
- `src/*`
- `src/routes/*`
- preview/import implementation files
- production task-loop/agent-control source files
- runtime data files

## Exact Staging Command

```sh
git add \
  docs/autonomous-work-loop-v0-6-managed-continuation-runner-contract.md \
  docs/autonomous-work-loop-v0-6-continuation-reconciliation.md \
  docs/autonomous-work-loop-v0-6-runner-proof-implementation.md \
  docs/autonomous-work-loop-v0-6-runner-entrypoint-validation.md \
  docs/autonomous-work-loop-v0-6-post-runner-continuation-assessment.md \
  docs/v2_next_post_autonomous_work_loop_v0_5_cleanup_bucket_plan_v0_1.md
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

- `docs/autonomous-work-loop-v0-6-managed-continuation-runner-contract.md`
- `docs/autonomous-work-loop-v0-6-runner-proof-implementation.md`
- `docs/autonomous-work-loop-v0-6-runner-entrypoint-validation.md`
- `docs/autonomous-work-loop-v0-6-post-runner-continuation-assessment.md`

Confirm:

- docs-only bucket;
- no source code;
- no runtime data;
- no broad v0 completion audit;
- no broad docs index/reference changes.

## Commit Message Candidate

```text
Add autonomous work loop v0.6 runner docs
```

## Next Step

Create a follow-up task to stage this exact bucket and stop before committing.
