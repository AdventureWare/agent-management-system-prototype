# AMS v2 Current Operating State

Date: 2026-07-21
Status: Current orientation source

## Purpose

This is the first-read operating-state document for AMS v2 work.

Use it to orient before broad AMS changes. It does not replace the design docs,
goal/task creation guide, or live AMS databases. `data/v2-core.sqlite` is the
preserved transition-planning and migration source in this prototype. Current
AMS v2 product and control state belongs to the independent repository's
`data/local/ams-v2.sqlite`; the two authorities are not synchronized and must
not be dual-written.

## Long-Term Direction

Current live long-term AMS goal:

- `goal_ams_v2_owned_agent_system_long_term`
- Title: Build an owned local-first agent operating layer

This Goal and its active control-graph children are now represented in the
independent v2 authority. They are no longer transition-database-only plans.

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
- current commit: `1cb1f37`;
- packages: pure `core`, versioned `sqlite`, focused `repository-context`, thin
  `cli`, and an independent responsive SvelteKit `web` composition root;
- implemented capability: focused project/goal/task/dependency, deterministic
  next-work, rolling runs, artifacts, proportional completion/review, material
  decisions, continuation, deterministic native snapshots, and guarded
  task-ID-only agent work packets bound to exact database, Git, working-tree,
  and selected-source state;
- implemented operator view: focused Work, Workstream, Goal, Task, and Activity
  routes computed from the same SQLite authority, plus bounded ready-Task
  creation and guarded Goal pause/resume through focused core application
  services, with no copied prototype UI and no new domain entities or schema;
- verification: 27 core/integration tests and 4 desktop/mobile Playwright
  workflows plus format, lint, package-boundary, type, immutable baseline,
  fixture, production build, dependency audit, post-merge, and fresh standalone
  install/build/test gates;
- operational proof: the original continuity proof remains present, and the
  first real cross-project Kwipoo Task has now been executed through two
  external-AI Runs and closed with accepted Git evidence. The live authority
  contains 19 Projects, 52 Goals, 255 Tasks, 55 Runs, 80 Artifacts, 47 Reviews,
  24 Decisions, and 403 source references;
- selective project cutover: the independent authority now contains 19
  projects total. Animal Welfare was migrated first; 16 additional real project
  containers were then selectively migrated with 35 real Goals, 174
  non-canceled Tasks, 33 valid intra-project dependencies, four canonical local
  Artifacts, 18 material/migration Decisions, and 280 source references. The
  inherited Animal Welfare project status was corrected from active to paused
  because its only Goal is paused and it has no open work;
- migration cleanup: generated holding Goals, canceled Tasks, copied attachment
  history, historical Runs and Reviews, routine transition Decisions, and one
  Content_OS Task without a defensible real Goal remain in the preserved source
  authority and rollback archives. The prototype, transition AMS v2 Core,
  superseded Superstructure/RMI containers, already-reconciled Superstructure
  Program, and imported-unassigned holding bucket were not duplicated as live
  projects;
- local migration archive:
  `../agent-management-system-v2/data/migration/baselines/20260715T224025Z-ca144cebfc2e/`.
- latest selective-project migration evidence:
  `../agent-management-system-v2/data/local/migrations/remaining-projects-selective-migration-20260720T235733Z.json`
  and its paired snapshot; rollback database:
  `../agent-management-system-v2/data/local/backups/ams-v2-before-remaining-projects-20260720T234719Z.sqlite`.
- AMS control-graph reconciliation: the transition `AMS v2 Core` project was
  inspected rather than copied wholesale. Five still-active Goals, ten selected
  Tasks, four dependencies, three canonical Artifacts, five material Decisions,
  and 31 source references were reconciled into `Independent AMS v2`. The
  independent Project charter was revised and its existing continuity Goal was
  completed and placed under the clean-foundation Goal. Thirty-six completed
  Goals, 230 historical Tasks, three canceled Tasks, historical Runs and
  Reviews, and routine transition Decisions remain available in the preserved
  transition authority and migration archives;
- latest control-graph reconciliation evidence:
  `../agent-management-system-v2/data/local/migrations/ams-control-graph-reconciliation-20260721T001324Z.json`
  and its paired snapshot; rollback database:
  `../agent-management-system-v2/data/local/backups/ams-v2-before-control-graph-reconciliation-20260721T001324Z.sqlite`.

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

The first read-through increment is complete at independent commit `bd464f7`,
with live default-authority launch hardening through commit `2560a84`, bounded
Task creation through commit `9d0d3ad`, guarded Goal pause/resume through
commit `2089a81`, active-ancestor next-work filtering through commit `30af0da`,
and first real cross-project selection through commit `1cb1f37`.
It provides desktop and 390px orientation, attention, simultaneous running
work, ready-next work, workstream/goal/task detail, continuation, evidence,
selected context, activity, active-Goal creation of authoritative ready Tasks,
and revision-checked Goal pause/resume. Pause rejects running Runs in the whole
descendant branch, suppresses descendant next work and direct Run launch, and
requires active ancestors before resume. The same rolling Task remains active
for the next increment: real authorized dispatch and result handling through
application commands rather than route SQL or generic CRUD.

The ignored generated directory has been checksum-copied into the independent
repository's local migration archive. Both copies remain noncanonical migration
evidence rather than writable runtime state.

## Current Active AMS v2 Child Goals

### Run real cross-project work through AMS v2

- Goal: `goal_ams_v2_real_cross_project_work_loop`
- Status: active
- Purpose: prove AMS v2 can select, prepare, execute, review, and close useful
  work from non-AMS projects.
- Completed selection task: `task_ams_v2_select_first_real_cross_project_work`
- First completed real-work task:
  `task_ffde1c0b-3f41-4bf0-9e89-3f7672ffd527`
- Accepted external-project commit: `f8889759` in Kwipoo
- Ready evidence-derived follow-up:
  `task_kwipoo_restore_place_destinations_after_route_transition_20260721`

This is the main proof that AMS is not becoming a self-contained planning
exercise. The completed Kwipoo Task added bounded analytics to two real move
workflows, closed its Run, accepted its Artifact, and preserved a discovered
Place-destination state defect as separate actionable work.

### Provide model-independent explicit task context

- Goal: `goal_ams_v2_hybrid_explicit_knowledge_intelligence_architecture`
- Status: active
- Purpose: reduce generic-model reversion and meaning reconstruction failure by
  giving delegated agents explicit current state, statement roles, procedures,
  selected sources, validation criteria, and other task-relevant context.
- Current task: `task_ams_v2_test_statement_roles_in_real_work_selection`

The source Goal ID was retained for traceability, but its title and boundary
were narrowed during reconciliation. This AMS Goal owns provider-independent
task context; it does not duplicate the separate Owned AI project's broader
hybrid-intelligence architecture. It should use real work as evidence and must
not create new entities, schema, routing automation, or Superstructure-heavy
prompt expansion without an exercised operational gap.

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

### GUI capability merged into the clean independent foundation

No separate GUI Goal was imported. The desired operator capability is owned by
`goal_ams_v2_clean_independent_foundation` through
`task_ams_v2_build_clean_operator_ui_slice`. This avoids preserving a duplicate
Goal while retaining the requirement that the independent GUI become the normal
desktop/mobile surface for understanding and steering multiple workstreams.
The prototype GUI remains design evidence only.

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

- The independent v2 operator UI can create bounded ready Tasks, but Goal
  pause/resume and run dispatch/result handling still require the CLI until
  guarded web commands are implemented.
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
- Kwipoo's unrelated dirty dependency refresh currently causes seven server
  test suites to fail while importing `sveltekit-superforms` against TypeBox;
  the move-flow Task did not alter or stage that lockfile. Recovery is tracked
  by `task_kwipoo_reconcile_dependency_refresh_and_restore_server_tests_20260721`.

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

Use the independent live AMS readbacks, not chat memory or the transition
database:

```sh
cd ../agent-management-system-v2
npm run ams -- health --db data/local/ams-v2.sqlite
npm run ams -- next-work --db data/local/ams-v2.sqlite
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
   - Read-through operator views, live launch hardening, bounded ready-Task
     creation, and guarded Goal pause/resume are complete through independent
     commit `2089a81`.
   - Next: implement authorized dispatch from a ready Task using the guarded
     work-packet contract, including an explicit handoff state when the current
     process cannot launch the executor. Close the Task only after browser proof
     against the full acceptance criteria.

Then:

5. `task_ams_v2_validate_real_work_and_project_cutover`
   - Run real projects, compare against the prototype, and migrate authority one
     project at a time.
   - Selective data cutover is complete for Animal Welfare and the 16 remaining
     real project containers. The independent authority passes SQLite integrity
     and foreign-key checks and exposes the migrated work in the operator UI.
   - AMS control-graph reconciliation is complete. The long-term Goal and its
     still-actionable clean-foundation, external-AI, model-independent-context,
     and real-cross-project children now live in the independent authority.
   - The first real imported-project Task is complete: Kwipoo move-flow
     instrumentation was committed at `f8889759`, its Run was closed, and its
     evidence Artifact was accepted. A Place-destination route-transition
     defect found during validation is preserved as ready follow-up work.
   - Next: complete the operator-UI dependency, then execute and close fresh
     work in a second materially different imported project and record the
     comparison. Do not revive the transition project's administrative history.

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
