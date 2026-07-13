# V2 Next Milestone After Parity Cleanup v0.1

Date: 2026-07-13
Status: Milestone selection

## Purpose

Select the next AMS v2 milestone after preview-stack disposition and the v2 core
evidence-ownership parity fix.

This is a planning artifact. It does not implement code, schema, UI, routing
automation, local model execution, provider retirement, or additional
governance.

Task/run:

- task: `task_v2_core_plan_next_milestone_after_parity_cleanup`
- run: `run_v2_core_plan_next_milestone_after_parity_cleanup`

## Evidence Reviewed

- `operator-console --project project_ams_v2_core`
- `next-work --project project_ams_v2_core`
- `route-comparison-report --project project_ams_v2_core`
- `dependency-reduction-report --project project_ams_v2_core`
- `evaluation-context --project project_ams_v2_core`
- `search-context --project project_ams_v2_core --query "local retrieval"`
- `inspect-task --task task_v2_core_classify_current_repo_state_for_cleanup`
- `docs/v2_remaining_preview_stack_disposition_v0_1.md`
- `docs/v2_first_real_dogfood_task_selection_v0_1.md`
- `docs/v2_next_capability_after_local_retrieval_v0_1.md`
- `docs/v2_next_capability_after_evaluation_coverage_v0_1.md`
- `docs/v2_agent_control_route_comparison_interpretation_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`

## Current V2 State

AMS v2 core now has accepted evidence for:

- project, goal, task, run, artifact, review, decision, memory, tool,
  provider, evaluation, and source-reference state;
- next-work selection and bounded context/work packets;
- managed provider-run lifecycle helper;
- local retrieval over v2 core records;
- operator-console read model and read-only UI route;
- provider/tool dependency reporting;
- route-selection and route-comparison evidence;
- deterministic snapshot export/import;
- first-real-dogfood repo cleanup classification and many follow-up cleanup
  commits.

The live route-comparison report shows three comparison-ready capabilities:

- `agent-control-surface`
- `agent-work-packet`
- `local-retrieval`

The live dependency-reduction report shows the same three capabilities as
`hybrid_candidate`. That is the correct current status: AMS has local/owned
control-plane affordances, but external Codex still performs much of the
reasoning and implementation work.

The active goal is still:

`goal_ams_v2_first_real_dogfood_task` - Run first real non-AMS task through AMS
v2.

The first real dogfood task was already selected and completed:

`task_v2_core_classify_current_repo_state_for_cleanup`

It produced and accepted:

`docs/current_repo_state_cleanup_buckets_v0_1.md`

The goal now has no ready next-work candidates and one in-progress planning
task: this task.

## Key Finding

Do not pick another feature milestone yet.

The original first-real-dogfood milestone has probably served its purpose:
v2 selected a practical non-feature repo-management task, ran it through
provider-linked execution, produced a reviewed artifact, created follow-up
cleanup work, and used the resulting state to drive many subsequent cleanup
commits.

Before adding more capabilities, AMS should decide whether this goal is
complete and what evidence should be preserved from it.

## Recommendation

The next milestone should be:

**Assess and close the first-real-dogfood goal, or identify one final closeout
gap.**

This is not a new product capability. It is a goal-state assessment that tests
whether v2 can recognize that a goal has been satisfied instead of continuing
to generate more plausible work.

## Why This Is Next

It advances the larger owned-agent goal because an owned work system must know
when work has actually advanced a goal enough to stop, record what was learned,
and move to the next goal.

It also directly addresses the recurring failure mode in this project:

- adding more docs after the evidence is sufficient;
- adding more cleanup tasks because the repo is still not perfectly clean;
- continuing AMS-on-AMS work when the stated milestone was to prove real
  dogfood execution;
- treating every remaining dirty file as a reason to keep the same goal open.

The next question is not "what feature should AMS build next?" It is:

Did the first-real-dogfood goal succeed, and what next goal should replace it?

## Minimal Next Task

Create one ready assessment task:

`task_v2_core_assess_first_real_dogfood_goal_closure`

Acceptance criteria:

- inspect the active goal, completed dogfood task, accepted artifacts, follow-up
  cleanup lineage, current dirty tree, and live capability reports;
- decide whether `goal_ams_v2_first_real_dogfood_task` is complete;
- if complete, recommend a supported goal transition to `completed`;
- if not complete, identify exactly one final closeout task;
- produce one short closure assessment artifact;
- do not add code, schema, UI, routing policy, local model integration,
  dashboard work, or preview stack ports;
- do not delete, move, revert, stage, or commit remaining preview/prototype
  leftovers as part of the assessment.

Suggested artifact:

`docs/v2_first_real_dogfood_goal_closure_assessment_v0_1.md`

## Explicit Non-Goals

Do not use the next step to:

- implement local models;
- add routing automation;
- add a provider/model registry;
- add dashboards or more operator UI;
- create a Workflow or Skill entity;
- port remaining preview services wholesale;
- clean every remaining untracked file;
- redefine the v2 ontology;
- start a new AMS feature milestone without first closing or superseding the
  current active goal.

## Deferred Work

These may still matter, but not before the closure assessment:

| Direction | Deferred because |
| --- | --- |
| Local model runtime | No evidence yet that a local model can replace Codex reasoning for implementation work. |
| Automatic routing | Route evidence exists, but policy and failure handling are not proven. |
| Provider retirement | Current capability status is `hybrid_candidate`, not replacement-ready. |
| Preview stack cleanup | Disposition already says do not commit wholesale; remaining cleanup should be separate and explicit. |
| More UI | The current bottleneck is goal closure and next-goal selection, not display coverage. |

## Validation

This milestone selection is valid if:

- it uses current v2 state rather than stale "next capability" docs;
- it recognizes already-completed milestones;
- it selects exactly one next task;
- it does not expand the domain model;
- it does not implement code;
- it keeps the remaining preview stack untouched;
- it creates a path to either close the active goal or name one concrete
  remaining gap.

## Decision

Proceed with a first-real-dogfood goal closure assessment.

Do not add another v2 feature before deciding whether the active dogfood goal
has been satisfied.
