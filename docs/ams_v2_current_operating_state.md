# AMS v2 Current Operating State

Date: 2026-07-15
Status: Current orientation source

## Purpose

This is the first-read operating-state document for AMS v2 work.

Use it to orient before broad AMS changes. It does not replace the design docs,
goal/task creation guide, or live AMS databases. `data/v2-core.sqlite` remains
the transition-planning and migration source of truth in this prototype. New
product work state belongs to the independent repository's
`data/local/ams-v2.sqlite`; the two authorities are not synchronized and must
not be dual-written.

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

Phase 0 extraction, the independent repository foundation, the minimal
independent work loop, and revisioned agent continuity are complete:

- baseline manifest: `docs/design/ams_v2_extraction_baseline_manifest.md`;
- capability dispositions:
  `docs/design/ams_v2_prototype_capability_disposition_matrix.md`; and
- generated migration evidence:
  `agent_output/v2-extraction-baseline/20260715T224025Z-ca144cebfc2e/`.

Independent repository:

- path: `../agent-management-system-v2`;
- current commit: `bd464f7`;
- packages: pure `core`, versioned `sqlite`, focused `repository-context`, thin
  `cli`, and an independent responsive SvelteKit `web` composition root;
- implemented capability: focused project/goal/task/dependency, deterministic
  next-work, rolling runs, artifacts, proportional completion/review, material
  decisions, continuation, deterministic native snapshots, and guarded
  task-ID-only agent work packets bound to exact database, Git, working-tree,
  and selected-source state;
- implemented operator view: focused read-only Work, Workstream, Goal, Task,
  and Activity routes computed from the same SQLite authority, with no copied
  prototype UI and no new domain entities or schema;
- verification: 22 core/integration tests and 2 desktop/mobile Playwright
  workflows plus format, lint, package-boundary, type, immutable baseline,
  fixture, production build, dependency audit, post-merge, and fresh standalone
  install/build/test gates;
- operational proof: the independent local authority contains one completed
  continuity Task, two completed external-AI Runs on that same Task, and one
  accepted evidence Artifact, with zero Reviews or Decisions;
- local migration archive:
  `../agent-management-system-v2/data/migration/baselines/20260715T224025Z-ca144cebfc2e/`.

New v2 implementation work belongs in that sibling repository. Do not add the
minimal work loop or future web UI under this prototype's `/app/v2-core` routes.

Completed continuity task:

- `task_ams_v2_prove_revisioned_agent_continuity`
- Title: Prove revisioned agent context and cross-session continuity

This task proved that a fresh agent can resume one rolling Task from durable
state without chat history. Computed packets reject stale, contradictory,
tampered, wrong-authority, and unauthorized launches without adding a persisted
packet, approval subsystem, provider registry, scheduler, or schema migration.

Current continuation task:

- `task_ams_v2_build_clean_operator_ui_slice`
- Title: Build the independent desktop/mobile operator UI slice

This task should make the existing independent work loop visible and operable
through a clean responsive surface. It must consume focused application APIs
and must not copy the prototype shell, route structure, or broad v2 service.

The first read-through increment is complete at independent commit `bd464f7`.
It provides desktop and 390px orientation, attention, simultaneous running
work, ready-next work, workstream/goal/task detail, continuation, evidence,
selected context, and activity. The same rolling Task remains active for the
next increment: explicit goal/task steering and guarded run dispatch/result
handling through application commands rather than route SQL or generic CRUD.

The ignored generated directory has been checksum-copied into the independent
repository's local migration archive. Both copies remain noncanonical migration
evidence rather than writable runtime state.

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

- The independent v2 operator UI is read-only. Goal/task steering and run
  dispatch/result handling still require the CLI until guarded web commands are
  implemented.
- The prototype's embedded v2 routes and broad service remain migration and
  behavior evidence only. They are not part of the target product architecture.
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

Completed prerequisite:

- `task_ams_v2_capture_independent_extraction_baseline`
  - Accepted immutable state capture, restore proof, parity fixtures, and
    prototype capability disposition matrix.

Completed:

1. `task_ams_v2_create_independent_repository_foundation`
   - Created the sibling repository with core, SQLite, CLI, docs, boundary
     tests, a versioned initial migration, and a checksum-verified local
     migration archive.
2. `task_ams_v2_port_minimal_independent_work_loop`
   - Ported and proved the smallest complete goal-to-continuation loop in
     focused modules at independent-repository commit `0324d77`.

3. `task_ams_v2_prove_revisioned_agent_continuity`
   - Implemented and operationally proved one-authority, stale-safe, zero-chat
     task continuation at independent-repository commit `ca73e14`.

Current:

4. `task_ams_v2_build_clean_operator_ui_slice`
   - Read-through operator views are complete at independent commit `bd464f7`.
   - Next: add explicit goal/task steering and guarded run dispatch/result
     handling on the existing focused application-service boundary, then close
     the Task only after browser proof against the full acceptance criteria.

Then:

5. `task_ams_v2_validate_real_work_and_project_cutover`
   - Run real projects, compare against the prototype, and migrate authority one
     project at a time.

The existing real cross-project, owned-AI, and external-AI goals remain useful,
but must not cause more product expansion inside the prototype shell.

## Source Documents

Use these for deeper context:

- `docs/ams_goal_task_creation_guide.md`
- `docs/design/ams_v2_clean_boundary_and_execution_plan.md`
- `docs/design/ams_v2_extraction_baseline_manifest.md`
- `docs/design/ams_v2_prototype_capability_disposition_matrix.md`
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
