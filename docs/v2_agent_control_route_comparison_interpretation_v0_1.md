# V2 Agent-Control Route Comparison Interpretation v0.1

Date: 2026-07-10
Status: Interpretation output

## Purpose

Interpret the first comparison-ready capability under
`goal_ams_v2_route_comparison`.

This document explains what the two `agent-control-surface` route decisions
prove, what they do not prove, and what evidence should be gathered next.

This is not a routing policy. It does not authorize automatic routing, provider
retirement, local-model orchestration, route scoring, registry work, UI work, or
schema changes.

## Evidence Inspected

- `route-comparison-report --project project_ams_v2_core`
- `routing-evidence --project project_ams_v2_core --limit 25`
- `dependency-reduction-report --project project_ams_v2_core`
- `evaluation-context --project project_ams_v2_core`
- `memory-for-context --project project_ams_v2_core --task task_v2_core_interpret_agent_control_route_comparison_evidence`
- `docs/v2_repeated_route_comparison_experiment_plan_v0_1.md`
- `docs/v2_route_comparison_goal_plan_v0_1.md`

## Current Report State

The live report now shows:

- `comparisonReadyCount`: 1
- `needsMoreRouteEvidenceCount`: 2
- `deferCount`: 1
- `routeSelectionDecisionCount`: 5

`agent-control-surface` is the only comparison-ready capability.

Its route decisions are:

| Decision | Selected provider | Selected model | Selected route |
| --- | --- | --- | --- |
| `decision_v2_core_route_selection_agent_control_surface_baseline` | `provider_codex_external` | `codex-external` | `external-ai` |
| `decision_v2_core_route_selection_agent_control_surface_local_tool` | `none` | `none` | `local-tool` |

## What The Evidence Proves

The external-AI route proves:

- Codex was used while building and validating the original agent-control
  surface.
- The capability passed evaluation with provider-linked run evidence.
- External AI was useful for implementation and reasoning during the original
  build.

The local-tool route proves:

- The completed agent-control surface can operate AMS v2 state through existing
  local CLI/readback operations.
- The system can fetch packets, routing evidence, and route-comparison reports
  without a model provider for that execution path.
- For state readback and control-plane operation, the local CLI surface can be a
  route in its own right.
- `comparison_ready` is working as an evidence-state signal: the report can now
  identify a capability with two route decisions, evaluation evidence, and
  dependency-reduction classification.

## What The Evidence Does Not Prove

This evidence does not prove:

- a local model can perform the reasoning Codex performed;
- Codex or ChatGPT can be retired for agent-control implementation work;
- the local route is better, cheaper, safer, or more complete across all uses;
- future tasks should be automatically routed to local tools;
- routing policy, provider retirement, score fields, dashboards, registries, or
  local-model orchestration are justified;
- `comparison_ready` means `replacement_ready`.

The correct interpretation is narrower:

`agent-control-surface` now has enough route evidence to compare a
provider-assisted build route with a local-tool operation route. That is useful,
but it is not a replacement decision.

## Comparison Interpretation

The local-tool route is strongest for:

- reading current AMS state;
- building bounded work context from existing records;
- recording run/tool/artifact/review/decision state;
- preserving source-linked evidence without prompt stuffing;
- avoiding external AI for deterministic control-plane operations.

The external-AI route remains relevant for:

- designing or changing implementation behavior;
- interpreting ambiguous goals or architecture;
- writing code;
- reviewing broad tradeoffs;
- handling novel work where local deterministic tools only expose state.

This distinction matters. The owned AMS layer should use local tools for
deterministic state operations and reserve external AI evidence for reasoning
tasks until local reasoning capability is actually proven.

## Next Evidence Target

Choose `local-retrieval` for the next second-route evidence task.

Reasons:

- Context discovery is a core owned-agent affordance.
- It directly reduces dependence on chat history and manual broad inspection.
- The capability already has passing evaluation evidence and local CLI tool
  evidence.
- The next route decision can be captured through existing `search-context` and
  `agent-control search` readbacks.
- It can be kept narrow: evidence capture only, no retrieval benchmark, no
  embeddings, no vector store, no repo crawler, no UI, no routing policy.

Do not choose `agent-work-packet` next. It is useful and should still get a
second route later, but `local-retrieval` better tests whether owned local
context discovery can replace an external-AI affordance.

Do not refine comparison interpretation further before collecting the next
route. The current distinction is clear enough: `comparison_ready` means
evidence-ready, not replacement-ready.

## Recommended Follow-Up Task

Create one ready task:

`Record second route decision for local-retrieval`

Acceptance:

- use existing CLI/agent-control operations only;
- run local retrieval readbacks through `search-context` and
  `agent-control search`;
- record one completed run and tool execution;
- record one `route_selection` decision for `local-retrieval` with:
  - selected provider: `none`
  - selected model: `none`
  - selected route: `local-tool`
  - rejected alternatives:
    - `external-ai not needed for source-linked v2 record search`
    - `automatic routing deferred`
    - `embeddings and vector search deferred`
    - `local-model orchestration deferred`
- validate that `local-retrieval` becomes `comparison_ready`;
- validate that `agent-work-packet` still needs more route evidence;
- add no code, schema, UI, retrieval benchmark, embeddings, vector store, repo
  crawler, routing automation, provider retirement, route scoring, registry, or
  local-model orchestration.

## Decision

Proceed with second-route evidence for `local-retrieval`.

Do not interpret the `agent-control-surface` comparison-ready row as a provider
retirement signal.
