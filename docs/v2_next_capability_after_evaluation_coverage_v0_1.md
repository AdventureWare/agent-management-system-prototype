# V2 Next Capability After Evaluation Coverage v0.1

Date: 2026-07-10
Status: Capability recommendation

## Purpose

Choose the next bounded AMS v2 capability after adding capability-level
evaluation coverage for agent work packets, agent control, and local retrieval.

This is a planning artifact. It should keep the next implementation step from
turning into automatic routing, local-model orchestration, UI expansion, model
registry migration, or governance bloat.

## Evidence Inspected

- `npm run v2:core-db -- next-work --project project_ams_v2_core --json`
- `npm run v2:core-db -- inspect-task --task task_v2_core_choose_next_capability_after_evaluation_coverage --json`
- `npm run v2:core-db -- operator-console --project project_ams_v2_core --json`
- `npm run v2:core-db -- dependency-reduction-report --project project_ams_v2_core --json`
- `docs/v2_requirements_v0_1.md`
- `docs/v2_architecture_v0_1.md`
- `docs/v2_registry_schema_boundary_and_source_label_migration_plan_v0_1.md`
- `docs/v2_minimal_slice_gap_reconciliation_v0_1.md`
- `docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md`

## Current V2 Core Capability

V2 core now has:

- one active project and goal
- a proven task/run/artifact/review/decision/memory work loop
- an agent-control surface
- source-linked local retrieval
- evaluation scenarios and results
- dependency-reduction reporting over evaluation/provider/tool evidence
- three evaluated `hybrid_candidate` capabilities:
  - `agent-work-packet`
  - `agent-control-surface`
  - `local-retrieval`

The current goal has proved the minimal v2 work loop. The next batch should
begin moving from loop proof toward provider/model route rationale without
claiming automatic routing or local replacement.

## Recommendation

The next capability should be:

**Minimal Routing Decision Evidence**

This should use accepted `Decision` records with a routing-specific
`decisionType`, plus a small read model. It must not introduce a standalone
`RoutingDecision` table or production routing policy.

## Why This Is Next

The larger AMS goal is to reduce dependence on external AI by turning provider
choices into owned, reviewable workflows.

The system can now answer:

- what work was done
- what context was supplied
- what artifacts were produced
- what tool/provider was used
- what evaluation evidence exists
- which capabilities are still hybrid candidates

The next missing answer is:

Why was this provider/model/execution route chosen for this task, and what
alternatives were rejected?

That question matters before local-model work or routing policy because the
system needs evidence about route choice before it can compare or automate
routes.

## What To Implement Next

Create one implementation task:

`task_v2_core_minimal_routing_decision_evidence`

Scope:

- record task/run-linked route choices as existing `Decision` records
- use `decisionType = route_selection`
- define a small text convention for route-selection decisions:
  - `Selected provider: <provider id>`
  - `Selected model: <model label>`
  - `Selected route: <human/external-ai/local-tool/local-model/etc>`
  - `Capability: <capability name>`
  - `Rejected alternatives: <semicolon-separated alternatives>`
  - `Evidence: <semicolon-separated evidence ids or labels>`
- add a read model that returns route-selection decisions with parsed
  provider/model/route/capability/rejected/evidence labels
- expose that read model through CLI JSON
- expose the same read model through `agent-control`
- add focused smoke coverage proving readback, source linkage, and search

## What Not To Add Yet

Do not add:

- standalone `RoutingDecision` table/entity
- automatic routing
- routing policy table
- model registry migration
- model catalog sync
- provider retirement policy
- local-model execution
- embeddings
- UI/dashboard work
- new lifecycle states

## Why Not Local Models Next

No local model runtime was found on the current PATH during planning. Even if a
runtime is installed later, local-model comparison should be driven by explicit
route-choice evidence and existing evaluations, not by assuming local execution
is ready.

## Why Not Automatic Routing Next

The model decision on `RoutingDecision` rejects a standalone production routing
entity and points toward accepted `Decision` records first. Automatic routing
would need provider/model registry maturity, capability evidence thresholds,
and failure handling that do not exist yet.

## Acceptance Criteria For The Next Task

The next implementation task is complete when:

- a route-selection decision can be recorded for a task/run
- route evidence is readable through CLI JSON
- route evidence is readable through `agent-control`
- readback includes selected provider, selected model, selected route,
  capability, rejected alternatives, and evidence labels when present
- local retrieval/search can find route-selection decisions
- no schema, standalone routing entity, routing policy, local-model runtime,
  model registry migration, dashboard, or automatic routing is added
- focused tests and `npm run check` pass
- work is recorded through the v2 control loop

## Goal Boundary

The minimal v2 work-loop goal is effectively proven. This next capability may
still be linked to the current goal as the final bridge from loop proof to the
next larger goal: evidence-based provider/model routing.

After this task, reassess whether to close `goal_ams_v2_minimal_loop` and open a
new goal around provider/model route comparison and external-AI reduction.

## Next Task

Create exactly one implementation follow-up:

`Add minimal v2 core routing decision evidence`
