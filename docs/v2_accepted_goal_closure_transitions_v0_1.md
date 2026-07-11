# V2 Accepted Goal Closure Transitions v0.1

Date: 2026-07-10
Status: State transition output

## Purpose

Apply accepted AMS v2 closure recommendations through the supported
`transition-goal` command instead of leaving completed milestone goals in
misleading `active` status.

Task/run:

- task: `task_v2_core_apply_accepted_goal_closure_transitions`
- run: `run_v2_core_apply_accepted_goal_closure_transitions`

## Status Changes Applied

| Goal id | Previous status | New status | Decision id | Evidence |
| --- | --- | --- | --- | --- |
| `goal_ams_v2_minimal_loop` | active | completed | `decision_v2_core_complete_minimal_loop_goal` | `docs/v2_minimal_loop_goal_closure_assessment_v0_1.md` recommends closure. |
| `goal_ams_v2_route_comparison` | active | completed | `decision_v2_core_complete_route_comparison_goal` | `docs/v2_route_comparison_goal_closure_assessment_v0_1.md` recommends closure. |
| `goal_ams_v2_managed_provider_run_loop` | active | completed | `decision_v2_core_complete_managed_provider_run_loop_goal` | `docs/v2_managed_provider_run_loop_closure_assessment_v0_1.md` recommends closure. |

## Explicit Non-Change

`goal_ams_v2_imported_prototype_backlog_curation` remains `active`.

Reason: the task contract allowed closing only goals with accepted closure
assessments. The imported prototype backlog curation work now has accepted
state-transition outputs, but it does not yet have a dedicated closure
assessment.

## Boundary Observed

This pass did not add schema, UI, dashboards, bulk helpers, scheduler, routing,
local-model runtime, or new workflow entities. It did not delete or move
prototype/imported records.

## Validation

Validation readbacks confirmed:

- the three closure-supported AMS v2 goals now have status `completed`;
- the imported prototype backlog curation goal remains `active`;
- `goal_status_transition` decisions for the three goal closures are searchable;
- `operator-console --project project_ams_v2_core` shows only the curation goal
  as active after these transitions;
- `next-work --project project_ams_v2_core` returns no candidates while this
  current task is still in progress.
