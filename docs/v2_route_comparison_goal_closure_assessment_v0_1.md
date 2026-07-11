# V2 Route Comparison Goal Closure Assessment v0.1

Date: 2026-07-10
Status: Closure recommendation

## Purpose

Assess whether `goal_ams_v2_route_comparison` should close after recording
baseline and second-route evidence for the evaluated v2 capabilities.

This is not a request for routing automation, provider retirement, route
scoring, local-model orchestration, schema work, or UI work.

## Evidence Inspected

- `route-comparison-report --project project_ams_v2_core`
- `routing-evidence --project project_ams_v2_core`
- `dependency-reduction-report --project project_ams_v2_core`
- `evaluation-context --project project_ams_v2_core`
- `operator-console --project project_ams_v2_core`
- `search-context --project project_ams_v2_core --query "managed provider run Codex agent launch task artifact review"`
- `docs/v2_route_comparison_goal_plan_v0_1.md`
- `docs/v2_repeated_route_comparison_experiment_plan_v0_1.md`
- `docs/v2_agent_control_route_comparison_interpretation_v0_1.md`
- `docs/v2_minimal_loop_goal_closure_assessment_v0_1.md`

## Current State

The route-comparison report now shows:

- `capabilityCount`: 4
- `comparisonReadyCount`: 3
- `needsMoreRouteEvidenceCount`: 0
- `deferCount`: 1
- `routeSelectionDecisionCount`: 7

The three evaluated capabilities are comparison-ready:

| Capability | Routes represented | Dependency status | Recommendation |
| --- | --- | --- | --- |
| `agent-control-surface` | `external-ai`, `local-tool` | `hybrid_candidate` | `comparison_ready` |
| `agent-work-packet` | `external-ai`, `local-tool` | `hybrid_candidate` | `comparison_ready` |
| `local-retrieval` | `external-ai`, `local-tool` | `hybrid_candidate` | `comparison_ready` |

`routing-decision-evidence` remains deferred because it has route-selection
evidence but no evaluation result and no dependency-reduction classification.
That is acceptable. It is not one of the evaluated capabilities this goal set
out to compare.

## What The Goal Proved

The goal proved that AMS v2 can:

- capture route-selection decisions using existing `Decision` records;
- parse selected provider, model, route, capability, rejected alternatives, and
  evidence labels;
- compare repeated route evidence for the same capability;
- combine route decisions with evaluation evidence and dependency-reduction
  status;
- distinguish `comparison_ready` from `replacement_ready`;
- show local-tool routes for deterministic AMS state operations without adding
  routing policy or provider-retirement machinery.

## What The Goal Did Not Prove

The goal did not prove:

- Codex or ChatGPT can be retired;
- local models can perform the reasoning work Codex currently performs;
- routes should be selected automatically;
- route scoring is justified;
- provider registry expansion is needed;
- a local model runtime should be integrated now;
- broad routing UI is needed.

This is the right boundary. The comparison evidence is useful because it is
conservative.

## Closure Verdict

Recommendation: close `goal_ams_v2_route_comparison` as complete.

Reason:

- all evaluated capabilities now have repeated route evidence;
- all evaluated capabilities have passing evaluation results;
- all evaluated capabilities have dependency-reduction classifications;
- no evaluated capability has remaining route-comparison evidence gaps;
- the remaining deferred row is outside the evaluated capability set;
- more route-comparison work now risks becoming speculative routing design.

Keeping the goal open would invite scope drift. The next useful work is to use
the proven v2 loop for real managed provider-agent work.

## Next Milestone Candidate

Open a new goal:

`Prove managed provider-agent run loop`

Goal statement:

Make AMS v2 capable of launching or preparing a real provider-backed agent run
for a selected task, recording the provider/run/tool/artifact/review/decision
evidence through existing v2 entities, and preserving enough context for the
operator to review and continue work without relying on chat history.

Initial scope:

- define the minimum managed-run contract for Codex/provider work;
- use existing `Task`, `Run`, `ModelProvider`, `ToolExecution`, `Artifact`,
  `Review`, and `Decision` records;
- preserve review and acceptance gates;
- avoid scheduler, multi-agent orchestration, local-model runtime, automatic
  routing, new schema, and broad UI;
- prove one real task can move from selected work to provider run evidence to
  reviewed output.

## Recommended First Task

Create one ready planning task:

`Plan managed provider-agent run loop`

Acceptance:

- identify the smallest provider-run path that can use current v2 state;
- state whether this needs code or can start as a documented/manual run
  protocol;
- define the minimum inputs, outputs, failure states, and readbacks;
- define how artifacts and decisions are captured;
- define what must remain human-reviewed;
- reject scheduler, autonomous multi-goal dispatch, local model execution, and
  broad orchestration until one managed run is proven.

## Decision

Do not continue adding route-comparison mechanics.

Use the route-comparison evidence to inform the next milestone: a managed
provider-agent run loop that turns AMS v2 from a state/control system into an
execution coordination system.
