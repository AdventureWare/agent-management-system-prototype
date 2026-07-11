# V2 Next Milestone After Agent Work Packets v0.1

Date: 2026-07-10
Status: Milestone recommendation

## Purpose

Choose the next significant AMS v2 milestone after completing the minimal
task-detail loop and bounded agent work packet read model.

This is a planning artifact only. It should prevent the next implementation
step from drifting into speculative UI, governance, routing, or schema bloat.

## Evidence Inspected

- `npm run v2:core-db -- agent-work-packet --task task_v2_core_choose_next_milestone_after_agent_packet --json`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/design/ams_v2_design_bloat_audit.md`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `docs/v2_requirements_v0_1.md`
- `docs/v2_architecture_v0_1.md`
- `docs/v2_core_minimal_loop_checkpoint_v0_1.md`
- `docs/model-evals/golden-scenarios.md`
- `docs/model-change-proposals/0002-preview-evaluation-scenario-and-result.md`
- `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md`
- `docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md`
- `src/lib/server/v2-preview-evaluation-service.ts`
- `src/lib/server/v2-preview-evaluation-service.spec.ts`

## Current V2 Core Capability

V2 core can now:

- maintain one active project/goal/task loop
- select ready work
- start tasks and transition work states
- record runs
- attach artifacts
- submit evidence-bearing work for review
- accept approved reviewed output
- close tasks
- record decisions
- promote trusted memory from approved review sources
- track model provider and tool execution evidence
- expose operator-console state
- export/import deterministic snapshots
- produce bounded source-linked agent work packets

This is enough to prove a durable work loop and structured agent handoff. It is
not yet enough to prove that owned/local workflows are getting better or that
external AI affordances can be reduced.

## Recommendation

The next milestone should be:

**Minimal Evaluation Evidence Loop**

The immediate implementation task should add the smallest useful v2 core
evaluation scenario/result slice.

Reason:

- The larger AMS goal is not just to coordinate work. It is to progressively
  replace external AI affordances with owned workflows and eventually owned or
  local capability.
- Current v2 core can say what happened, who/what produced it, what artifacts
  exist, and whether output was reviewed. It cannot yet say whether a
  capability passed a reusable benchmark or quality rubric.
- The requirements and golden scenarios already identify evaluation as the
  bridge between work evidence and dependency-reduction decisions.
- The preview implementation already proved a small evaluation scenario/result
  shape. The next step is to graduate only the minimal useful part into v2 core.

## Proposed First Scenario

Seed or support one scenario:

**Agent work packet is bounded, source-linked, and actionable**

The first result can evaluate the completed
`task_v2_core_agent_work_packet_read_model` run.

This scenario is valuable because the agent work packet is now a foundational
handoff surface for future owned-agent work. If it is not reliable, later
automation, routing, local retrieval, and dependency-reduction work will rest on
weak context.

## What To Implement Next

Create a follow-up task:

`task_v2_core_minimal_evaluation_evidence`

Scope:

- add minimal v2 core evaluation scenario/result storage using accepted concept
  decisions as the boundary
- add service methods and CLI commands to register one scenario, record one
  result, and read evaluation context for a task/project
- link result evidence to task/run/tool/provider where available
- include evaluation context in the agent work packet or operator read model
  only if it can be done without dumping records
- include scenarios/results in snapshot export/import
- add focused tests and one real dogfood result for the agent work packet
  capability

## What Not To Add Yet

Do not add:

- benchmark runner
- automatic scoring
- global score normalization
- model routing policy
- provider retirement decisions
- dependency-reduction entity
- local model orchestration
- evaluation dashboard
- broad capability taxonomy
- workflow/skill promotion
- new approval/governance surface

## Why Not Routing Next

Routing without evaluation evidence would encode preferences before AMS can
prove which route works. That risks turning routing into a rationalized default
for external AI rather than a measured path toward owned capability.

## Why Not Dependency Reduction Next

Dependency reduction needs evaluation evidence. Current dependency reports show
external AI and tool usage counts, but usage is not quality. A dependency status
without scenario-linked evidence would be an anecdotal label.

## Why Not More UI Next

The operator UI already exposes enough of the minimal loop to inspect and close
work. Evaluation should first be a core service/CLI capability. UI can follow
after the state and read model prove what should be displayed.

## Suggested Acceptance Criteria For Next Task

The next implementation task is complete when:

- v2 core can register an `EvaluationScenario` with project, title,
  capability name, prompt/task, rubric, status, and version.
- v2 core can record an `EvaluationResult` linked to a scenario and at least
  one task, with optional run, tool execution, provider, and model references.
- result status, score, rubric summary, result summary, failure summary, and
  created timestamp are stored.
- invalid links are rejected.
- task/project evaluation context can be read through CLI JSON.
- snapshot export/import includes evaluation records deterministically.
- the agent work packet or operator console exposes compact evaluation evidence
  without dumping the entire project.
- one dogfood evaluation result exists for the agent work packet capability.
- focused tests and `npm run check` pass.

## Open Risks

- Numeric scores can imply false precision. Keep score scenario-scoped.
- Evaluation can duplicate review if it becomes an approval surface. Keep
  review as acceptance/governance and evaluation as reusable rubric evidence.
- Evaluation can become routing policy too early. Routing remains deferred.
- Capability names can become a taxonomy sink. Use free text or a tiny local
  string for now; do not add a capability registry.

## Next Task

Create exactly one implementation follow-up:

`Add minimal v2 core evaluation evidence slice`
