# V2 Next Capability After Local Retrieval v0.1

Date: 2026-07-10
Status: Capability recommendation

## Purpose

Choose the next bounded AMS v2 capability after completing the minimal local
retrieval read model.

This is a planning artifact. It should prevent the next step from drifting into
UI expansion, local-model orchestration, routing policy, embeddings, workflow
automation, or a broad capability registry.

## Evidence Inspected

- `npm run v2:core-db -- inspect-task --task task_v2_core_choose_next_capability_after_local_retrieval --json`
- `npm run v2:core-db -- operator-console --project project_ams_v2_core --json`
- `npm run v2:core-db -- dependency-reduction-report --project project_ams_v2_core --json`
- `npm run v2:core-db -- search-context --project project_ams_v2_core --query "dependency reduction external AI agent-control local retrieval" --limit 8 --json`
- `docs/v2_next_capability_after_agent_control_v0_1.md`
- `docs/v2_core_agent_control_surface_v0_1.md`
- `docs/v2_requirements_v0_1.md`
- `docs/v2_architecture_v0_1.md`
- `docs/design/ams_v2_design_bloat_audit.md`

## Current V2 Core Capability

V2 core can now:

- maintain project, goal, task, dependency, run, artifact, review, decision,
  memory, tool, provider, and source-reference state
- select next ready work and keep active goal work from silently stalling
- build bounded context bundles and agent work packets
- record runs, tool executions, artifacts, reviews, decisions, accepted outputs,
  follow-up tasks, and trusted memory
- expose a consolidated operator-console read model
- export and import deterministic snapshots
- register evaluation scenarios/results
- compute a capability-level dependency-reduction report from evaluation,
  provider, tool, task, and run evidence
- expose a minimal agent-control surface for agents to operate the loop
- search existing v2 core records through source-linked local retrieval

The live project state has one active goal, twenty-five completed tasks, one
in-progress planning task, one evaluation scenario/result, and one
dependency-reduction capability row.

## Observed Gap

The dependency-reduction report currently recognizes only one capability:

- `agent-work-packet`: `hybrid_candidate`

That is now stale relative to the actual implemented system. Since that
evaluation was recorded, v2 has added at least two important owned-agent
affordances:

- `agent-control-surface`
- `local-retrieval`

Both have run evidence, tool execution evidence, accepted artifacts, approved
reviews, acceptance decisions, and trusted memory. But neither is represented in
the evaluation/dependency-reduction layer.

This means the system can perform more owned work than its dependency report can
explain.

## Recommendation

The next capability should be:

**Minimal Capability Evaluation Coverage**

The immediate implementation task should add scenario-linked evaluation evidence
for already-built capabilities, starting with agent-control and local retrieval,
so the dependency-reduction report reflects the live v2 core.

## Why This Is Next

The larger AMS goal is not simply to add features. It is to progressively turn
external-AI affordances into owned workflows with evidence.

The current bottleneck is not lack of another interface. The bottleneck is that
the system has begun to outpace its own capability evidence.

This matters because:

- dependency reduction is only credible when capabilities are scenario-linked
- model routing and local-model work need capability evidence before policy
- local retrieval gives agents better context, but it should now be evaluated
- agent-control is central to the owned work loop, but it is not yet in the
  capability-level report
- the existing evaluation schema and CLI already support this without new
  entities, tables, dashboards, or governance concepts

## What To Implement Next

Create one implementation follow-up:

`task_v2_core_minimal_capability_evaluation_coverage`

Scope:

- register an evaluation scenario for `agent-control-surface`
- record a passing evaluation result linked to:
  - `task_v2_core_minimal_agent_control_surface`
  - `run_v2_core_minimal_agent_control_surface`
  - `tool_execution_v2_core_minimal_agent_control_surface_validation`
  - `provider_codex_external`
- register an evaluation scenario for `local-retrieval`
- record a passing evaluation result linked to:
  - `task_v2_core_minimal_local_retrieval`
  - `run_v2_core_minimal_local_retrieval`
  - `tool_execution_v2_core_minimal_local_retrieval_validation`
  - `provider_codex_external`
- verify that `dependency-reduction-report` now shows at least these
  capabilities:
  - `agent-work-packet`
  - `agent-control-surface`
  - `local-retrieval`
- verify each new capability has external-provider evidence, local-tool
  evidence, passing evaluation evidence, and no evidence gaps
- add code only if the existing CLI/read model cannot represent this evidence

## What Not To Add Yet

Do not add:

- a new capability entity/table
- a capability dashboard
- routing policy
- local model orchestration
- embeddings or vector search
- automated benchmark runner
- scoring framework beyond existing evaluation result fields
- broad provider cost/privacy accounting
- workflow or skill promotion automation
- UI for evaluation management
- new lifecycle states

## Why Not Routing Next

Routing needs capability evidence. At the moment, the dependency report only has
one evaluated capability even though the system has more working affordances.
Routing now would force policy decisions on incomplete evidence.

## Why Not Local Models Next

Local models should be evaluated against specific capabilities. The next
question is not "which local model should run?" but "which current capabilities
can the system describe and evaluate well enough to compare local and external
execution later?"

## Why Not UI Next

The operator UI can come later. The current task is to improve the system's
source-of-truth about capability evidence, not add another display surface.

## Acceptance Criteria For The Next Task

The next implementation task is complete when:

- evaluation scenarios exist for `agent-control-surface` and `local-retrieval`
- evaluation results are linked to the accepted task/run/tool/provider evidence
  for both capabilities
- `dependency-reduction-report --project project_ams_v2_core --json` returns at
  least three capability rows
- the new capability rows have no evidence gaps
- no schema, domain entity, lifecycle state, dashboard, routing policy,
  benchmark runner, or local-model integration is added
- the work is recorded through the v2 control loop with reviewed artifacts,
  accepted output, trusted memory, and one next follow-up if the goal remains
  active

## Open Risks

- Evaluation can become fake precision. Keep scores coarse and explain them
  through rubric summaries.
- Capability naming can become taxonomy bloat. Use only names tied to actual
  implemented affordances.
- Dependency reporting can become a dashboard project. Keep it a read model
  over existing evidence.
- Backfilling too many capabilities at once can obscure the contract. Start with
  two already accepted capabilities.

## Next Task

Create exactly one implementation follow-up:

`Add minimal v2 core capability evaluation coverage`
