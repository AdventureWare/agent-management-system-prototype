# V2 Build Blueprint v0.1

Date: 2026-07-06
Status: Build-orientation blueprint; not an implementation commit

## Purpose

This document reconciles the v2 assessment, architecture, preview, and migration
docs into one engineering starting point.

The intended v2 direction is:

> Build a cleaner new AMS/owned-agent system in parallel, using the prototype as
> evidence and migration source, not as the architecture to keep extending.

The prototype remains useful and should be preserved, but v2 should not be a
page-by-page refactor of the prototype. V2 should start from the preserved
concepts and workflows that proved useful, with a smaller explicit core and a
schema/service boundary designed for owned-agent work.

## Source Documents

Canonical v2 direction:

- `docs/prototype_audit_v0_1.md`
- `docs/v2_rebuild_or_refactor_decision_v0_1.md`
- `docs/v2_requirements_v0_1.md`
- `docs/v2_domain_model_v0_1.md`
- `docs/v2_architecture_v0_1.md`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `docs/v1_to_v2_migration_plan_v0_1.md`
- `docs/stack_assessment/recommended_stack_v0_1.md`

Preview/proof evidence:

- `docs/v2_schema_contract_v0_1.md`
- `docs/v2_sqlite_schema_proof_v0_1.md`
- `docs/v2_persistence_boundary_v0_1.md`
- `docs/v2_preview_work_loop_smoke_v0_1.md`
- `docs/v2_preview_concept_graduation_review_v0_1.md`
- `docs/stack_assessment/autonomous_work_loop_preview_v0_readiness_review_v0_1.md`

These docs are evidence for v2. They do not authorize turning the current v1
prototype into the final v2 by incremental patching.

## Correct Alignment

### V1 Prototype

Role:

- current operating tool
- evidence corpus
- source of real workflows and historical records
- migration source
- fallback while v2 is incomplete

V1 should receive only narrow changes that support:

- preserving data
- exporting/importing evidence
- avoiding loss of current work
- critical bug fixes

V1 should not be the default target for new owned-agent architecture.

### V2 Preview

Role:

- isolated proof environment
- schema/service experiment
- import and work-loop rehearsal
- concept graduation evidence

The preview proved that a cleaner slice can support task creation, next-action
selection, run evidence, artifact/decision/review records, local search,
work-packets, vertical reports, and source provenance in a separate SQLite DB.

The preview is not the final v2 runtime. It may be reused selectively, but its
tables, services, and UI should be reviewed before becoming the v2 starting
point.

### Real V2

Role:

- clean owned-agent operating layer
- local-first runtime with explicit schema
- primary future system after it proves the minimal vertical slice

V2 should be built in parallel and become active only after it handles a real
minimal work loop better than v1.

## Product Goal

V2 should become an owned local-first AI/agent operating layer that
progressively replaces affordances currently provided by external AI providers
while preserving deliberate interoperability with external models.

V2 should manage:

- projects and goals
- sub-goals and tasks
- work sessions and runs
- artifacts
- decisions
- reviews and approvals
- governed memory
- tools and tool executions
- providers, models, and routing evidence
- local retrieval
- evaluation scenarios/results
- external-AI dependency reduction evidence

## What V2 Keeps From The Prototype

Keep these concepts because v1 evidence supports them:

- `Project`
- `Goal`
- `Task`
- task dependencies and parent/child decomposition
- `Run` as task-linked work evidence
- `Review`
- `Approval`
- `Decision`
- `Provider`
- `ExecutionSurface`
- readiness, risk, autonomy, review, and approval governance
- agent-facing CLI/API/MCP affordance pattern
- work packets generated from structured state
- human review as an explicit decision surface
- v1 data as importable source evidence

Keep these workflow lessons:

- durable work state must be the source of truth, not chat history
- agents need bounded work packets
- review and approval gates must stop automation
- results should create evidence, not silently mutate trusted memory
- source references and provenance matter
- local-first storage is the right default

## What V2 Should Not Carry Forward Blindly

Do not use these as v2 defaults:

- generic `collection/id/payload` tables as the core schema
- a page-first architecture where domain rules live in routes/components
- task fields as the dumping ground for every relationship
- string-only tool, capability, and model references as the final model
- prose-only memory and artifact references
- split run/session/thread concepts without a clear boundary
- multiple UI surfaces that separately answer "what next?"
- automatic acceptance, approval, or memory publication
- v1 UI parity as the first v2 success criterion

## V2 Starting Point

Build v2 as a local-first TypeScript/Node modular monolith with explicit SQLite
schema and local file artifacts.

The first implementation should be service/CLI-first. UI should follow only
after the domain services and storage behavior are proven.

Recommended physical boundary:

- create a clearly isolated v2 runtime area rather than extending v1 page-by-page
- keep v1 runtime state in `data/app.sqlite`
- keep v2 preview/experimental state out of `data/app.sqlite`
- use import adapters to read v1 exports or copied data

Possible physical layouts:

1. `v2/` package or app inside this repo
2. separate `packages/ams-v2-core` plus later UI adapter
3. new repo with v1 import/export tools

Recommended next decision: choose one physical layout before new runtime code is
added. The default should be an isolated `v2/` package/app in this repo unless
there is a strong reason to start a new repo.

## Proposed V2 Service Architecture

The architecture should have these layers:

1. Domain core:
   - types
   - lifecycle rules
   - invariants
   - policy checks

2. Application services:
   - `WorkService`
   - `ExecutionService`
   - `ArtifactService`
   - `GovernanceService`
   - `MemoryService`
   - `RetrievalService`
   - `ToolService`
   - `EvaluationService`
   - `RoutingService`
   - `ImportService`

3. Storage:
   - explicit SQLite tables
   - source-reference/import tables
   - SQLite FTS for first retrieval baseline
   - local files for large artifacts

4. Adapters:
   - CLI first
   - later API/MCP tools
   - later minimal web UI

Domain services should not depend on Svelte routes or page components.

## Proposed Initial Schema Boundary

The minimal v2 runtime should start with explicit tables for:

- workspaces
- projects
- goals
- tasks
- task_dependencies
- work_sessions
- runs
- artifacts
- decisions
- reviews
- approvals
- memory_items
- providers
- models
- execution_surfaces
- tools
- tool_executions
- evaluation_scenarios
- evaluation_results
- dependency_reduction_records or an explicitly experimental equivalent
- source_references
- import_batches

Open schema decisions before implementation:

- whether `DependencyReductionRecord` is production schema now or remains a
  preview/experimental record
- whether routing evidence is a structured `Decision` subtype or a separate
  `RoutingDecision`
- exact boundary between `WorkSession`, external thread, process event, and
  task `Run`
- whether `Capability` needs a first runtime table in the first slice
- how memory publication differs from memory proposal

## Minimal Vertical Slice

The first real v2 slice should prove one complete owned-agent work loop, not
full product parity.

The slice should support:

1. import or create one workspace, project, and goal
2. create or import two tasks with one dependency
3. select the next actionable task
4. generate a work packet with source-linked context
5. record one work session and one run
6. record one tool execution
7. register one artifact
8. record validation and result evidence
9. open and resolve one review or approval
10. record one decision from accepted evidence
11. propose one memory item
12. run one retrieval query with source-linked results
13. record one evaluation scenario/result
14. produce one external-AI dependency report

The slice is successful only if a future agent/operator can answer:

- what goal is being advanced
- what task is next and why
- what context was used
- what run happened
- what tool was used
- what artifact was produced
- what review/approval/decision occurred
- what memory was proposed
- what retrieval evidence was returned
- what evaluation evidence exists
- what external AI dependency was reduced or remains

## Engineering Sequence

### Step 0: Re-anchor And Freeze Scope

Outcome:

- one accepted build blueprint
- one physical-layout decision
- no more v1 feature work unless it supports v2 migration or current-state
  preservation

### Step 1: Create Isolated V2 Runtime Boundary

Outcome:

- isolated directory/package
- explicit dev/test commands
- no writes to v1 runtime data
- empty SQLite schema creation test

Acceptance:

- v2 tests can run without starting v1 app
- v2 storage refuses `data/app.sqlite`
- no v1 route/page code is required for core tests

### Step 2: Implement Core Schema And Repositories

Outcome:

- explicit SQLite tables for the minimal slice
- source-reference records
- migrations or schema initializer
- repository tests

Acceptance:

- constraints prevent orphan task/run/review records where practical
- source references preserve v1 IDs
- tests use temp DBs

### Step 3: Implement Work And Governance Services

Outcome:

- project/goal/task creation
- dependency handling
- next-action read model
- review/approval/decision records

Acceptance:

- ready, blocked, review, approval, done paths are deterministic
- no automatic acceptance
- no hidden memory mutation

### Step 4: Implement Execution, Artifact, Tool, And Memory Services

Outcome:

- work session and run records
- artifact registry
- tool registry and tool execution logs
- governed memory proposal records

Acceptance:

- artifacts are file references plus durable metadata
- tool execution is evidence, not automatic command launching
- memory begins as proposed, not trusted/published by default

### Step 5: Implement Retrieval, Evaluation, And Dependency Reporting

Outcome:

- SQLite FTS index
- source-linked retrieval results
- evaluation scenario/result records
- dependency-reduction report

Acceptance:

- retrieval explains why each result is included
- evaluation evidence can be linked to task/run/tool/model records
- dependency status is evidence-based and not provider-retirement theater

### Step 6: Import One V1 Seed Slice

Outcome:

- read-only import from v1 export/copy
- mapping report for imported/skipped/unmapped fields
- selected project/goal/task/run/review/decision/artifact records in v2

Acceptance:

- v1 state is not mutated
- source IDs are preserved
- missing artifacts and ambiguous fields are reported

### Step 7: Run One Real V2 Work Loop

Outcome:

- a small real task is completed using v2 as the operating layer

Acceptance:

- v2 handles the task from selection to reviewed result
- v2 produces a clearer readback than v1 for the same workflow
- the result is inspectable without chat history

### Step 8: Decide Next

Outcome:

- continue v2, revise v2, or pause
- explicit comparison to v1
- migration/cutover recommendation for one low-risk real goal

## Quality Gates

Every v2 implementation slice should pass:

- focused domain/service tests
- storage tests against temp SQLite
- import tests where v1 data is involved
- source-reference/provenance assertions
- no writes to v1 runtime data
- no new domain concept without model-governance review
- concise result doc or run record

Before v2 becomes active for real work, it must also pass:

- one real end-to-end work loop
- one import preview from v1
- one rollback test or clear rollback procedure
- one operator readback that answers what happened and why

## Anti-Drift Rules

- Do not treat v1 improvements as v2 progress unless they directly support v2
  export, migration, or preservation.
- Do not turn v2 preview tables into production schema without review.
- Do not chase full v1 UI parity before the minimal v2 slice is proven.
- Do not add a scheduler before the work/session/run/governance state model is
  reliable.
- Do not let "local model" become a magic success criterion; require evaluation
  evidence.
- Do not let memory become trusted automatically; require source evidence and
  lifecycle state.
- Do not create a second `Goal`, `Task`, `Run`, `Review`, `Approval`, or
  `Decision` vocabulary when the existing concept can be refined.

## Current Readiness Assessment

V2 has enough design to begin a real implementation baseline, with one important
decision still required:

- where the real v2 runtime code should physically live

The design is sufficient for Step 0 and Step 1. It is not sufficient to bulk
migrate v1 data, replace the live prototype, or start autonomous launch behavior.

## Recommended Immediate Next Task

Create a v2 implementation kickoff task:

`Establish isolated v2 runtime boundary and schema baseline`

Scope:

- choose and create the v2 physical boundary
- add the minimal schema initializer/migration harness
- add temp-SQLite storage tests
- define dev/test commands
- prove no v1 runtime data is touched

Non-goals:

- no UI
- no agent launching
- no v1 cutover
- no full data migration
- no scheduler
- no automatic memory publication

This is the right next task because it turns the existing v2 design into an
engineering baseline without continuing to patch v1 as the main path.
