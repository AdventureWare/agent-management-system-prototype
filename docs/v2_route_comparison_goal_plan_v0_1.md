# V2 Route Comparison Goal Plan v0.1

Date: 2026-07-10
Status: Goal plan

## Purpose

Plan the first bounded work under `goal_ams_v2_route_comparison`.

This goal should make route choices comparable enough to decide what should
become an owned or local workflow next. It should not become automatic routing,
local-model orchestration, dashboard work, or a new routing schema.

## Current Evidence

Existing v2 core evidence is enough to build a first comparison report shape:

- route choices are captured as `Decision` records with
  `decisionType = route_selection`
- `routing-evidence` parses selected provider, selected model, selected route,
  capability, rejected alternatives, and evidence labels
- `evaluation-context` exposes scenario-linked evaluation results
- `dependency-reduction-report` classifies evaluated capabilities from existing
  provider/tool evidence
- `memory-for-context` records accepted milestone facts

The current live project evidence is not enough for real provider/model
comparison yet:

- only one live route-selection decision exists
- no repeated task class has multiple route choices
- no local-model route has been executed
- no provider alternatives have been tested head-to-head

## Competency Questions

The route-comparison goal should answer:

- Which capabilities have route-selection evidence?
- Which selected provider, model, and execution route were used?
- Which alternatives were rejected?
- What evaluation evidence supports the route?
- What dependency-reduction status does the capability currently have?
- Which capabilities have evaluations but no route-selection evidence?
- Which capabilities have route-selection evidence but no evaluation result?
- Is a capability ready for comparison, or does it need more route evidence?
- What route evidence should be captured next before automation is considered?

## Sufficient Existing Evidence

Existing records are sufficient for a computed read model:

- `Decision` records for route selections
- `EvaluationScenario` and `EvaluationResult` records for capability evidence
- `Run` records for provider evidence
- `ToolExecution` records for local tool evidence
- dependency-reduction report rows for capability status

No new persisted entity is justified for the next step.

## Missing Evidence

Current evidence gaps:

- route-selection decisions for `agent-work-packet`, `agent-control-surface`,
  and `local-retrieval`
- repeated route choices for the same capability
- explicit failure or rejection notes for tested alternatives
- any local-model execution evidence
- any provider/model comparison across the same task class

These gaps should be reported, not hidden.

## Next Implementation Task

Create one implementation task:

`Add minimal route-comparison evidence report`

Scope:

- add a computed route-comparison report over existing records
- expose it through CLI JSON
- expose it through `agent-control`
- add focused smoke coverage
- dogfood against `project_ams_v2_core`

Report rows should be grouped by capability and include:

- capability name
- route-selection decision count
- selected providers
- selected models
- selected routes
- rejected alternatives
- evaluation result ids and statuses
- dependency-reduction status
- evidence gaps
- recommendation:
  - `needs_more_route_evidence`
  - `comparison_ready`
  - `defer`

## What Not To Build

Do not add:

- standalone `RoutingDecision`
- new database schema
- routing policy
- automatic routing
- local-model execution
- provider retirement automation
- model registry migration
- dashboard or UI
- broad capability taxonomy

## Acceptance Criteria

The next task is complete when:

- `route-comparison-report` returns capability-level rows from existing records
- `agent-control --agent-action route-comparison-report` returns the same report
- capabilities with evaluations but no route selections show evidence gaps
- capabilities with one route selection are marked as needing more route evidence
- focused tests and `npm run check` pass
- live dogfood against `project_ams_v2_core` shows the current evidence is thin
  rather than falsely comparison-ready

## Decision

Proceed with a computed report first.

Do not add schema or automation until route-selection evidence exists across
comparable repeated task classes.
