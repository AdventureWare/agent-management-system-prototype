# AMS v2 Clean Boundary And Execution Plan

Date: 2026-07-15
Status: Current recovery plan; implementation not started
Decision: Build AMS v2 in a new repository by selectively extracting proven behavior and data from this prototype

## 1. Outcome

AMS v2 will be a clean, independently operable goal-directed work coordination
system for one principal operator.

It will help the operator:

- maintain several real goals and workstreams;
- delegate bounded work to human, AI, and tool executors;
- see what is running, blocked, ready, or waiting for judgment;
- provide each run with sufficient authoritative context;
- preserve results and continuation state across agents and sessions;
- validate whether work advanced the goal; and
- progressively replace external-AI affordances without making any provider the
  source of truth.

AMS is not the owned AI itself. AMS owns durable goals, work state, authority,
evidence, and continuation. External and owned AI systems supply replaceable
reasoning and execution capability.

## 2. Decision

Create a new repository named `agent-management-system-v2`.

Preserve this repository as:

- the operational prototype while needed;
- the source of historical and migration data;
- a behavioral evidence corpus;
- a source of acceptance scenarios and selected implementation lessons; and
- a rollback/reference system during staged cutover.

Do not continue building the v2 product as routes under `/app/v2-core`.

This is not a clean-room rewrite and it is not an in-place refactor. It is a
selective rebuild:

1. Preserve the prototype and current v2 database unchanged.
2. Capture current behavior as fixtures and acceptance scenarios.
3. Create an enforced independent v2 boundary.
4. Port only behavior and data that has an explicit product reason.
5. Reimplement the minimum useful loop in focused modules.
6. Compare it against the same prototype workflows.
7. Migrate active work project by project after the new path proves better.

## 3. Why This Decision Follows From The Evidence

The original decision was already to build v2 in parallel and preserve the
prototype. It explicitly rejected page-by-page evolution of v1 as the primary
path. See `docs/v2_rebuild_or_refactor_decision_v0_1.md` and
`docs/v2_build_blueprint_v0_1.md`.

Implementation drifted from that decision:

- v2 storage is separate in `data/v2-core.sqlite`, which is useful and should be
  preserved;
- v2 product code is still part of the prototype package and SvelteKit process;
- `/app/v2-core` inherits the prototype sidebar, assistant launcher, routes,
  dependencies, auth, and styling;
- the prototype navigation presents v1 Projects, Goals, Tasks, Workflows, Roles,
  Providers, and `V2 core` as peers;
- `src/lib/server/v2-core-service.ts` is 8,264 lines and combines domain input
  types, SQL operations, work selection, context, retrieval, execution,
  evaluation, dependency reporting, snapshot handling, and operator read models;
- the main v2 page is 2,158 lines and has multiple overlapping answers to what
  needs attention;
- the repository contains about 494 source files and 198 documentation files,
  so keeping v2 here leaves prototype implementation and stale historical plans
  in every agent's ambient context;
- the current instructions expose competing v1 and v2 control-plane paths; and
- current work packets do not reliably include the project purpose, full goal
  criteria, relevant architectural decisions, or fresh source contents.

Storage separation alone is not a product boundary. A boundary exists only when
dependency direction, runtime authority, build, and agent context are enforced.

The existing v2 work is not worthless. The explicit v2 database, lifecycle
rules, snapshot support, work-loop queries, tests, and imported data are strong
evidence. Discarding them would create unnecessary risk. Copying the existing
application wholesale would preserve the debt. Selective extraction is the
middle path supported by the evidence.

## 4. Option Check

Scores use 1 to 5. Weights expose the assumptions; they are a decision aid, not
a claim of mathematical proof.

| Criterion | Weight | New repo | Isolated workspace here | Embedded route |
| --- | ---: | ---: | ---: | ---: |
| Enforceable product/code boundary | 25 | 5 | 4 | 1 |
| Clear context for agents | 20 | 5 | 3 | 1 |
| Reuse of proven v2 evidence | 15 | 4 | 5 | 5 |
| Migration safety and reversibility | 15 | 5 | 5 | 3 |
| Development and operations simplicity | 10 | 4 | 3 | 4 |
| Independent web/mobile path | 10 | 5 | 4 | 2 |
| Initial extraction cost | 5 | 3 | 4 | 5 |
| Weighted result | 100 | **93/100** | **80/100** | **50/100** |

An isolated workspace in this repository is an acceptable emergency staging
boundary, but it leaves prototype docs, scripts, build configuration, and domain
surfaces in the same agent context. A new repository best addresses the failure
that actually occurred.

## 5. V2 Product Goal

### Goal

Establish an independently bounded AMS v2 that can coordinate and resume real
goal-directed work from authoritative state without prototype runtime/UI
dependencies or reliance on chat history.

### Success Conditions

1. A clean checkout builds, tests, and runs while this prototype repository is
   unavailable.
2. V2 has exactly one writable runtime authority and names it in every agent
   work packet.
3. A new agent can start with only a task ID and recover the project purpose,
   goal, task contract, relevant decisions and sources, allowed actions,
   validation, and stop conditions.
4. One task can survive multiple runs and retain progress, evidence, remaining
   uncertainty, blockers, and next action.
5. Low-risk work can complete with validation evidence without mandatory review
   and decision ceremony. Configured high-risk work still gates correctly.
6. Desktop and phone-width UI support ordinary orientation, goal steering,
   dispatch, monitoring, and result handling without requiring CLI readback.
7. The system completes meaningful work for at least two different real
   projects, including at least one non-AMS project.
8. Against the same representative workflow, v2 requires less context
   restatement, fewer administrative records, and fewer operator corrections
   than the prototype.
9. V1 and existing v2 state remain recoverable and source-linked throughout
   migration.
10. Every required prototype affordance is explicitly ported, replaced, deferred,
    or rejected. No feature is inherited merely because it exists.

## 6. Foundation Domain

Persist only the concepts needed to prove the first useful loop:

- `Project`
- `Goal`, including parent-goal relation
- `Task`
- `TaskDependency`
- `Run`
- `Artifact`
- `Review`, only when the task or risk policy requires review
- `Decision`, only for a material choice or state transition rationale
- `SourceReference` or equivalent provenance relation

Start as fields or computed read models:

- executor and provider identity on a run;
- context bundle;
- next-work recommendation;
- goal progress and attention summaries;
- blocker and continuation summaries; and
- workstream, which is a view over projects/goals/tasks/runs rather than a new
  entity.

Defer from the foundation workflow:

- `AgentProfile`
- `WorkSession`
- governed `MemoryItem`
- tool and tool-execution registries
- evaluation scenario/result registries
- workflow and skill registries
- capability taxonomy
- persisted routing policy
- external-dependency reduction model
- rich event log

Existing records for deferred concepts must not be deleted. Preserve them in a
versioned import archive or staging representation until a real workflow proves
their operational model. Preservation does not imply immediate admission to the
new core.

## 7. Target Repository Boundary

Use a small TypeScript/Node workspace. Keep the first version a modular monolith,
not a distributed system.

```text
agent-management-system-v2/
  AGENTS.md
  README.md
  package.json
  apps/
    cli/
    web/
  packages/
    core/
      src/domain/
      src/application/
      src/ports/
    sqlite/
      migrations/
      src/repositories/
  docs/
    product.md
    domain.md
    architecture.md
    operations.md
    decisions/
  data/
    local/                  # ignored runtime state
    fixtures/               # small sanitized test fixtures
  tests/
    scenarios/
    migration/
```

Do not create a worker app, scheduler, plugin system, Python service, vector
database, PostgreSQL deployment, or cloud architecture in the foundation.

### Allowed Dependencies

- `apps/web` and `apps/cli` call public application services from `core`.
- `core/domain` is pure TypeScript.
- `core/application` depends on domain types and ports.
- `sqlite` implements ports owned by `core`.
- composition roots instantiate adapters and inject them into services.
- UI receives serializable view models, never database handles.
- the prototype produces a versioned export; v2 consumes that export through an
  import adapter.

### Forbidden Dependencies

- `core` importing SvelteKit, SQLite, filesystem APIs, prototype code, or UI.
- routes issuing SQL or opening a database.
- runtime reads from prototype `data/app.sqlite` or `data/control-plane.json`.
- shared writable databases or dual writes.
- imports from prototype routes, components, domain types, or services.
- symlinks to the prototype as a runtime dependency.
- copying the prototype shell, navigation, or global styles by default.
- deep imports that bypass package exports.

Enforce these rules with TypeScript project/package boundaries, restricted
imports, package export maps, and a CI test that builds v2 with the prototype
path absent.

## 8. Source Of Truth And Agent Continuity

V2 needs three source layers with different responsibilities:

1. Stable repository truth:
   `README.md`, `AGENTS.md`, product, domain, architecture, operations, and
   accepted decision records.
2. Live work truth:
   the v2 SQLite database for projects, goals, tasks, runs, evidence, and current
   state.
3. Run-local truth:
   a freshly generated, revisioned work packet for one task.

Do not manually maintain a prose document that lists current next work. It will
drift. Generate current state from the database.

### Minimum Executable Work Packet

Before an agent may launch delegated work, the system must provide:

- repository and database authority identifiers;
- project purpose, scope, non-goals, and authoritative documents;
- goal desired state and success criteria;
- task objective, scope, non-goals, acceptance criteria, and validation plan;
- requirement/candidate/example distinctions where ambiguity matters;
- relevant decisions, artifacts, and trusted context with inclusion reasons;
- required tools, permissions, executor/provider, and risk mode;
- explicitly authorized protected changes;
- Git base revision and dirty-path summary for coding work;
- packet generation time and source revisions/digests;
- stopping conditions; and
- the exact closeout operation/readback expected.

The packet becomes stale when the project, goal, task, relevant decision, source,
or Git base changes. Resumed work receives a newly generated packet. Chat history
may provide evidence but is never required to reconstruct the task.

### Protected Changes

The task must explicitly authorize changes to:

- domain entities, statuses, relations, or schema;
- repository or application boundaries;
- new top-level routes or apps;
- dependencies;
- storage or migration behavior;
- deployment, authentication, or access boundaries;
- external state; or
- destructive operations.

This is a scope check, not an approval workflow for every edit.

## 9. Proportional Governance

Routine low-risk work needs:

- a linked goal and bounded task;
- a run record;
- validation evidence; and
- a closeout that records result, unresolved risk, and next state.

Independent review or operator approval is required only when configured by
risk, ambiguity, protected-change class, or explicit acceptance policy.

Do not require an approved review plus a separate decision for every completed
task. Do not make operators manually re-enter evidence that a managed runner can
capture. Do not turn every command into an artifact.

## 10. Multi-Agent Development Model

Multiple agents are useful only when their work is independent or when separate
judgment reduces a real risk. They are not automatically better than one agent.

### Roles

| Role | Responsibility |
| --- | --- |
| Coordinator | Resolves the active goal/task, defines shared constraints, chooses parallelizable work, and integrates results. |
| Expert reviewer | Performs read-only analysis of one bounded concern and cites evidence. |
| Implementation worker | Owns one disjoint module or file set under a stable contract. |
| Verifier | Tests acceptance criteria, architecture boundaries, migration integrity, and regressions independently of the worker. |
| Operator | Makes ambiguous product/architecture choices and accepts material risk. |

### Rules

- Use independent expert reviews for architecture, domain, migration, security,
  or high-impact UI structure.
- Give every reviewer the same task contract and evidence baseline.
- Let reviewers disagree; synthesis must state the chosen option and why.
- Do not run implementation workers in parallel until interfaces and ownership
  are stable.
- Give parallel workers disjoint write sets and separate branches/worktrees.
- Use one integrator for shared interfaces.
- Do not let a worker approve its own architecture, migration, or high-risk
  change.
- Routine local changes with strong automated tests do not need an expert panel.
- Never use parallelism to hide an unresolved architectural decision.

## 11. Operator UI Information Architecture

The UI should organize around operator jobs rather than the entity inventory.

Top-level areas:

- `Work`: needs operator attention, running now, and ready next.
- `Workstreams`: projects with active goal branches and current state.
- `Tasks`: cross-project task retrieval and filtering.
- `Activity`: all active runs and recent execution history.
- `Knowledge`: accepted artifacts, material decisions, and later trusted memory.
- `System`: providers, tools, access, evaluations, diagnostics, and backup.

`Review`, `Approval`, `Governance`, `Agents`, and `Snapshots` are not primary
destinations in the first UI. Review is a work state. Executor/provider identity
appears through runs. Snapshots are an operations utility.

The first clean UI slice contains:

- `/work`: Needs you, Running now, Ready next.
- `/workstreams/[projectId]`: project and active goal branches.
- `/goals/[goalId]`: desired state, progress, current work, child goals, and
  pause/resume/block/create actions.
- `/tasks/[taskId]`: contract, selected context, runs, result, and contextual
  actions.
- `/activity`: every current run, including concurrent runs under one goal.

Mobile first-slice actions:

- orient across workstreams;
- inspect running work and failures;
- pause, resume, or block a goal;
- launch already-authorized ready work;
- inspect a result and take a bounded next action.

Complex decomposition, provider configuration, bulk curation, and manual evidence
editing can remain desktop-only until evidence shows a mobile need.

## 12. Prototype And Data Migration

### Freeze Rules

Until the clean boundary exists:

- no new product features under `/app/v2-core`;
- no broad v2 schema expansion;
- no more bulk v1 imports into operational state;
- only blocker fixes, export/backup support, migration evidence, and safety fixes
  may change the prototype's v2 code;
- the current embedded v2 UI is an experimental proof surface, not the target
  product.

### Import Boundary

```text
immutable prototype snapshot
  -> prototype export adapter
  -> versioned migration DTO/report
  -> v2 import application service
  -> fresh v2 database
```

Only the prototype exporter understands v1 implementation types. The new v2
runtime must not read the prototype database or import prototype modules.

### Migration Rules

1. Record source commit, database integrity result, counts, hashes, and export
   timestamp.
2. Export the current v2 core state and an immutable v1 source snapshot.
3. Classify capabilities and records as `port`, `rebuild`, `archive`, `defer`, or
   `reject`.
4. Quarantine unknown states and ambiguous relations. Never default an unknown
   goal to active, task to ready, run to completed, or review to approved.
5. Treat historical completion as insufficient proof that an artifact is still
   accepted or canonical.
6. Import into a disposable database first.
7. Compare counts, foreign keys, source references, artifact existence, and
   deterministic readbacks.
8. Export and restore the candidate database into another empty database.
9. Promote one project at a time and assign it exactly one writable authority.
10. Do not build bidirectional synchronization.

Before every promotion, preserve the current v2 database, deterministic export,
schema version, source commit, and migration report. Rollback restores into a
new database and preserves the failed database for diagnosis.

## 13. Verification Gates

The following tests make the plan falsifiable:

### Boundary

- v2 builds and tests while the prototype path is absent;
- forbidden-import scan finds no prototype imports;
- UI routes cannot open SQLite directly;
- domain code imports no framework, database, filesystem, or provider code; and
- read commands leave database hashes and modification counters unchanged.

### Persistence And Migration

- explicit `001_initial` migration and schema-version test;
- fresh-database and upgrade-path tests;
- deterministic snapshot export/import round trip;
- record-count, relationship, and source-reference comparison;
- ambiguous import fixtures fail or quarantine rather than silently normalize;
- backup and restore drill passes.

### Agent Continuity

- fresh agent reconstructs the task from task ID without chat history;
- stale packet is rejected after a relevant source change;
- contradictory current/canonical sources are surfaced;
- unauthorized protected changes are rejected;
- selected context includes decisive sources and excludes unrelated history; and
- the same task resumes across two runs with correct remaining work.

### Work Loop

- create goal and child goal/task;
- select next work;
- build context;
- launch and record a run;
- attach result/evidence;
- validate and optionally review according to risk;
- update task/goal state; and
- select continuation work without operator restatement.

### Operator Experience

- fixture contains at least three projects, five active goals, three simultaneous
  runs, one blocker, one failed run, and one reviewable result;
- desktop and 390px tests complete workflows rather than only checking that
  sections fit;
- running work and operator attention are separate signals;
- all simultaneous runs remain visible; and
- no screen duplicates the same next-action read model under multiple names.

## 14. Staged Work Plan

### Phase 0: Freeze And Baseline

1. Pause embedded v2 GUI expansion.
2. Export and checksum current v2 state.
3. Capture source commit, record counts, schema state, and deterministic outputs
   for overview, next work, goal triage, continuity, and representative tasks.
4. Record the required prototype capability disposition matrix.

Exit: the current system can be reproduced and compared without mutating it.

### Phase 1: Independent Foundation

1. Create the new repository and minimal workspace.
2. Add stable product/domain/architecture/operations docs and one concise
   `AGENTS.md`.
3. Implement package boundaries and forbidden-import tests.
4. Add the SQLite composition root and versioned initial migration.
5. Add CLI health, migration, export/import, and read-only probes.

Exit: the empty v2 system builds and runs independently.

### Phase 2: Minimal Work Loop

Port the accepted schema and only the application operations required for:

- project/goal/task creation and lifecycle;
- dependencies and next-work selection;
- run start/result recording;
- artifact/evidence attachment;
- proportional review and decisions; and
- continuation selection.

Compare every ported behavior with a prototype fixture or explicit revised
acceptance scenario. Do not copy the 8,264-line service as the new architecture.

Exit: the complete loop passes from CLI against an imported disposable snapshot.

### Phase 3: Agent Continuity

1. Implement revisioned work packets and the one-authority gate.
2. Add stale-context and protected-change checks.
3. Add resume-from-task-ID and zero-chat-history tests.
4. Run one real task across at least two agent runs.

Exit: a fresh agent continues correctly without reconstructing the project from
conversation.

### Phase 4: Clean Operator UI

1. Build the independent web shell and `/work` read model.
2. Add workstream, goal, task, and activity pages.
3. Add bounded goal/task creation and goal steering.
4. Add result handling that reuses managed evidence.
5. Validate desktop and phone workflows.

Exit: normal operator awareness and steering no longer require Codex or CLI.

### Phase 5: Real Work And Cutover

1. Run two materially different real projects through v2.
2. Compare supervision, corrections, context restatement, administrative records,
   and evidence quality with the prototype.
3. Migrate active projects one at a time.
4. Freeze v1 when every active project has one explicit authority and no required
   workflow is v1-only.

Exit: v2 is the operating system; the prototype is a read-only archive and
migration reference.

## 15. Parallel Work Plan

Do not parallelize Phase 0 decisions. After the Phase 1 workspace and public
interfaces exist, these lanes can run concurrently with disjoint ownership:

- Core lane: domain, application services, and lifecycle tests.
- Storage lane: migrations, repositories, snapshot import, and reconciliation.
- Agent lane: packet generation, stale checks, and resume scenarios.
- Web lane: shell and read-only pages against stable application view models.
- Verification lane: architecture rules, migration comparison, and end-to-end
  acceptance scenarios.

The web lane must not invent domain operations while the core interface is
unstable. The verifier does not edit worker-owned production modules.

## 16. Immediate Next Implementation Batch

The next batch is Phase 0 plus the smallest part of Phase 1:

1. Create an immutable v2 baseline export and manifest from the current database.
2. Capture deterministic parity fixtures and the prototype capability disposition
   matrix.
3. Create the sibling `agent-management-system-v2` repository.
4. Scaffold only `core`, `sqlite`, and `cli`, plus boundary tests and
   `001_initial` migration. Do not add the web app yet.
5. Import the baseline into a fresh database and prove count/readback parity.
6. Stop for review before refactoring behavior or building the new UI.

This batch answers the first decisive question: can the validated v2 state and
minimum work-loop behavior live independently without carrying the prototype
application into the new product?

## 17. Expert Review Record

Five independent read-only reviews were used for this plan:

- product and domain scope;
- repository and software architecture;
- agent continuity and development process;
- prototype-to-v2 migration and rollback; and
- operator UI and information architecture.

All five agreed on the main correction: preserve the validated v2 data and
behavior, freeze the embedded GUI, establish an independent v2 boundary, and
prove a smaller goal-directed loop before further expansion.

The main useful disagreement was whether an isolated workspace in this repository
would be sufficient. It is technically possible and lower cost, but a new
repository better prevents ambient prototype context and accidental product
coupling. That is why the new repository is the selected target.
