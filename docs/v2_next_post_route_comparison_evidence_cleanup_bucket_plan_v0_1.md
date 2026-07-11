# V2 Next Post-Route-Comparison-Evidence Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Cleanup bucket plan

## Purpose

Select the next narrow commit bucket after
`d37252a Add AMS v2 route comparison evidence docs`.

This plan does not stage, delete, move, revert, or commit files. It only names
the next exact staging set and the validation required before commit.

## Repo State Inspected

Commands inspected:

- `git diff --cached --name-only`
- `git status --short`
- `git diff --stat`
- `rg --files docs | rg '^docs/(v2_core|v2_minimal|v2_next_milestone|autonomous)'`
- representative reads of v2 minimal-loop checkpoint, minimal-slice completion,
  gap reconciliation, agent-control surface, next-milestone, and closure docs

Current index state:

- no staged paths

Remaining dirty tree shape:

- tracked autonomous-loop and agent-control implementation changes;
- tracked documentation/index/reference changes;
- untracked autonomous-loop milestone docs;
- untracked v2 core/minimal-loop milestone docs;
- untracked v2 preview/import implementation source and tests;
- untracked production task-loop/agent-control source and tests.

## Selected Bucket

Select a docs-only bucket covering the v2 minimal-loop/core milestone trail:
minimal-loop checkpoint, agent work packet milestone selection, minimal-slice
completion assessment, gap reconciliation, agent-control surface contract,
next milestone after minimal slice, and minimal-loop goal closure.

Reason:

- it preserves the proof chain for the first v2 core minimal loop;
- it records explicit deferrals and substitutions for `WorkSession`,
  standalone `Approval`, model registry, execution surfaces, persisted
  dependency-reduction records, broad retrieval, routing, local models, and UI
  expansion;
- it documents agent-control as a thin surface over existing v2 core operations,
  not a second app or broad mutation suite;
- it keeps implementation source, autonomous-loop docs, preview/import files,
  runtime data, and broad docs index/reference updates for separate review.

## Include Exactly

Stage exactly these paths:

```text
docs/v2_core_minimal_loop_checkpoint_v0_1.md
docs/v2_next_milestone_after_agent_packet_v0_1.md
docs/v2_minimal_slice_completion_assessment_v0_1.md
docs/v2_minimal_slice_gap_reconciliation_v0_1.md
docs/v2_next_milestone_after_minimal_slice_v0_1.md
docs/v2_core_agent_control_surface_v0_1.md
docs/v2_minimal_loop_goal_closure_assessment_v0_1.md
docs/v2_next_post_route_comparison_evidence_cleanup_bucket_plan_v0_1.md
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
- `docs/v2_next_*route*`
- preview/import implementation files
- task-loop/agent-control source files
- runtime data files

## Exact Staging Command

```sh
git add \
  docs/v2_core_minimal_loop_checkpoint_v0_1.md \
  docs/v2_next_milestone_after_agent_packet_v0_1.md \
  docs/v2_minimal_slice_completion_assessment_v0_1.md \
  docs/v2_minimal_slice_gap_reconciliation_v0_1.md \
  docs/v2_next_milestone_after_minimal_slice_v0_1.md \
  docs/v2_core_agent_control_surface_v0_1.md \
  docs/v2_minimal_loop_goal_closure_assessment_v0_1.md \
  docs/v2_next_post_route_comparison_evidence_cleanup_bucket_plan_v0_1.md
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

- `docs/v2_minimal_slice_completion_assessment_v0_1.md`
- `docs/v2_minimal_slice_gap_reconciliation_v0_1.md`
- `docs/v2_next_milestone_after_minimal_slice_v0_1.md`
- `docs/v2_minimal_loop_goal_closure_assessment_v0_1.md`

Confirm:

- docs-only bucket;
- no source code;
- no runtime data;
- no autonomous-loop docs;
- no preview/import implementation files;
- no broad docs index/reference changes;
- no route-comparison docs already committed in `d37252a`.

## Commit Message Candidate

```text
Add AMS v2 minimal loop milestone docs
```

## Next Step

Create a follow-up task to stage this exact bucket and stop before committing.
