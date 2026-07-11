# V2 Next Post-Managed-Provider-Lifecycle Cleanup Bucket Plan v0.1

Date: 2026-07-11
Status: Cleanup bucket plan

## Purpose

Select the next narrow commit bucket after
`210c4b6 Add AMS v2 managed provider lifecycle docs`.

This plan does not stage, delete, move, revert, or commit files. It only names
the next exact staging set and the validation required before commit.

## Repo State Inspected

Commands inspected:

- `git diff --cached --name-only`
- `git status --short`
- `git diff --stat`
- `rg --files docs | rg '^docs/v2_(imported|accepted_goal|minimal|next_capability|route|repeated|agent_control|core_minimal|next_implementation)'`
- representative reads of imported-prototype curation, goal-transition, goal
  closure, and milestone-selection docs

Current index state:

- no staged paths

Remaining dirty tree shape:

- tracked autonomous-loop and agent-control implementation changes;
- tracked documentation/index/reference changes;
- untracked autonomous-loop milestone docs;
- untracked v2 imported-prototype curation docs;
- untracked v2 route/comparison/capability-selection docs;
- untracked v2 preview/import implementation source and tests;
- untracked production task-loop/agent-control source and tests.

## Selected Bucket

Select a docs-only bucket covering imported prototype backlog curation, safe
goal-status transition evidence, closure of the curation goal, and the next
implementation milestone selection that followed.

Reason:

- it directly addresses the project concern that prototype residue should not
  become v2 operating truth;
- it records conservative curation decisions without deleting imported records;
- it distinguishes active work from archive, pause, supersede, and
  operator-decision cases;
- it documents supported status transitions rather than ad hoc SQL edits;
- it closes the curation goal and records the next milestone selection;
- it does not require staging implementation source yet;
- it keeps autonomous-loop production changes, preview/import implementation
  files, route-comparison docs, and broad index docs for separate review.

## Include Exactly

Stage exactly these paths:

```text
docs/v2_imported_prototype_backlog_curation_plan_v0_1.md
docs/v2_imported_prototype_first_curation_batch_v0_1.md
docs/v2_imported_prototype_curation_state_application_v0_1.md
docs/v2_imported_prototype_supported_goal_status_transitions_v0_1.md
docs/v2_accepted_goal_closure_transitions_v0_1.md
docs/v2_imported_prototype_backlog_curation_closure_assessment_v0_1.md
docs/v2_imported_backlog_curation_goal_closure_v0_1.md
docs/v2_next_implementation_milestone_selection_v0_1.md
docs/v2_next_post_managed_provider_lifecycle_cleanup_bucket_plan_v0_1.md
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
- `docs/v2_route_*`
- `docs/v2_repeated_*`
- `docs/v2_next_capability_after_*`
- `docs/v2_minimal_*`
- `docs/v2_agent_control_*`
- `docs/v2_core_*`
- preview/import implementation files
- task-loop/agent-control source files
- runtime data files

## Exact Staging Command

```sh
git add \
  docs/v2_imported_prototype_backlog_curation_plan_v0_1.md \
  docs/v2_imported_prototype_first_curation_batch_v0_1.md \
  docs/v2_imported_prototype_curation_state_application_v0_1.md \
  docs/v2_imported_prototype_supported_goal_status_transitions_v0_1.md \
  docs/v2_accepted_goal_closure_transitions_v0_1.md \
  docs/v2_imported_prototype_backlog_curation_closure_assessment_v0_1.md \
  docs/v2_imported_backlog_curation_goal_closure_v0_1.md \
  docs/v2_next_implementation_milestone_selection_v0_1.md \
  docs/v2_next_post_managed_provider_lifecycle_cleanup_bucket_plan_v0_1.md
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

- `docs/v2_imported_prototype_backlog_curation_plan_v0_1.md`
- `docs/v2_imported_prototype_first_curation_batch_v0_1.md`
- `docs/v2_imported_backlog_curation_goal_closure_v0_1.md`
- `docs/v2_next_implementation_milestone_selection_v0_1.md`

Confirm:

- docs-only bucket;
- no source code;
- no runtime data;
- no prototype/control-plane implementation changes;
- no autonomous-loop docs;
- no route-comparison docs;
- no broad docs index changes.

## Commit Message Candidate

```text
Add AMS v2 imported backlog curation docs
```

## Next Step

Create a follow-up task to stage this exact bucket and stop before committing.
