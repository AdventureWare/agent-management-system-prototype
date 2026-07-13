# V2 Preview/Prototype Parity Audit

Date: 2026-07-13

## Purpose

Compare the remaining selective-port preview/prototype evidence against the
committed v2 core implementation before cleaning the untracked preview files.

This audit does not authorize deleting, moving, staging, or committing preview
source files. It decides whether any behavior must be ported first.

## Inputs Inspected

- `docs/v2_preview_leftover_cleanup_sequence_v0_1.md`
- `docs/v2_remaining_preview_stack_disposition_v0_1.md`
- `src/lib/server/v2-preview-tool-service.spec.ts`
- `src/lib/server/v2-preview-evaluation-service.spec.ts`
- `src/lib/server/v2-preview-search.spec.ts`
- `src/lib/server/v2-preview-memory-service.spec.ts`
- `src/lib/server/v2-preview-routing-service.spec.ts`
- `src/lib/server/v2-preview-dependency-reduction-service.spec.ts`
- `src/lib/server/v2-preview-registry-service.spec.ts`
- `src/lib/server/agent-work-loop-smoke.spec.ts`
- `src/lib/server/v2-core-service.ts`
- `src/lib/server/v2-core-cli-work-loop-smoke.spec.ts`
- `src/routes/app/v2-core/*`
- `src/routes/app/v2-core/tasks/[taskId]/*`

## Summary Judgment

No preview/prototype file should be ported wholesale.

No focused implementation task is required before cleanup. The accepted v2 core
behavior is already covered by committed services and tests. The remaining
preview-only gaps are either obsolete implementation mechanics, intentionally
different design choices, or ontology/model-governance questions that should
not be smuggled into cleanup.

The remaining untracked preview/prototype files can be treated as archive-only
after operator approval chooses the cleanup mode.

## Parity Matrix

| Preview/prototype evidence | Preview behavior tested | V2 core coverage | Gap? | Recommendation |
| --- | --- | --- | --- | --- |
| `v2-preview-tool-service.spec.ts` | Register tool records with provenance; record task/run-linked tool executions; reject duplicate ids/names; reject run links for the wrong task. | `registerV2CoreTool`, `recordV2CoreToolExecution`, `readV2CoreDependencyReport`; CLI smoke registers tools, records run-linked tool execution, reports tool usage, and rejects wrong-run lifecycle ownership. | No production gap. Preview duplicate-name rule is stricter than current core id-based identity, but name uniqueness is not an accepted v2 invariant. | Archive-only after cleanup approval. Do not port duplicate-name semantics without model-governance decision. |
| `v2-preview-evaluation-service.spec.ts` | Register evaluation scenarios; record task/run/tool/provider-linked results; expose context; reject duplicate ids and wrong run ownership. | `registerV2CoreEvaluationScenario`, `recordV2CoreEvaluationResult`, `readV2CoreEvaluationContext`; CLI smoke records scenarios/results with run, tool, provider, model, score, source refs, and rejects wrong-run evaluation. | No production gap. | Archive-only after cleanup approval. |
| `v2-preview-search.spec.ts` | Build a SQLite FTS preview index; require explicit index rebuild; reject empty queries; search imported and preview-created records. | `readV2CoreLocalRetrieval` searches committed v2 core records directly with source-linked results; agent-control and CLI smoke cover search without adding index tables or embeddings. | No production gap. Preview FTS rebuild behavior is intentionally not in v2 core yet. | Archive-only. Revisit FTS only when current retrieval becomes insufficient. |
| `v2-preview-memory-service.spec.ts` | Record draft/proposed/published memory; surface task/project scoped memory; link task/run/decision/evaluation/dependency sources; reject unknown statuses and wrong-task evidence links. | `promoteV2CoreMemory`, memory source tables, `readV2CoreMemoryForContext`; CLI smoke enforces approved-review gate before trusted memory and reads trusted memory in follow-up context. | No production gap for accepted behavior. Preview draft/proposed/published statuses are not accepted v2 core lifecycle states. | Archive-only. Do not port draft/proposed memory status model without ontology review. |
| `v2-preview-routing-service.spec.ts` | Record standalone routing-decision records with policy/basis/privacy/cost fields; link to task/run; reject duplicate ids and wrong-run ownership. | V2 core uses `Decision` records with `decision_type = route_selection`, plus `readV2CoreRoutingEvidence` and `readV2CoreRouteComparisonReport`; CLI smoke reports route-comparison evidence by capability. | No accepted production gap. Standalone routing entities/fields remain intentionally unaccepted. | Archive-only. Any stronger routing model requires model-governance work, not preview porting. |
| `v2-preview-dependency-reduction-service.spec.ts` | Record standalone dependency-reduction records with replacement status, evidence, next step, quality trend, and links to evaluation/routing evidence. | V2 core derives dependency-reduction reports from accepted providers, tools, evaluations, and route evidence. CLI smoke reports unknown/hybrid-candidate capability status without adding a standalone entity. | No accepted production gap. Standalone dependency-reduction records remain experimental. | Archive-only. Create a design/model task only if derived reports stop answering real decisions. |
| `v2-preview-registry-service.spec.ts` | Extract raw labels for capabilities/tools/models; create registry entries; classify labels as accepted/ambiguous/unmapped; reject accepted mappings without registry links. | V2 core has `SourceReference`, `Tool`, `ModelProvider`, evaluation records, and source-linked retrieval. It does not have accepted `Capability` or registry mapping entities. | No implementation gap. This is deferred ontology work. | Archive-only. Preserve as rationale for future source-label reconciliation if needed. |
| `agent-work-loop-smoke.spec.ts` | Prototype control-plane readback over recommendation, work packet, run-result conversion, approval gate, goal progress, workflow/thread associations. | V2 core CLI smoke covers next work, context bundle, agent work packet, provider runs, managed run lifecycle, review/acceptance gates, artifact queues, dependency report, route evidence, memory, follow-up lineage, and local retrieval. V2 core UI tests cover operator-console and task-detail readbacks. | No production gap for accepted v2 core loop. Workflow/thread association coverage belongs to v1/prototype concepts and should not be ported into v2 core cleanup. | Archive-only after cleanup approval. |

## Explicit Non-Ports

- Do not port `v2-preview-*` service names or preview table shapes.
- Do not port `data/v2-preview.sqlite` behavior.
- Do not port preview FTS as a required rebuild step.
- Do not port `draft`, `proposed`, and `published` memory statuses into v2
  core as a cleanup side effect.
- Do not port standalone routing-decision or dependency-reduction entities.
- Do not port registry/source-label mapping tables.
- Do not port prototype workflow/thread associations into the v2 core first
  slice.

## Useful Evidence To Preserve Conceptually

The preview files are still useful as historical evidence for these future
questions:

- whether retrieval needs SQLite FTS once direct in-memory/local retrieval is
  insufficient;
- whether tool names should become unique user-facing identities;
- whether memory needs a pre-trusted draft/proposed lifecycle;
- whether dependency-reduction tracking needs durable records instead of
  derived reports;
- whether source-label reconciliation should become a governed registry
  workflow.

These are not cleanup blockers.

## Follow-Up Implementation Tasks

None.

The audit found no missing accepted v2 core behavior that needs implementation
before cleanup. Creating implementation tasks from this evidence would mostly
reintroduce preview-era bloat.

## Next Cleanup Decision

The remaining cleanup blocker is operator approval for how to dispose of the
untracked preview/prototype files.

Recommended options:

1. Delete the remaining untracked preview/prototype files after this audit is
   committed.
2. Move the remaining untracked preview/prototype files into an ignored local
   archive directory, if preserving exact source files locally matters.
3. Leave them untracked temporarily, but treat that as a short-lived blocked
   state because the dirty tree will keep confusing future agents.

Recommended choice: delete the remaining untracked preview/prototype files
after the audit is committed. The useful evidence is now represented in
committed docs; keeping the full preview stack around increases the chance that
future agents mistake it for production v2.

## Validation

- The selective-port and governance-required preview/prototype specs were
  inspected.
- The committed v2 core services and smoke/UI tests were inspected.
- Each candidate file group has a recommendation.
- No preview/prototype files were deleted, moved, staged, or committed by this
  audit.
