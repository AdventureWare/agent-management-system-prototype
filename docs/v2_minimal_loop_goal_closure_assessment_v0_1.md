# V2 Minimal Loop Goal Closure Assessment v0.1

Date: 2026-07-10
Status: Closure recommendation

## Purpose

Assess whether `goal_ams_v2_minimal_loop` should close after the accepted work
on the v2 core loop, agent-control surface, local retrieval, evaluation
coverage, dependency-reduction reporting, and route-selection evidence.

This is not a request for more features. It is a boundary check.

## Evidence Inspected

- `npm run v2:core-db -- inspect-task --task task_v2_core_assess_minimal_loop_goal_closure --json`
- `npm run v2:core-db -- operator-console --project project_ams_v2_core --json`
- `npm run v2:core-db -- dependency-reduction-report --project project_ams_v2_core --json`
- `npm run v2:core-db -- evaluation-context --project project_ams_v2_core --json`
- `npm run v2:core-db -- routing-evidence --project project_ams_v2_core --limit 10 --json`
- `npm run v2:core-db -- memory-for-context --project project_ams_v2_core --limit 40 --json`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `docs/v2_minimal_slice_gap_reconciliation_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/v2_next_capability_after_evaluation_coverage_v0_1.md`

## Current State

Live v2 core state shows:

- one active project: `project_ams_v2_core`
- one active goal: `goal_ams_v2_minimal_loop`
- 30 goal-linked tasks
- 29 done tasks
- 1 open task, this closure assessment
- 29 approved reviews
- 29 trusted memory items before this assessment is closed
- no actionable review queue entries

The only open work exists because the system correctly created a final
assessment task instead of letting the active goal silently stall.

## Minimal Loop Exit Criteria

`docs/v2_minimal_vertical_slice_v0_1.md` says the slice is complete when an
operator can answer:

- what the project/goal is trying to accomplish
- what task is ready next, and why
- what context was given to the agent
- what run happened
- what tools were used
- what artifacts were produced
- what review, approval, or decision resulted
- what memory was proposed or published
- what relevant context is retrieved for follow-up
- what evaluation evidence exists
- which external AI dependency was reduced or remains

The current v2 core can answer those questions through existing read models and
records:

- project/goal state: `operator-console`, `inspect-task`
- next work: `next-work`, `operator-console`
- task context: `context-bundle`, `agent-work-packet`
- runs/tools/artifacts/reviews/decisions/memory: `inspect-task`
- trusted memory: `memory-for-context`
- local context discovery: `search-context`
- evaluation evidence: `evaluation-context`
- provider/tool dependency evidence: `dependency-report`
- capability-level dependency status: `dependency-reduction-report`
- route rationale evidence: `routing-evidence`

## Capability Evidence

The dependency-reduction report currently shows three evaluated capabilities:

- `agent-work-packet`: `hybrid_candidate`, passing evaluation, external provider
  plus local CLI tool evidence
- `agent-control-surface`: `hybrid_candidate`, passing evaluation, external
  provider plus local CLI tool evidence
- `local-retrieval`: `hybrid_candidate`, passing evaluation, external provider
  plus local CLI tool evidence

There are no evidence gaps for those three capabilities.

This is the right status. The system has not eliminated external AI use; it has
made that dependency explicit, evaluated, and visible by capability.

## Route Evidence

The routing-evidence readback returns one accepted `route_selection` decision:

- provider: `provider_codex_external`
- model: `codex-external`
- route: `external-ai`
- capability: `routing-decision-evidence`
- rejected alternatives:
  - local model unavailable
  - automatic routing deferred
  - standalone `RoutingDecision` rejected
- evidence:
  - `docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md`
  - `evaluation_result_v2_core_agent_control_surface`
  - `evaluation_result_v2_core_local_retrieval`

This is enough for the current goal. It proves route choices can be captured
without adding a routing policy, model registry migration, local-model runtime,
or standalone routing entity.

## Closure Verdict

Recommendation: close `goal_ams_v2_minimal_loop`.

Reason:

- the minimal loop is proven end to end
- prior strict-exit gaps were reconciled
- agent handoff, local retrieval, evaluation, dependency reporting, and route
  rationale evidence are now present
- the remaining external-AI dependency is visible rather than hidden
- further work now belongs to a new goal, not an ever-expanding "minimal loop"
  goal

Keeping this goal open would create scope drift. The useful next work is not to
make the minimal loop bigger; it is to use the loop for the next owned-agent
capability.

## What Is Not Proven Yet

The current system does not yet prove:

- local model execution
- automatic route selection
- provider/model comparison across repeated task classes
- provider retirement readiness
- model registry maturity
- broad repo retrieval beyond bounded v2 records
- autonomous launch or scheduling
- full v1 UI parity
- bulk v1 migration

These are not closure blockers for the minimal-loop goal. They are candidates
for later goals.

## Proposed Next Goal

Open a new goal:

`Establish evidence-based provider/model route comparison`

Goal statement:

Build the smallest v2 capability that lets AMS compare provider/model/execution
routes for repeated task types using reviewed route-selection decisions,
evaluation evidence, dependency reports, and failure notes. The goal is not
automatic routing yet. The goal is to make route choice evidence comparable
enough to decide what should become an owned/local workflow next.

Initial scope:

- inspect existing route-selection, evaluation, dependency, and memory evidence
- define the smallest comparison questions
- identify one repeated task class worth comparing
- decide whether current `Decision`, `EvaluationResult`, and dependency reports
  are enough or whether a narrowly justified read model is needed
- avoid adding a routing policy, model registry, dashboard, local-model runtime,
  or provider retirement automation until comparison evidence proves the need

## Recommended Follow-Up Task

Create one ready planning task:

`Plan evidence-based provider/model route comparison goal`

Purpose:

- close out the minimal-loop milestone without losing momentum
- define the first task under the new route-comparison goal
- keep the next step bounded to comparison questions and evidence needs

Acceptance:

- propose the new goal record and first implementation or planning task
- list the exact competency questions for route comparison
- state what existing evidence is sufficient
- state what is missing
- explicitly reject automatic routing, local-model orchestration, broad UI, and
  new schema unless the evidence proves they are needed

## Decision

Do not add another capability to `goal_ams_v2_minimal_loop`.

The next work should be under a new goal. The minimal loop is now strong enough
to be used as the operating substrate for that next goal.
