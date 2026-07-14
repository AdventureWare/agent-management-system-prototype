# V2 Providerless Core Capability Target v0.1

Date: 2026-07-14
Status: Planning artifact

## Purpose

Select the next AMS v2 capability to prove with providerless local-tool
evaluation evidence.

This milestone exists to reduce external-AI dependency in the core AMS loop. It
does not add scheduler behavior, local-model runtime work, routing policy,
schema, broad UI, automatic acceptance, or a new capability taxonomy.

## Evidence Inspected

- `dependency-reduction-report --project project_ams_v2_core`
- `route-comparison-report --project project_ams_v2_core`
- `evaluation-context --project project_ams_v2_core --task task_v2_providerless_core_capability_select_target`
- `operator-console --project project_ams_v2_core`
- `agent-execution-cycle` launch for this planning task
- `git status`

## Current Dependency Picture

The dependency-reduction report currently recognizes five core capabilities:

- `agent-control-surface`
- `agent-execution-cycle`
- `agent-work-packet`
- `closeout-packet`
- `local-retrieval`

All five remain aggregate `hybrid_candidate` because historical accepted
evidence includes external provider usage.

Only `closeout-packet` currently has providerless local-tool passing evidence,
so its `localReplacementStatus` is `retirement_candidate`.

The remaining local-replacement gaps are the same for:

- `agent-control-surface`
- `agent-execution-cycle`
- `agent-work-packet`
- `local-retrieval`

Each lacks:

- providerless local-tool evaluation result;
- passing providerless local-tool evaluation result.

## Candidate Targets

### agent-control-surface

Best next target.

Why:

- It is a thin local CLI/control surface over existing v2 operations.
- Route evidence already includes a local-tool route and says external AI is not
  needed for state readback.
- The existing scenario is broad enough to cover practical control-loop actions:
  next, packet, search, start/run, tool/artifact/review/accept/follow-up.
- Proving it locally would reduce dependency for ordinary AMS state-operation
  choreography without pretending local tools can do judgment-heavy reasoning.

Risk:

- The scenario is broad. The proof must avoid claiming that local tooling can
  perform the actual human/AI judgment inside each task.

### agent-work-packet

Good later target.

Why defer:

- It is also deterministic and source-linked, but packet adequacy is more
  judgment-sensitive than control-surface reachability.
- The latest agent-preparation work already improved packet/resource behavior,
  so it should be evaluated after the control-surface proof clarifies the local
  evidence pattern.

### local-retrieval

Good later target.

Why defer:

- Retrieval quality needs recall/precision judgment. A providerless smoke can
  prove mechanical behavior, but a stronger proof should include fixture-backed
  expected results rather than simply recording that the command runs.

### agent-execution-cycle

Defer.

Why:

- The command creates provider-linked runs by design. It can have local-tool
  evidence for deterministic selection and launch choreography, but its normal
  operation explicitly coordinates external-provider work. That makes it a less
  clean first providerless proof than `agent-control-surface`.

## Selected Target

Select `agent-control-surface`.

The next task should record providerless local-tool evaluation evidence for the
existing `evaluation_scenario_v2_core_agent_control_surface` by validating the
local CLI surface without linking the result to a model provider.

## Required Proof

The proof should show that local tooling can operate the control surface for
state readback and bounded mutation choreography.

Required local readbacks:

- `agent-control --agent-action next`
- `agent-control --agent-action packet`
- `agent-control --agent-action search`
- one non-destructive or dry-run lifecycle/control action where available
- `dependency-reduction-report` after the evidence is recorded

The proof may cite the existing local CLI tool record:

- `tool_v2_core_db_cli`

The proof should not claim:

- local tools can replace external reasoning for arbitrary task execution;
- automatic acceptance is allowed;
- provider routes should be retired globally;
- routing policy has changed;
- new schema is needed.

## Follow-Up Task

Create one task:

`task_v2_agent_control_surface_providerless_evaluation`

Title:

Record providerless evaluation for agent-control surface

Acceptance criteria:

- Run local agent-control readbacks for next, packet, and search using existing
  v2 core CLI operations.
- Include at least one safe lifecycle/control readback or dry-run if available.
- Record a providerless passing evaluation result for
  `evaluation_scenario_v2_core_agent_control_surface` with
  `providerId = null` and local tool evidence.
- Read back `dependency-reduction-report` and verify
  `agent-control-surface.localReplacementStatus` no longer has providerless
  evidence gaps.
- Do not change code, schema, UI, lifecycle states, routing policy, scheduler,
  local-model runtime, or acceptance rules unless the proof exposes a concrete
  defect that requires a separate task.

## Non-Goals

- Do not mark external providers retired.
- Do not add automation for model choice.
- Do not create a new capability registry.
- Do not broaden the operator UI.
- Do not auto-approve task output.
- Do not treat local readback evidence as proof that local tools can perform
  open-ended reasoning work.

## Recommended Next Step

Run `task_v2_agent_control_surface_providerless_evaluation`.

This is the smallest next step that advances the larger goal of replacing
external-AI affordances with owned/local capability while staying grounded in
current evidence.
