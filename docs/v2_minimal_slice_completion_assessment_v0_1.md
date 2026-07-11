# V2 Minimal Slice Completion Assessment v0.1

Date: 2026-07-10
Status: Completion assessment

## Purpose

Assess whether AMS v2 core satisfies the documented minimal vertical slice exit
criteria in `docs/v2_minimal_vertical_slice_v0_1.md`.

This is an evidence check, not a request for more feature accumulation.

## Evidence Inspected

- `npm run v2:core-db -- inspect-task --task task_v2_core_assess_minimal_slice_completion --json`
- `npm run v2:core-db -- operator-console --project project_ams_v2_core --json`
- `npm run v2:core-db -- dependency-reduction-report --project project_ams_v2_core --json`
- `docs/v2_minimal_vertical_slice_v0_1.md`
- `src/lib/server/v2-core-persistence.ts`
- `src/lib/server/v2-core-service.ts`
- `scripts/v2-core-db.ts`

## Current Live State

The live v2 core project has:

- one active project: `project_ams_v2_core`
- one active goal: `goal_ams_v2_minimal_loop`
- 20 tasks
- 19 completed tasks
- 1 ready assessment task at the time of inspection
- 19 runs
- 57 artifacts
- 19 approved reviews
- 19 trusted memory items
- 1 model provider: `provider_codex_external`
- 1 tool: `tool_v2_core_db_cli`
- 12 tool executions
- 1 evaluation scenario
- 1 evaluation result
- 1 dependency-reduction report row: `agent-work-packet` as `hybrid_candidate`
- no actionable review queue items

## Verdict

V2 core is **functionally close to minimal-slice complete**, but it is **not
strictly complete against the written minimal vertical slice**.

The implemented core now proves a real goal-directed work loop:

- select next work
- inspect task context
- build source-linked context and agent work packets
- record runs
- attach artifacts
- submit evidence for review
- approve review
- accept output
- close work
- record decisions
- promote trusted memory
- report provider/tool dependency usage
- record evaluation evidence
- report capability-level dependency reduction

The remaining gaps are small but real. They should be reconciled before calling
the minimal slice complete or starting a larger milestone.

## Exit Criteria Assessment

### What is this project/goal trying to accomplish?

Status: satisfied.

Evidence:

- `operator-console` returns `project_ams_v2_core` and
  `goal_ams_v2_minimal_loop`.
- The goal is active and has completed work history.

### What task is ready next, and why?

Status: satisfied.

Evidence:

- `next-work` and `operator-console.nextWork` surface one ready task with a
  reason.
- Task lineage is source-linked through `v2_core_source_references`.

### What context was given to the agent?

Status: satisfied for bounded first-slice context.

Evidence:

- `context-bundle` provides source-linked task/project/goal context.
- `agent-work-packet` provides bounded agent handoff context with recent
  evidence, memory, dependency summary, evaluation evidence, allowed actions,
  stopping conditions, and capped rendered prompt text.

Gap:

- There is no separate generalized retrieval command yet. Context bundles and
  agent work packets cover the current need, but the doc names a retrieval
  query explicitly.

### What session/run happened?

Status: partially satisfied.

Evidence:

- Runs are first-class records.
- Runs link to tasks and model providers.

Gap:

- `WorkSession` remains deferred. The first slice has task runs, not a
  separate session/thread entity.

Assessment:

- This is acceptable for the current implementation if the source-of-truth doc
  continues to treat `WorkSession` as deferred. It should not be quietly
  counted as implemented.

### What tools were used?

Status: satisfied.

Evidence:

- `v2_core_tools` and `v2_core_tool_executions` exist.
- Dependency reports and task detail expose tool execution evidence.

### What artifacts were produced?

Status: satisfied.

Evidence:

- Artifacts are first-class records.
- Artifacts link to tasks/runs and are reviewed/accepted.

### What review/approval/decision resulted?

Status: mostly satisfied.

Evidence:

- Reviews are first-class records.
- Accept decisions are first-class records.
- Done transitions require approved review and acceptance decision.

Gap:

- `Approval` remains deferred. The system currently uses review plus
  `accept_task_output` decisions as the closure gate.

Assessment:

- This is a reasonable simplification, but the minimal slice doc should either
  accept review/decision as the first-slice approval substitute or require a
  small approval record later.

### What memory was proposed or published?

Status: satisfied for published trusted memory.

Evidence:

- Trusted memory items are promoted from approved review sources.

Gap:

- The current implemented path is `promote-memory`, not a distinct
  `memory proposal` lifecycle.

Assessment:

- This is sufficient for first-slice durable state, but not a full memory
  proposal/review workflow.

### What relevant context is retrieved for follow-up?

Status: partially satisfied.

Evidence:

- Context bundles and agent work packets retrieve bounded source-linked context
  for a task.
- Trusted memory and recent evidence are included with source links.

Gap:

- There is no standalone `retrieve` CLI command or general search/retrieval
  abstraction yet.

Assessment:

- Do not build broad retrieval yet. The narrow gap is to decide whether
  `context-bundle` counts as first-slice retrieval or to add a tiny
  source-linked `retrieve-context` alias/read model.

### What evaluation evidence exists?

Status: satisfied.

Evidence:

- `EvaluationScenario` and `EvaluationResult` exist in v2 core.
- The live project has one scenario and one result for `agent-work-packet`.
- Evaluation records are included in snapshots and read models.

### Which external AI dependency was reduced or remains?

Status: satisfied for first-slice reporting.

Evidence:

- `dependency-reduction-report` returns `agent-work-packet` as
  `hybrid_candidate`.
- The report links external provider, local tool, task, scenario, and result
  evidence.

Boundary:

- This is a report, not a retirement workflow or routing policy.

## Required Record Assessment

Implemented or functionally represented:

- `projects`
- `goals`
- `tasks`
- `runs`
- `artifacts`
- `decisions`
- `reviews`
- `memory_items`
- `providers`
- `tools`
- `tool_executions`
- `evaluation_scenarios`
- `evaluation_results`
- source references
- computed dependency reports
- computed dependency-reduction reports
- computed context bundles
- computed agent work packets

Exists but not yet evidenced:

- `task_dependencies`: table exists, but live count is `0` and there is no
  CLI/service operation proving dependency creation/use.

Deferred or substituted:

- `workspaces`: represented by project/workspace root, not a separate first
  slice entity.
- `work_sessions`: deferred; runs carry the concrete execution evidence.
- `approvals`: deferred/substituted by approved review plus
  `accept_task_output` decision.
- `models`: represented by provider and result-level model labels, not a
  separate model registry.
- `execution_surfaces`: deferred.
- `dependency_reduction_records`: implemented as a computed report, not a
  persisted entity.

Not needed for strict first-slice proof if documented as deferred:

- broad routing policy
- local model execution
- capability registry
- benchmark runner
- dashboard

## Remaining Gaps

1. Task dependency proof.
   The schema has `v2_core_task_dependencies`, but there is no live dependency
   row and no narrow CLI/service operation proving a dependent task can be
   represented.

2. Retrieval wording.
   The implemented behavior is source-linked context retrieval through
   `context-bundle` and `agent-work-packet`. The minimal slice doc still says
   `v2 retrieve --task <id>`, which could imply a broader retrieval/search
   feature.

3. Session and approval terminology.
   The implementation uses `Run`, `Review`, and `Decision`. The doc still names
   `WorkSession` and `Approval`. This is an ontology/documentation mismatch,
   not necessarily a product gap.

4. Import/migration evidence.
   Snapshot export/import is proven for v2 core. Earlier import-preview work
   exists elsewhere in the repo, but the live v2 core loop is primarily
   newly-created state rather than a promoted imported v1 slice.

## Recommendation

Do not start a large new milestone yet.

The next step should be a small **Minimal Slice Gap Reconciliation** task.

That task should not add broad architecture. It should either:

- prove the missing criteria with the smallest possible service/CLI operations,
  or
- update the minimal-slice/source-of-truth docs to mark deferred/substituted
  items explicitly.

## Proposed Next Task

`task_v2_core_reconcile_minimal_slice_exit_gaps`

Scope:

- add or prove one task dependency row through a narrow service/CLI operation
- decide whether `context-bundle` is the first-slice retrieval query or add a
  tiny source-linked retrieval alias
- update the minimal slice doc or source-of-truth to explicitly mark
  `WorkSession`, `Approval`, model registry, execution surfaces, and persisted
  dependency-reduction records as deferred/substituted for v2 core
- avoid routing, dashboards, broad retrieval, local models, scheduling, or new
  governance surfaces

## Completion Bar After Gap Reconciliation

After gap reconciliation, it should be fair to call the first v2 core minimal
slice complete and move to a second milestone.

Candidate second milestones should be chosen only after the gap reconciliation
task is done.
