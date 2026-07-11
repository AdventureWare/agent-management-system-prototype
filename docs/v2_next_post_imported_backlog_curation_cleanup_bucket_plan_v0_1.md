# V2 Next Post-Imported-Backlog-Curation Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Cleanup bucket plan

## Purpose

Select the next narrow commit bucket after
`f5ce310 Add AMS v2 imported backlog curation docs`.

This plan does not stage, delete, move, revert, or commit files. It only names
the next exact staging set and the validation required before commit.

## Repo State Inspected

Commands inspected:

- `git diff --cached --name-only`
- `git status --short`
- `git diff --stat`
- `rg --files docs | rg '^docs/v2_(route|repeated|agent_control|core_minimal|minimal|next_capability|next_milestone)'`
- representative reads of route-comparison, repeated route-selection,
  agent-control route interpretation, and capability-selection docs

Current index state:

- no staged paths

Remaining dirty tree shape:

- tracked autonomous-loop and agent-control implementation changes;
- tracked documentation/index/reference changes;
- untracked autonomous-loop milestone docs;
- untracked v2 route/capability evidence docs;
- untracked v2 minimal-loop checkpoint docs;
- untracked v2 preview/import implementation source and tests;
- untracked production task-loop/agent-control source and tests.

## Selected Bucket

Select a docs-only bucket covering the v2 capability-selection trail that led to
minimal route-comparison evidence, repeated route-selection evidence, route
comparison interpretation, and route-comparison goal closure.

Reason:

- it preserves the conservative evidence path from local retrieval and
  evaluation coverage into route-selection read models;
- it documents route comparison as evidence capture, not routing automation;
- it distinguishes `comparison_ready` from `replacement_ready`;
- it preserves explicit deferrals for local models, route scoring, provider
  retirement, dashboards, registries, and automatic routing;
- it keeps implementation source, autonomous-loop docs, minimal-loop closure
  docs, preview/import implementation files, runtime data, and broad docs
  indexes for separate review.

## Include Exactly

Stage exactly these paths:

```text
docs/v2_next_capability_after_agent_control_v0_1.md
docs/v2_next_capability_after_local_retrieval_v0_1.md
docs/v2_next_capability_after_evaluation_v0_1.md
docs/v2_next_capability_after_evaluation_coverage_v0_1.md
docs/v2_route_comparison_goal_plan_v0_1.md
docs/v2_repeated_route_selection_evidence_plan_v0_1.md
docs/v2_repeated_route_comparison_experiment_plan_v0_1.md
docs/v2_agent_control_route_comparison_interpretation_v0_1.md
docs/v2_route_comparison_goal_closure_assessment_v0_1.md
docs/v2_next_post_imported_backlog_curation_cleanup_bucket_plan_v0_1.md
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
- `docs/v2_minimal_*`
- `docs/v2_core_*`
- `docs/v2_next_milestone_*`
- preview/import implementation files
- task-loop/agent-control source files
- runtime data files

## Exact Staging Command

```sh
git add \
  docs/v2_next_capability_after_agent_control_v0_1.md \
  docs/v2_next_capability_after_local_retrieval_v0_1.md \
  docs/v2_next_capability_after_evaluation_v0_1.md \
  docs/v2_next_capability_after_evaluation_coverage_v0_1.md \
  docs/v2_route_comparison_goal_plan_v0_1.md \
  docs/v2_repeated_route_selection_evidence_plan_v0_1.md \
  docs/v2_repeated_route_comparison_experiment_plan_v0_1.md \
  docs/v2_agent_control_route_comparison_interpretation_v0_1.md \
  docs/v2_route_comparison_goal_closure_assessment_v0_1.md \
  docs/v2_next_post_imported_backlog_curation_cleanup_bucket_plan_v0_1.md
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

- `docs/v2_next_capability_after_evaluation_coverage_v0_1.md`
- `docs/v2_route_comparison_goal_plan_v0_1.md`
- `docs/v2_agent_control_route_comparison_interpretation_v0_1.md`
- `docs/v2_route_comparison_goal_closure_assessment_v0_1.md`

Confirm:

- docs-only bucket;
- no source code;
- no runtime data;
- no prototype/control-plane implementation changes;
- no autonomous-loop docs;
- no minimal-loop closure docs;
- no broad docs index changes.

## Commit Message Candidate

```text
Add AMS v2 route comparison evidence docs
```

## Next Step

Create a follow-up task to stage this exact bucket and stop before committing.
