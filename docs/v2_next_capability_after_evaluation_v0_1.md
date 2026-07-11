# V2 Next Capability After Evaluation Evidence v0.1

Date: 2026-07-10
Status: Capability recommendation

## Purpose

Choose the next bounded AMS v2 capability after completing minimal evaluation
evidence.

This is a planning artifact. It should prevent the next implementation step
from turning into speculative routing, local-model orchestration, dashboards,
or dependency-retirement automation.

## Evidence Inspected

- `npm run v2:core-db -- inspect-task --task task_v2_core_choose_next_capability_after_evaluation --json`
- `npm run v2:core-db -- operator-console --project project_ams_v2_core --json`
- `npm run v2:core-db -- evaluation-context --project project_ams_v2_core --json`
- `docs/v2_requirements_v0_1.md`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/v2_next_milestone_after_agent_packet_v0_1.md`

## Current V2 Core Capability

V2 core can now:

- maintain one active project and goal
- select ready work
- transition tasks through the minimal lifecycle
- record runs, artifacts, reviews, decisions, and trusted memory
- track model-provider and tool execution evidence
- expose operator-console state
- expose bounded source-linked agent work packets
- export and import deterministic snapshots
- register evaluation scenarios
- record evaluation results linked to task, run, tool, provider, and model
- surface compact evaluation evidence in existing read models

The live project state has one active goal, seventeen completed tasks, one
ready planning task, one evaluation scenario, and one evaluation result. The
dependency report shows repeated `provider_codex_external` use across v2 core
work, but it does not yet answer which external-AI affordance is dependent,
partially owned, or ready for local/reusable replacement.

## Recommendation

The next capability should be:

**Minimal External-AI Dependency Reduction Report**

This should be a computed report over existing v2 core evidence first, not a
new dependency-retirement workflow.

## Why This Is Next

The larger AMS goal is to progressively convert external-AI affordances into
owned workflows and eventually owned/local capability.

V2 core can now record the needed inputs:

- external model/provider usage through runs
- tool usage through tool executions
- reviewed outputs through artifacts and reviews
- reusable quality evidence through evaluation results
- trusted project memory from accepted work

The missing step is a small read model that connects those records into a
capability-level dependency picture. Without that, AMS can count external AI
usage but cannot tell whether a capability is external-only, hybrid, locally
supported, or a candidate for an owned workflow.

## Proposed First Capability To Report

Use the existing `agent-work-packet` capability as the first row.

Reason:

- it already has a scenario-linked passing evaluation result
- it is foundational for future agentic coding runs
- it is still implemented and validated through external Codex work
- it is a good test case for distinguishing "capability works" from "external
  dependency has been reduced"

## What To Implement Next

Create one implementation task:

`task_v2_core_minimal_dependency_reduction_report`

Scope:

- add a v2 core service/read-model function that summarizes dependency status
  by capability name using existing provider, run, tool, task, and evaluation
  evidence
- add a CLI command to read the report for a project, goal, or task scope
- include the report in the operator console or agent work packet only as a
  compact summary if it stays bounded
- include focused tests using the existing agent-work-packet evaluation result
  as the first reportable capability
- dogfood the report against the current v2 core project

The report should start with a small status vocabulary:

- `external_only`: evidence depends on external AI and has no owned/local
  substitute evidence
- `hybrid_candidate`: capability has reusable workflow/evaluation evidence but
  still relies on external AI
- `locally_supported`: capability has local/tool evidence that can perform part
  of the work
- `retirement_candidate`: capability has enough owned/local evaluation evidence
  that external usage may be reduced

These statuses should be computed or report-level labels at first. Do not make
them a lifecycle workflow.

## What Not To Add Yet

Do not add:

- provider retirement automation
- model routing policy
- local model launcher
- capability registry
- broad capability taxonomy
- dashboards
- cost accounting
- privacy scoring
- benchmark runner
- automatic skill promotion
- new approval gates
- new persisted dependency-reduction entity unless the implementation proves a
  computed report is insufficient

## Why Not Retrieval Next

Retrieval is important, but the current v2 core already has bounded context
bundles and agent work packets. The larger project goal specifically depends on
knowing what external AI affordances remain. A dependency-reduction report is a
smaller bridge from current evidence to owned-capability planning.

## Why Not Routing Next

Routing should use evaluation and dependency evidence. Adding routing before a
dependency-reduction report would choose engines before AMS can explain which
capability is still externally dependent and why.

## Acceptance Criteria For The Next Task

The next implementation task is complete when:

- v2 core can return a project-scoped dependency-reduction report through CLI
  JSON
- the report includes at least the `agent-work-packet` capability
- the report links external provider usage, tool usage, and evaluation evidence
  where available
- each reported status includes a short evidence-based rationale
- missing evaluation evidence is represented as uncertainty, not failure
- focused tests cover the report read model and CLI command
- `npm run check` passes
- one live dogfood readback exists for `project_ams_v2_core`

## Open Risks

- A status label can sound more certain than the evidence supports. Keep
  rationales explicit and mark weak evidence as uncertainty.
- Capability names can become an uncontrolled taxonomy. Reuse existing strings
  such as `agent-work-packet` before adding any registry.
- Dependency reduction can become a dashboard/reporting sink. Keep this as a
  bounded read model for deciding next owned-workflow investments.

## Next Task

Create exactly one implementation follow-up:

`Add minimal v2 core dependency-reduction report`
