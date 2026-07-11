# V2 Repeated Route Selection Evidence Plan v0.1

Date: 2026-07-10
Status: Evidence capture plan

## Purpose

Plan the next evidence capture step for `goal_ams_v2_route_comparison`.

The current route-comparison report works, but it shows that useful evaluated
capabilities have no route-selection decisions. The next step is to capture
baseline route evidence for completed, evaluated capabilities.

This is not routing automation.

## Evidence Inspected

- `npm run v2:core-db -- inspect-task --task task_v2_core_capture_repeated_route_selection_evidence --json`
- `npm run v2:core-db -- route-comparison-report --project project_ams_v2_core --json`
- `npm run v2:core-db -- evaluation-context --project project_ams_v2_core --json`
- `docs/v2_route_comparison_goal_plan_v0_1.md`

## Current Report State

The live route-comparison report shows:

- `comparisonReadyCount`: 0
- `needsMoreRouteEvidenceCount`: 3
- `deferCount`: 1
- `routeSelectionDecisionCount`: 1

The evaluated capabilities that need route-selection evidence are:

- `agent-work-packet`
- `agent-control-surface`
- `local-retrieval`

The one existing route-selection decision is for
`routing-decision-evidence`. That row is deferred because it has only one route
decision and no matching evaluation/dependency status.

## Evidence To Capture Next

Record retrospective `route_selection` decisions for the three evaluated
capabilities:

| Capability | Task | Run | Evaluation Result | Tool Execution |
| --- | --- | --- | --- | --- |
| `agent-work-packet` | `task_v2_core_agent_work_packet_read_model` | `run_v2_core_agent_work_packet_read_model` | `evaluation_result_v2_core_agent_work_packet` | `tool_execution_v2_core_agent_work_packet_validation` |
| `agent-control-surface` | `task_v2_core_minimal_agent_control_surface` | `run_v2_core_minimal_agent_control_surface` | `evaluation_result_v2_core_agent_control_surface` | `tool_execution_v2_core_minimal_agent_control_surface_validation` |
| `local-retrieval` | `task_v2_core_minimal_local_retrieval` | `run_v2_core_minimal_local_retrieval` | `evaluation_result_v2_core_local_retrieval` | `tool_execution_v2_core_minimal_local_retrieval_validation` |

Each decision should use:

- selected provider: `provider_codex_external`
- selected model: `codex-external`
- selected route: `external-ai`
- rejected alternatives: `local-model unavailable; automatic routing deferred`

## Expected Result

After these decisions are recorded:

- all three evaluated capabilities should have one route-selection decision
- their evidence gaps should change from "no route-selection decision" to
  "only one route-selection decision"
- `comparisonReadyCount` should remain `0`
- the system should still say repeated route evidence is needed before
  comparison or automation

## Next Implementation Task

Create one follow-up task:

`Record route-selection decisions for evaluated v2 capabilities`

Acceptance criteria:

- the three route-selection decisions are recorded
- `routing-evidence` includes the three new decisions
- `route-comparison-report` shows one route decision for each evaluated
  capability
- the report remains conservative and does not mark any capability
  `comparison_ready`
- no code, schema, UI, routing policy, automation, local-model orchestration, or
  provider retirement work is added

## Decision

Proceed with retrospective baseline route-selection evidence for the three
evaluated capabilities.

Do not attempt repeated-route comparison until this baseline exists.
