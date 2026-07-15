# AMS v2 Current Operating State

Date: 2026-07-15
Status: Current orientation source

## Purpose

This is the first-read operating-state document for AMS v2 work.

Use it to orient before broad AMS changes. It does not replace the design docs,
goal/task creation guide, or live AMS database. The live source of truth for
goals, tasks, runs, artifacts, reviews, decisions, and memory is still AMS v2
state in `data/v2-core.sqlite`.

## Long-Term Direction

Current live long-term AMS goal:

- `goal_ams_v2_owned_agent_system_long_term`
- Title: Build an owned local-first agent operating layer

Desired direction:

AMS should become a persistent coordination and control system that helps one
human agent coordinate projects, goals, sub-goals, tasks, evidence, context,
tools, external AI, future owned AI, Superstructure, and real-world action.

AMS is not the AI model. AMS owns durable work state, authority, evidence,
review, decisions, and continuation. External or owned AI systems provide
delegated capability.

## Current Conceptual Boundary

The current boundary source is:

- `docs/ams_owned_ai_external_ai_boundary_v0_1.md`

Working distinction:

- Colin: principal agent and final goal/risk authority.
- AMS: persistent coordination and control state.
- External AI providers: current delegated capability.
- Owned AI system: future owned/local capability provider.
- Individual models: replaceable components.
- Superstructure: shared representational/world-modeling foundation.
- Projects: concrete desired outcomes and execution environments.

Do not conflate AMS with owned AI, Codex, ChatGPT, Superstructure, a task
tracker, or a prompt library.

## Current Recovery Decision

Current active recovery goal:

- `goal_ams_v2_clean_independent_foundation`
- Title: Establish a clean independently operable AMS v2
- Plan: `docs/design/ams_v2_clean_boundary_and_execution_plan.md`

Decision:

- build the target v2 product in a new `agent-management-system-v2` repository;
- preserve this repository as the prototype, migration source, and behavioral
  evidence;
- preserve current `data/v2-core.sqlite` state through versioned export/import;
- stop adding product features under `/app/v2-core`; and
- port or rebuild capabilities only when they pass an explicit usefulness and
  acceptance test.

The current embedded v2 routes and services are evidence, not the target
application boundary.

## Current Active AMS v2 Child Goals

### Run real cross-project work through AMS v2

- Goal: `goal_ams_v2_real_cross_project_work_loop`
- Status: active
- Purpose: prove AMS v2 can select, prepare, execute, review, and close useful
  work from non-AMS projects.
- Current task: `task_ams_v2_select_first_real_cross_project_work`

This is the main proof that AMS is not becoming a self-contained planning
exercise.

### Build hybrid explicit-knowledge intelligence architecture

- Goal: `goal_ams_v2_hybrid_explicit_knowledge_intelligence_architecture`
- Status: active
- Purpose: reduce generic-model reversion and meaning reconstruction failure by
  combining learned models with explicit ontology, current state, procedures,
  tools, validation, evidence, and source-aware memory.
- Current task: `task_ams_v2_test_statement_roles_in_real_work_selection`

This goal should use real work as evidence. It should not create new entities,
schema, routing automation, or Superstructure-heavy prompt expansion without an
exercised operational gap.

### Use external AI effectively while replacing dependencies

- Goal: `goal_ams_v2_external_ai_utilization_profile`
- Status: active
- Purpose: treat Codex, ChatGPT, and other external AI surfaces as current
  delegated capabilities whose affordances, failure modes, supervision burden,
  and replacement opportunities should be profiled from real work evidence.
- Current task: `task_ams_v2_create_external_ai_operational_profile_v0`

This goal exists because external AI is still doing much of the reasoning and
execution work. The system should learn from that dependence instead of hiding
it or pretending it has already been replaced.

### Make the v2 GUI the primary multi-workstream operator surface

- Goal: `goal_ams_v2_gui_multi_workstream_operator_surface`
- Status: paused
- Purpose: make the GUI the normal way for the operator to understand and manage
  multiple AMS workstreams, instead of depending on Codex or CLI readbacks for
  basic visibility.
- Replacement task: `task_ams_v2_build_clean_operator_ui_slice`

The desired operator capability remains valid, but implementation inside the
prototype shell is paused. The completed workstream overview is preserved as a
design experiment. New GUI work belongs to the independent v2 repository after
the core application boundary is stable.

## Current Owned-AI Project

Owned AI is now represented as a distinct live project:

- Project: `project_owned_ai_system`
- Goal: `goal_owned_ai_hybrid_capability_system`
- Title: Build Colin's hybrid owned-AI capability system

Purpose:

Build a replaceable capability provider that combines learned models with
explicit state, source-aware knowledge, procedures, tools, validators, retrieval,
and AMS-managed evidence. This project is not the same thing as AMS, and it is
not necessarily one model.

Current owned-AI tasks:

- `task_owned_ai_define_capability_ladder_from_source_state`
- `task_owned_ai_define_better_ai_evaluation_criteria`
- `task_owned_ai_inventory_explicit_knowledge_substrates`

The current source-analysis artifact is:

- `docs/owned_ai_hybrid_system_source_analysis_v0_1.md`

## Recently Completed Alignment Work

### Make AMS v2 project state self-orienting

- Goal: `goal_ams_v2_project_state_source_of_truth_alignment`
- Status: completed
- Purpose: make current project state obvious enough that agents do not have to
  reconstruct direction from chat history or scattered milestone docs.
- Artifacts:
  - `docs/ams_v2_current_operating_state.md`
  - `docs/ams_current_vs_historical_documentation_signal_audit_v0_1.md`

This document is linked from the main agent entry points. The docs signal audit
classifies current, design, strategy, and historical proof documents without
reorganizing the whole docs directory.

### Capability-system mapping

- Goal: `goal_ams_v2_align_capability_system_strategy`
- Status: completed
- Artifact: `docs/ams_capability_system_goal_project_mapping_v0_1.md`

Result:

The proposed larger capability-system architecture was mapped against actual
AMS state. Strong matches already exist for AMS and Superstructure. Top-level
mission/capability goals and the owned-AI/external-AI distinction needed
clearer documentation and future operator decisions.

### Top-level mission/capability decision packet

- Artifact: `docs/ams_top_level_mission_capability_goal_decision_v0_1.md`

Result:

Recommended adding explicit top-level Goal 0 and Goal 1 only after operator
approval. No top-level mission/capability goals were created in that task.

### Responsibility boundary note

- Artifact: `docs/ams_owned_ai_external_ai_boundary_v0_1.md`

Result:

Clarified AMS, owned AI, external AI, models, Superstructure, and project
responsibilities. Recommended that the next concrete evidence should come from
real cross-project work, not more terminology.

## Completed Capability Baseline

AMS v2 already has accepted proof or implementation evidence for:

- minimal v2 work loop;
- SQLite-backed v2 core state;
- v1 import and curation passes;
- goal/task/run/artifact/review/decision/memory core records;
- next-work and goal-triage readbacks;
- goal-continuity audit;
- operator console and cross-project attention summary;
- managed provider-run lifecycle;
- agent-control surface;
- agent work packet;
- agent preparation packet;
- closeout packet;
- local retrieval/search over v2 records;
- dependency and dependency-reduction reports;
- route/evaluation evidence for several coordination capabilities;
- mobile-safe operator control surfaces;
- review backlog cleanup for stale imported artifacts.

This does not mean the system is complete. It means the current foundation is
real enough to test on more real work.

## Current Known Weaknesses

- V2 storage is isolated, but v2 code, routes, package, auth, and UI shell are
  still embedded in the prototype application.
- `src/lib/server/v2-core-service.ts` and `/app/v2-core` have accumulated broad
  responsibilities that should be used as behavior evidence, not copied as the
  new architecture.
- Prototype/v1 and v2 previously had ambiguous control-plane instructions. The
  runtime policy and agent skills now require selecting one authority explicitly.
- The docs directory contains many historical milestone artifacts. Without this
  document and the docs index, agents can latch onto stale context.
- Top-level mission and personal capability-system goals are not yet explicit
  live goals.
- Owned AI is now represented as a distinct live project, but it is still a
  future capability system, not an implemented local AI replacement.
- External Codex/ChatGPT-style reasoning remains heavily used.
- Current providerless/local evidence mostly proves deterministic coordination
  and readback capabilities, not replacement of broad AI reasoning.
- Some imported projects still have sparse current-state charters.
- AMS can still over-focus on AMS maintenance unless real project work is run
  through it regularly.

## Explicit Non-Goals Right Now

Do not do these without a specific new task and evidence:

- Do not create a new `Milestone` entity.
- Do not continue the embedded v2 product architecture.
- Do not copy the prototype app or the 8,264-line v2 service wholesale into the
  new repository.
- Do not add product features to `/app/v2-core`.
- Do not add schema fields or domain entities for speculative concepts.
- Do not create all proposed top-level goals automatically.
- Do not mass-reparent existing goals.
- Do not build a scheduler, worker pool, or multi-agent fanout yet.
- Do not build more dashboards before the current loop proves value.
- Do not claim owned AI exists just because providerless local tools exist.
- Do not promote AI output to memory without review.

## How To Decide What To Work On Next

Use live AMS readbacks, not chat memory:

```sh
npm run v2:core-db -- next-work --project project_ams_v2_core --json
npm run v2:core-db -- goal-triage --project project_ams_v2_core --json
npm run v2:core-db -- goal-continuity-audit --project project_ams_v2_core --json
git status --short
```

Selection rule:

1. If there is in-progress work, close it with run/artifact/review/decision
   evidence or mark it blocked.
2. If the current operating-state orientation path has open work, keep it small
   and finish it.
3. Prefer the real cross-project work proof over more internal alignment once
   the current orientation source is available.
4. Create new goals/tasks only after searching current state and confirming the
   work is not already represented.
5. If a completed goal has no open child work, either close the goal with
   evidence or create/select the next active path.

## Current Next Work

The clean-boundary path now takes precedence over embedded GUI work. Current
implementation order is:

1. `task_ams_v2_capture_independent_extraction_baseline`
   - Export and checksum current state, capture deterministic readbacks, and
     classify prototype capabilities before creating the new runtime.
2. `task_ams_v2_create_independent_repository_foundation`
   - Create the sibling repository with core, SQLite, CLI, docs, boundary tests,
     and a versioned initial migration.
3. `task_ams_v2_port_minimal_independent_work_loop`
   - Port the smallest complete goal-to-continuation loop into focused modules.
4. `task_ams_v2_prove_revisioned_agent_continuity`
   - Prove one-authority, stale-safe, zero-chat task continuation.
5. `task_ams_v2_build_clean_operator_ui_slice`
   - Build the independent desktop/mobile operator surface after the application
     service boundary is stable.
6. `task_ams_v2_validate_real_work_and_project_cutover`
   - Run real projects, compare against the prototype, and migrate authority one
     project at a time.

The existing real cross-project, owned-AI, and external-AI goals remain useful,
but must not cause more product expansion inside the prototype shell.

## Source Documents

Use these for deeper context:

- `docs/ams_goal_task_creation_guide.md`
- `docs/design/ams_v2_clean_boundary_and_execution_plan.md`
- `docs/ams_current_vs_historical_documentation_signal_audit_v0_1.md`
- `docs/ams_real_cross_project_work_requirements_from_resume_v0_1.md`
- `docs/ams_hybrid_explicit_knowledge_intelligence_mapping_v0_1.md`
- `docs/owned_ai_hybrid_system_source_analysis_v0_1.md`
- `docs/design/ams_v2_domain_ontology_and_behavior_spec.md`
- `docs/ams_capability_system_goal_project_mapping_v0_1.md`
- `docs/ams_top_level_mission_capability_goal_decision_v0_1.md`
- `docs/ams_owned_ai_external_ai_boundary_v0_1.md`
- `docs/v2_next_milestone_after_review_backlog_cleanup_v0_1.md`
- `docs/runtime-data-policy.md`
