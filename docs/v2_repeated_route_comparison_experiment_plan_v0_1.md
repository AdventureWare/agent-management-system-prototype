# V2 Repeated Route Comparison Experiment Plan v0.1

Date: 2026-07-10
Status: Planning output

## Purpose

Plan the smallest second-route experiment for `goal_ams_v2_route_comparison`.

The goal is to make one capability comparison-ready in the existing
`route-comparison-report` read model. This is evidence capture only. It is not
automatic routing, provider retirement, local model orchestration, schema work,
or UI work.

## Evidence Inspected

- `route-comparison-report --project project_ams_v2_core`
- `routing-evidence --project project_ams_v2_core --limit 25`
- `evaluation-context --project project_ams_v2_core`
- `dependency-reduction-report --project project_ams_v2_core`
- `dependency-report --project project_ams_v2_core`
- `memory-for-context --project project_ams_v2_core --task task_v2_core_plan_repeated_route_comparison_experiment`
- `inspect-task --task task_v2_core_minimal_agent_control_surface`
- `search-context --query "agent-control-surface route local tool evaluation"`
- `src/lib/server/v2-core-service.ts` route-comparison rules
- `docs/v2_repeated_route_selection_evidence_plan_v0_1.md`
- `docs/v2_minimal_loop_goal_closure_assessment_v0_1.md`

## Current State

The live report shows:

- `capabilityCount`: 4
- `routeSelectionDecisionCount`: 4
- `comparisonReadyCount`: 0
- `needsMoreRouteEvidenceCount`: 3
- `deferCount`: 1

The three evaluated capabilities each have one baseline external-AI route
decision:

| Capability | Route decisions | Current route | Dependency status | Recommendation |
| --- | ---: | --- | --- | --- |
| `agent-control-surface` | 1 | `external-ai` | `hybrid_candidate` | `needs_more_route_evidence` |
| `agent-work-packet` | 1 | `external-ai` | `hybrid_candidate` | `needs_more_route_evidence` |
| `local-retrieval` | 1 | `external-ai` | `hybrid_candidate` | `needs_more_route_evidence` |

The report marks a capability `comparison_ready` when it has:

- at least two `route_selection` decisions;
- at least one evaluation result;
- a classified dependency-reduction status.

That status means evidence is sufficient for comparison. It does not mean the
system should automatically route future work or retire an external provider.

## Selected Capability

Choose `agent-control-surface`.

Reasons:

- It is the most repeated control-loop affordance in current v2 work.
- It already has accepted implementation evidence.
- It already has local tool execution evidence through `tool_v2_core_db_cli`.
- The existing evaluation scenario asks whether the structured agent-control
  surface can drive the work loop without ad hoc command choreography.
- A second local-tool route can be tested with existing CLI readbacks and AMS
  state changes.

Do not choose `local-retrieval` yet. It is useful, but a second route there
could blur into retrieval-quality benchmarking. Do not choose
`agent-work-packet` yet. It is useful, but the next question is whether the
agent can operate the loop through owned tooling, not whether it can read a
packet.

## Experiment

Create one implementation task:

`Record second route decision for agent-control-surface`

The task should use the existing v2 core CLI and agent-control surface to
perform a bounded planning/evidence operation. The operation should be local
tool execution of the agent-control surface, not a new model call and not new
application code.

Suggested second route decision:

- capability: `agent-control-surface`
- selected provider: `none`
- selected model: `none`
- selected route: `local-tool`
- rejected alternatives:
  - `external-ai not needed for state readback`
  - `automatic routing deferred`
  - `local-model orchestration deferred`

Evidence labels should include:

- the new task id;
- the new run id;
- the new tool execution id;
- the existing `evaluation_result_v2_core_agent_control_surface`;
- the existing `tool_v2_core_db_cli`.

## Success Criteria

The implementation task succeeds when:

- it uses existing CLI/agent-control operations only;
- it records one completed run and one completed tool execution;
- it records one `route_selection` decision for `agent-control-surface` with
  `Selected route: local-tool`;
- `routing-evidence` returns both `agent-control-surface` route decisions;
- `route-comparison-report` marks `agent-control-surface` as
  `comparison_ready`;
- `agent-work-packet` and `local-retrieval` still show
  `needs_more_route_evidence`;
- no code, schema, UI, provider registry, model registry, routing automation,
  local-model orchestration, benchmark runner, or provider retirement policy is
  added.

## Validation Commands

Use existing readbacks:

```sh
npm run v2:core-db -- routing-evidence --project project_ams_v2_core --limit 25 --json
npm run v2:core-db -- route-comparison-report --project project_ams_v2_core --json
npm run v2:core-db -- agent-control --agent-action route-comparison-report --project project_ams_v2_core --json
npm run v2:core-db -- inspect-task --task task_v2_core_record_second_route_decision_for_agent_control_surface --json
```

No test suite is required unless a readback fails or code changes become
necessary. The planned implementation should be data/evidence capture only.

## Guardrails

- Do not infer provider retirement from `comparison_ready`.
- Do not add automatic route selection.
- Do not add a local model provider just to make the report look balanced.
- Do not create a standalone `RoutingDecision` entity.
- Do not add route scoring fields.
- Do not create dashboards or UI.
- Do not change route-comparison report semantics in this task.
- Do not claim local model capability; this experiment tests local tool
  operation only.

## Expected Report Change

After the follow-up task:

- `agent-control-surface` should have two route decisions:
  - `external-ai`
  - `local-tool`
- `agent-control-surface` should become `comparison_ready`.
- overall `comparisonReadyCount` should increase from `0` to `1`.
- overall `needsMoreRouteEvidenceCount` should decrease from `3` to `2`.

This creates the first real comparison-ready capability while preserving the
larger boundary: evidence first, automation later only if evidence justifies it.
