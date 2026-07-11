# V2 Preview To Owned-Agent Control Loop Integration v0.1

Date: 2026-07-04
Status: Integration analysis and next-slice recommendation

## Purpose

Decide how the completed v2 preview work-loop proof should inform the real AMS owned-agent control layer.

The preview milestone proved that an isolated v2 database can support a bounded task-centered work loop:

1. seed/import state
2. create a goal-linked task
3. recommend the next action
4. record run evidence
5. transition task state
6. record review and decision evidence
7. read back work packet, vertical report, provenance, and latest records

This document compares that proof against the existing production AMS Goal/Task/Run control-plane APIs and recommends what to migrate, fold in, discard, or defer.

## Bottom Line

Do not migrate the v2 preview as a parallel production subsystem.

Use it as a reference implementation for a cleaner operator loop, then fold the useful parts into existing production AMS control-plane services:

- `Goal`
- `Task`
- `Run`
- `Review`
- `Approval`
- `Decision`
- agent goal-loop APIs
- agent work-packet APIs
- agent run-result APIs
- existing task/governance UI surfaces

The next implementation should be a production-side read-model/control-loop alignment slice, not more preview UI.

## Current Preview Capabilities

| Preview capability             | Current preview evidence                                                                                                       | Integration value                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Isolated storage boundary      | `docs/v2_persistence_boundary_v0_1.md`, `assertV2PreviewDbFileAllowed`, temp DB smoke tests                                     | Keep for experiments and migration rehearsals; do not make this production runtime storage yet.     |
| Seed/import proof              | `scripts/v1-to-v2-import-preview.mjs`, fixture mapper/validator, `load-seed`                                                    | Useful for future migration rehearsal and schema comparison.                                        |
| Task creation                  | `createV2PreviewTask`, CLI `create-task`                                                                                       | Production already has task create/update; copy validation/readback patterns, not the preview API.  |
| Next-action selector           | `readV2PreviewNextActionRecommendation`, CLI `next-action`, preview UI panel                                                    | Production has richer `goal-work-loop.ts`; preview has simpler operator-facing explanation shape.   |
| Task status transition         | `transitionV2PreviewTaskStatus`, CLI/UI transition action, transition decision provenance                                        | Production has statuses and task mutation helpers; preview's allowed-transition guard is reusable.  |
| Run evidence capture           | `recordV2PreviewRunResult`, CLI/UI `record-run`, run provenance                                                                 | Production has `agent-run-results.ts`; preview form clarifies the smallest result/validation shape. |
| Review/decision recording      | `recordV2PreviewReview`, `recordV2PreviewDecision`, CLI/UI actions                                                              | Production has review/approval/governance surfaces; preview shows compact operator workflow.        |
| Work packet                    | `readV2PreviewWorkPacket`, CLI `work-packet`, UI handoff packet                                                                 | Production has `agent-work-packets.ts`; preview provenance/counts/latest-record summary is useful.  |
| Vertical report                | `readV2PreviewVerticalSliceReport`, CLI `vertical-report`, UI counts/latest/search                                              | Production lacks one compact per-task loop-health read model; this is the strongest fold-in idea.   |
| Evidence timeline              | Preview UI timeline over runs, reviews, approvals, decisions, artifacts, tools, evals, routing, dependency, memory              | Production task/run/governance views could benefit from a shared timeline component/read model.     |
| Automated CLI smoke            | `npm run test:v2-preview-work-loop-smoke`                                                                                       | Keep as preview regression; add analogous production control-loop regression later.                 |
| Registry/search/dependency R&D | Preview registry proof, source labels, local FTS, dependency-reduction, routing/eval/tool/memory preview records                | Defer until the core control loop integration direction is chosen.                                  |

## Current Production Control-Loop Capabilities

| Production capability              | Current implementation                                                                                                                                          | Relation to preview                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Goal-scoped classification         | `src/lib/server/goal-work-loop.ts` computes actionable, in-progress, awaiting review, accepted/done, needs revision, blocked, planning/research/clarification. | Richer than preview selector; should remain canonical for production.                                     |
| Next-action recommendation         | `goal-work-loop.ts` recommends review/approval resolution, execution, revision, planning, research, clarification, unblocking, and goal completion.             | More complete than preview; may need preview-style compact candidate/readback shape.                      |
| Agent work packets                 | `src/lib/server/agent-work-packets.ts` and `goal-work-packets.ts` expose selective packet data plus rendered prompt.                                            | Production should adopt preview's compact evidence/provenance/latest-record summary.                      |
| Run-result recording               | `src/lib/server/agent-run-results.ts` supports record result, validation, blocker, follow-up recommendations, and draft follow-up creation.                     | More capable than preview run capture; preview's simpler required fields can improve UI/workflow clarity. |
| Review request from run evidence   | `agent-run-results.ts` supports `request_review_from_run` with validate-only behavior.                                                                          | Production already has safer review flow than preview.                                                   |
| Blocked task update from run       | `agent-run-results.ts` supports `mark_task_blocked_from_run`.                                                                                                   | Production already covers a preview gap.                                                                 |
| Progress preview/apply             | `preview_progress_updates` and `apply_progress_updates` let reviewed run evidence update project/goal state.                                                    | Production is ahead of preview; keep operator-reviewed, not automatic.                                   |
| Follow-up task creation            | `create_followup_task` creates or dedupes draft follow-up tasks from run evidence.                                                                               | Production is ahead of preview; do not add this to preview unless needed for a migration rehearsal.       |
| Manifest/API/MCP surface           | `agent-capability-manifest.ts`, `/api/agent-goal-loop/*`, `/api/agent-work-packets/*`, `/api/agent-run-results/*`, plugin MCP tools.                           | Production is the target owned-agent interface; preview should not create a competing agent API.          |
| Governance surfaces                | `/app/governance`, task detail, run detail, review/approval APIs.                                                                                                | Production surfaces are broad; preview shows a tighter single-task operator loop worth emulating.         |
| Runtime storage                    | `data/app.sqlite` as runtime source of truth; JSON as seed/export/import.                                                                                       | Preview remains separate; production storage should not be replaced by preview DB without migration plan. |

## What To Migrate

Migrate as ideas/patterns, not as tables:

- Preview vertical report shape: counts, latest IDs, provenance/source counts, search status, and compact task loop state.
- Preview evidence timeline pattern: one ordered task-centered view across run/governance/artifact/tool/eval/memory evidence.
- Preview operator-loop order: next action, task contract, handoff packet, evidence, transition/review/decision readback.
- Preview allowed-transition guard pattern: explicit legal task status transitions with decision evidence and readback.
- Preview smoke style: full command-sequence regression against isolated state.

## What To Fold Into Existing Services

Fold into current production services:

- Add a production `TaskLoopReport` read model near existing goal/run/work-packet helpers.
- Reuse `goal-work-loop.ts` as the production next-action source.
- Reuse `agent-work-packets.ts` and `goal-work-packets.ts` for packet generation.
- Reuse `agent-run-results.ts` for run evidence, review requests, blockers, follow-ups, and progress proposals.
- Reuse existing task/governance APIs for mutation; do not add preview-style production routes unless a current surface cannot host the workflow.
- Add a production control-loop smoke test around manifest/CLI/API helpers after the read model exists.

## What To Keep Preview-Only

Keep these as preview-only until a future migration decision:

- `v2_*` preview tables
- `scripts/v2-preview-db.ts`
- `/app/v2-preview`
- preview import fixture and mapper
- preview registry/source-label proof tables
- preview routing/eval/dependency/memory experimental writes
- `ams-v2-preview` provenance source labels

These are still useful for experiments and migration rehearsals, but they should not become production runtime APIs by accident.

## What To Discard Or Avoid

Avoid copying these into production:

- a second production task lifecycle service separate from existing task/control-plane helpers
- a second production goal-loop selector separate from `goal-work-loop.ts`
- a second run-result API separate from `agent-run-results.ts`
- generic preview CRUD routes
- more preview UI write forms without an integration reason
- automatic acceptance of work
- direct conversion of preview schema to production schema

## Integration Gaps

| Gap                                                        | Why it matters                                                                             | Recommended handling                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Production lacks one compact per-task loop report          | Operators and agents need a single readback after run/review/decision work.                | Build a production `TaskLoopReport` read model first.                                                 |
| Production loop has richer state but more scattered UI     | Goal detail, task detail, run detail, governance, planning, and queue all show part of it. | Start with read-model/API integration before UI consolidation.                                         |
| Preview transition guard is cleaner than production status mutation | Legal state changes should be explicit and evidenced.                                      | Add a model-governed production task-transition helper only if existing task update paths are unsafe. |
| Preview provenance is clearer than production evidence source | Owned-agent trust depends on knowing what source produced each record.                      | Add source/evidence summary to production loop reports before changing storage.                        |
| Preview smoke is complete; production smoke is not equivalent | The owned-agent layer needs regression tests around real control-plane commands.            | Add production smoke after `TaskLoopReport`, not before.                                               |
| Preview follow-up task UI is absent but production run-result can create follow-ups | The production API is already ahead here.                                                   | Do not backfill this into preview; surface production follow-up capability in the loop report.         |

## Recommended Next Slice

Build a production-side read model only:

> Add `TaskLoopReport` as a read-only server helper over existing production AMS state.

Proposed scope:

- input: `taskId`
- output: task, project, goal, classification, next-action context, latest run/review/approval, counts, blockers, dependencies, follow-up IDs, work-packet pointer, suggested next commands
- source: existing `ControlPlaneData`, `goal-work-loop.ts`, `agent-work-packets.ts`, and current review/approval helpers
- no mutation
- no schema change
- no preview DB dependency
- focused tests using existing production fixtures/builders

Acceptance criteria:

- report returns task, project, and goal identifiers
- report includes goal-loop classification for the task
- report includes latest run/review/approval IDs
- report includes counts for runs, reviews, approvals, follow-up IDs, blockers, dependencies, and artifacts
- report includes suggested next command names from existing manifest resources
- report explains whether the next action should be run evidence, review, approval, follow-up planning, blocker resolution, or no action
- tests cover ready task, in-progress task with run evidence, review task, blocked task, and done task

## Why This Next

The preview milestone's strongest product lesson is not the schema. It is the shape of the operator loop:

1. What is this task?
2. What should happen next?
3. What evidence exists?
4. What gate is open?
5. What can be safely changed now?
6. What command or surface should the agent/operator use next?

Production AMS already has most of the underlying machinery. A read-only `TaskLoopReport` lets the project integrate that lesson without broad rewrites, schema churn, or another UI surface.

## Deferred

- production task-transition mutation helper
- production UI consolidation
- MCP additions for task-loop report
- Playwright workflow over production UI
- migration from preview tables to production tables
- registry/source-label production migration
- local retrieval and memory governance production integration

## Closeout Criteria For This Sub-Goal

This integration-analysis sub-goal is complete when:

- preview and production control-loop capabilities are compared
- migrate/fold/keep/discard recommendations are recorded
- the next implementation slice is narrowed to a read-only production integration step
- docs point future agents away from more preview feature expansion by default
