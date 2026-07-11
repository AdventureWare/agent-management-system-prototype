# V2 Schema Contract v0.1

Date: 2026-07-02
Status: Draft contract for test-only mapper validation

## Purpose

This document defines the current v2 draft-record contract implied by the AMS seed-slice mapper. It is not a database migration and does not authorize active v2 runtime state. Its purpose is to make the next schema decision explicit before implementation.

Current implementation references:

- Fixture: `src/lib/server/fixtures/v2-ams-useful-prototype-slice.json`
- Mapper: `src/lib/server/v2-import-mapper.ts`
- Mapper tests: `src/lib/server/v2-import-mapper.spec.ts`
- Fixture tests: `src/lib/server/v2-seed-slice-fixture.spec.ts`

## Current Seed Coverage

The AMS seed slice maps to:

- 1 `ProjectDraft`
- 1 `GoalDraft`
- 34 `TaskDraft`
- 10 `TaskDependencyDraft`
- 33 `WorkSessionCandidateDraft`
- 37 `RunDraft`
- 51 `ReviewDraft`
- 8 `ApprovalDraft`
- 86 `DecisionDraft`
- 38 `ArtifactCandidateDraft`

## Common Contract

Every imported draft record must preserve a v1 source reference:

```ts
{
  system: 'ams-v1',
  collection: string,
  id: string
}
```

The v2 importer should never discard v1 IDs during preview/import. If a future v2 table uses new IDs, it should still store source IDs in an import/source-reference table.

## Draft Records

Tool and tool execution records are not part of the current v1 seed import contract. The minimal `Tool` concept is accepted by `docs/model-decisions/2026-07-03-accept-minimal-tool-concept.md`; the minimal `ToolExecution` concept is accepted by `docs/model-decisions/2026-07-03-accept-minimal-tool-execution-concept.md`.

Current preview implementation uses `v2_preview_tools` and `v2_preview_tool_executions`. These tables remain preview storage and do not authorize production schema, migration, or tool-launching behavior.

Evaluation scenario and result records are not part of the current v1 seed import contract. The minimal `EvaluationScenario` concept is accepted by `docs/model-decisions/2026-07-03-accept-minimal-evaluation-scenario-concept.md`; the minimal `EvaluationResult` concept is accepted by `docs/model-decisions/2026-07-03-accept-minimal-evaluation-result-concept.md`.

The initial v2 draft used `EvaluationRun`; current docs and preview implementation should use `EvaluationResult` to avoid confusing evaluation evidence with task `Run`.

Current preview implementation uses `v2_preview_evaluation_scenarios` and `v2_preview_evaluation_results`. These tables remain preview storage and do not authorize production schema, migration, benchmark execution, global score normalization, or automatic routing behavior.

Routing decision records are not part of the current v1 seed import contract. They are experimental preview records governed by `docs/model-change-proposals/0003-preview-routing-decision.md` and `docs/model-decisions/2026-07-03-do-not-accept-standalone-routing-decision-concept.md`.

Current preview implementation uses `v2_preview_routing_decisions` to avoid treating routing rationale as accepted production schema, a second durable decision log, or automatic routing policy prematurely.

Dependency reduction records are not part of the current v1 seed import contract. They are experimental preview records governed by `docs/model-change-proposals/0004-preview-dependency-reduction-record.md` and `docs/model-decisions/2026-07-03-keep-dependency-reduction-record-experimental.md`.

Current preview implementation uses `v2_preview_dependency_reduction_records` to avoid treating external-AI replacement status as accepted production schema, automatic routing policy, provider retirement behavior, or proof of locally reliable capability prematurely.

Memory item records are not part of the current v1 seed import contract. The minimal `MemoryItem` concept is accepted by `docs/model-decisions/2026-07-03-accept-minimal-memory-item-concept.md`.

Current preview implementation uses `v2_preview_memory_items`. This table remains preview storage and does not authorize production schema, migration, automatic memory extraction, automatic memory publication, final retrieval ranking, expiration policy, or skill promotion.

Registry entry and source-label mapping records are not part of the current v1 seed import contract. The minimal `Capability`, `Tool`, and `Model` concepts are accepted, but production registry schema and migrations remain unaccepted.

Current preview implementation uses `v2_preview_registry_entries` and `v2_preview_source_labels` through `src/lib/server/v2-preview-registry-service.ts`. These tables remain preview storage for proving raw-label preservation, source-label mapping states, and registry-link validation. They do not authorize production registry migration, automatic routing, model-catalog sync, tool launching, provider retirement, or rewriting task/run/evaluation/routing records to foreign keys.

Preview-created review and approval records are governed by `docs/model-change-proposals/0006-preview-review-approval-recording.md`.

The preview implementation writes these records into existing `v2_reviews` and `v2_approvals` proof tables because `Review` and `Approval` are already accepted concepts. Preview writes preserve `ams-v2-preview` provenance and do not complete tasks, publish memory, enforce routing, or apply changes automatically.

Preview-created task status transitions reuse the accepted `Task.status` lifecycle and existing `Decision` evidence table. The preview implementation updates `v2_tasks.status` and records a `v2_decisions` row with `decision_type = 'preview_task_status_transition'` plus `ams-v2-preview` provenance. This does not add new task statuses, create a transition-log entity, auto-approve work, or authorize production runtime transitions.

The vertical report read model is not part of the schema contract. It composes existing task, work-packet, search, and provenance records for inspection and should not be treated as a new persisted entity.

### ProjectDraft

Purpose: candidate v2 `Project` row plus memory/default sources.

Required fields:

- `id`
- `source`
- `name`
- `summary`
- `rootPaths`
- `memorySources`
- `defaults`

V1 source:

- `Project`

Notes:

- `memorySources.projectBrief`, `currentStateMemo`, `decisionLog`, `constraints`, and `nonGoals` remain source material. They are not yet accepted `MemoryItem` records.
- `rootPaths` dedupes project root, artifact root, repo path, and additional writable roots.

### GoalDraft

Purpose: candidate v2 `Goal` row.

Required fields:

- `id`
- `source`
- `projectId`
- `parentGoalId`
- `title`
- `summary`
- `successCriteria`
- `status`
- `priority`
- `targetDate`

V1 source:

- `Goal`

Open decision:

- Goals can link to multiple v1 projects. The first fixture maps the goal into the selected AMS project while preserving the v1 goal source.

### TaskDraft

Purpose: candidate v2 `Task` row.

Required fields:

- `id`
- `source`
- `projectId`
- `goalId`
- `parentTaskId`
- `title`
- `summary`
- `scope`
- `nonGoals`
- `successCriteria`
- `readyCondition`
- `expectedOutcome`
- `validationPlan`
- `status`
- `priority`
- `riskLevel`
- `readinessLevel`
- `autonomyLevel`
- `reviewRequirement`
- `approvalMode`
- `candidateCapabilityNames`
- `candidateToolNames`
- `candidateSkillNames`
- `artifactSourceCount`

V1 source:

- `Task`

Open decision:

- Capability strings now refer to the accepted minimal `Capability` concept, but import still preserves them as candidate requirement names until a production capability registry schema, alias policy, and migration are accepted.
- Skill strings remain candidates until v2 model governance accepts concrete tables and lifecycles.
- Tool strings now refer to the accepted minimal `Tool` concept, but import still preserves them as candidate requirement names until a production tool registry schema and migration are accepted.

Registry planning: `docs/v2_registry_schema_boundary_and_source_label_migration_plan_v0_1.md` defines the future source-label mapping boundary for accepted `Capability`, `Tool`, and `Model` concepts. This contract still validates draft/import shape only; it does not create registry tables.

### TaskDependencyDraft

Purpose: candidate v2 task dependency edge.

Required fields:

- `id`
- `source`
- `taskId`
- `dependsOnTaskId`
- `status`
- `reason`

V1 source:

- `Task.dependencyTaskIds`

Contract:

- `status` is `resolved` only when both tasks are present in the selected import slice.
- `unresolved` dependencies must be reported, not silently dropped.

### WorkSessionCandidateDraft

Purpose: candidate v2 reusable session/context record.

Required fields:

- `id`
- `source`
- `projectId`
- `providerId`
- `externalThreadId`
- `taskIds`
- `runIds`

V1 source:

- `Task.agentThreadId`
- `Run.agentThreadId`
- `Run.threadId`

Open decision:

- v1 can contain both `agentThreadId` and `threadId`; v2 should not collapse them until the `WorkSession`/external-thread/process-event boundary is decided.

### RunDraft

Purpose: candidate v2 task-linked work attempt/evidence record.

Required fields:

- `id`
- `source`
- `taskId`
- `workSessionId`
- `providerId`
- `executionSurfaceId`
- `status`
- `startedAt`
- `endedAt`
- `inputSummary`
- `actionSummary`
- `resultSummary`
- `validationSummary`
- `blockerSummary`
- `model`
- `usage`
- `artifactPathCount`

V1 source:

- `Run`

Open decision:

- `Run.inputPrompt` is intentionally not promoted into a source-of-truth field. It may be preserved as evidence later.

### ReviewDraft

Purpose: candidate v2 review/evaluation gate record.

Required fields:

- `id`
- `source`
- `taskId`
- `runId`
- `status`
- `summary`
- `createdAt`
- `resolvedAt`

V1 source:

- `Review`

Contract:

- Reviews do not replace task status.

### ApprovalDraft

Purpose: candidate v2 permission gate record.

Required fields:

- `id`
- `source`
- `taskId`
- `runId`
- `mode`
- `status`
- `summary`
- `createdAt`
- `resolvedAt`

V1 source:

- `Approval`

Contract:

- Approvals do not replace reviews or decisions.

### DecisionDraft

Purpose: candidate v2 durable decision/rationale record.

Required fields:

- `id`
- `source`
- `taskId`
- `goalId`
- `runId`
- `reviewId`
- `approvalId`
- `decisionType`
- `summary`
- `createdAt`

V1 source:

- `Decision`

Open decision:

- v2 still needs a broader decision taxonomy for model-governance, memory, and dependency-reduction decisions.

### ArtifactCandidateDraft

Purpose: candidate v2 artifact registry row.

Required fields:

- `id`
- `source`
- `projectId`
- `taskId`
- `runId`
- `uri`
- `role`
- `title`
- `contentType`
- `sizeBytes`
- `exists`
- `sourceReferenceCount`
- `sourceReferences`

V1 source:

- `Project.projectRootFolder`
- `Project.defaultArtifactRoot`
- `Project.defaultRepoPath`
- `Goal.artifactPath`
- `Task.artifactPath`
- `Task.attachments`
- `Run.artifactPaths`

Contract:

- Artifact candidates dedupe by path/URI.
- Source references are preserved so no v1 artifact reference is lost.
- Missing paths must be represented explicitly.

## Validation Contract

The current test-only validator should assert:

1. All draft collections have expected seed counts.
2. Every draft record has a source reference.
3. Every task references an imported project and goal.
4. Every resolved dependency references imported tasks.
5. Every run references an imported task.
6. Work session candidates remain candidates and can include both v1 thread reference forms.
7. Reviews and approvals reference imported tasks and optional imported runs.
8. Decisions reference at least one imported task, goal, run, review, or approval.
9. Artifact candidates dedupe to 38 records and preserve 111 source references.
10. Capability and tool strings remain candidate/source labels until accepted registry schema and migrations exist; skill strings remain candidate strings until accepted by model governance.

Registry/source-label mapping remains out of scope for this contract and is governed by `docs/v2_registry_schema_boundary_and_source_label_migration_plan_v0_1.md`.

## Not Yet Schema

Do not create database tables from this document without a follow-up implementation decision. The next implementation can use this contract to validate mapper output and then propose a concrete SQLite schema.
